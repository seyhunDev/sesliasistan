"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { DARK, DARK_ATTR, OSM, loadLeaflet } from "@/lib/leaflet";
import { LEGEND, colorOf, dayMax, daysOf, fieldOf, frameAt, fresh, gridOf, mapUrl, nowIndex, placeId, rgbOf, sampleField, shapeMap } from "@/lib/windMap";
import { PLACE, compareLinks, getPlace, placeLabel, samePlace, setPlace, windName } from "./weather";
import { WindArrow } from "./parts";
import { useAuth } from "@/features/auth/AuthProvider";

// Rüzgâr haritası: koyu harita, üstünde şiddete göre renk geçişi ve rüzgârla akan çizgiler (Windy gibi).
// Veri Open-Meteo'dan tek istekte (6×6 nokta, 3 gün), cihazda 30 dk saklanır; Firestore'a dokunmaz.
const KEY = "sa-wind-map";
const YMD = new Intl.DateTimeFormat("en-CA", { timeZone: PLACE.tz });
const HOUR = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: PLACE.tz });
const WD = new Intl.DateTimeFormat("tr-TR", { weekday: "long" });
const nowStr = () => {
  const d = new Date();
  return `${YMD.format(d)}T${HOUR.format(d)}`;
};
const dayLabel = (date, today) => {
  const t = new Date(`${today}T12:00:00`);
  const d = new Date(`${date}T12:00:00`);
  const diff = Math.round((d - t) / 864e5);
  return diff === 0 ? "Bugün" : diff === 1 ? "Yarın" : WD.format(d);
};

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

async function loadMap(p, force) {
  const c = readCache();
  if (!force && fresh(c, p)) return c;
  const pts = gridOf(p);
  const res = await fetch(mapUrl(pts, PLACE.tz), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Rüzgâr alınamadı (${res.status})`);
  const data = { ...shapeMap(await res.json(), pts), place: placeId(p) };
  if (!data.times.length) throw new Error("Rüzgâr verisi boş");
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
  return data;
}

const GLASS = "bg-[rgba(17,24,32,.72)] text-white backdrop-blur-md";
const CELL = 6; // renk ve akış ızgarası (px)
const SPEED = 0.07; // knot başına kare başı px

function fitCanvas(cv, w, h, dpr) {
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
  }
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function WindLeaflet({ data, frame, place, children }) {
  const box = useRef(null);
  const fieldCv = useRef(null);
  const flowCv = useRef(null);
  const topCv = useRef(null);
  const map = useRef(null);
  const grid = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    let live = true;
    loadLeaflet()
      .then((L) => {
        if (!live || !box.current) return;
        const m = L.map(box.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, tap: false });
        const dark = L.tileLayer(DARK, { maxZoom: 14 }).addTo(m);
        // Koyu zemin açılmazsa (servis kapalı ya da anahtar isterse) OpenStreetMap'e geç, koyulaştırılmış
        let ok = 0;
        let bad = 0;
        dark.on("tileload", () => ok++);
        dark.on("tileerror", () => {
          if (++bad < 3 || ok || !map.current) return;
          m.removeLayer(dark);
          L.tileLayer(OSM, { maxZoom: 14, className: "wind-osm" }).addTo(m);
        });
        map.current = m;
        setReady(true);
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Görünüm: ızgaranın tamamı (konum değişince)
  const spotsKey = data.spots.map((s) => `${s.lat},${s.lon}`).join();
  useEffect(() => {
    const m = map.current;
    if (!m || !data.spots.length) return;
    const lats = data.spots.map((s) => s.lat);
    const lons = data.spots.map((s) => s.lon);
    m.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [10, 10] });
  }, [spotsKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Renk geçişi, knot sayıları ve akış ızgarası (saat değişince, harita kayınca)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const f = fieldOf(frame);
    const draw = () => {
      const { x: w, y: h } = m.getSize();
      if (!w || !h || !fieldCv.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cols = Math.ceil(w / CELL);
      const rows = Math.ceil(h / CELL);
      const u = new Float32Array(cols * rows);
      const v = new Float32Array(cols * rows);
      const ok = new Uint8Array(cols * rows);
      const img = new ImageData(cols, rows);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const ll = m.containerPointToLatLng([x * CELL + CELL / 2, y * CELL + CELL / 2]);
          const s = sampleField(f, ll.lat, ll.lng);
          if (!s) continue;
          const k = y * cols + x;
          u[k] = s.u;
          v[k] = s.v;
          ok[k] = 1;
          const [r, g, b] = rgbOf(s.kn);
          img.data.set([r, g, b, 150], k * 4);
        }
      grid.current = { w, h, cols, rows, u, v, ok, dpr };

      const small = document.createElement("canvas");
      small.width = cols;
      small.height = rows;
      small.getContext("2d").putImageData(img, 0, 0);
      const fc = fitCanvas(fieldCv.current, w, h, dpr);
      fc.clearRect(0, 0, w, h);
      fc.imageSmoothingEnabled = true;
      fc.drawImage(small, 0, 0, cols * CELL, rows * CELL);

      const fl = fitCanvas(flowCv.current, w, h, dpr);
      fl.clearRect(0, 0, w, h);

      const tc = fitCanvas(topCv.current, w, h, dpr);
      tc.clearRect(0, 0, w, h);
      tc.font = "700 11px system-ui, sans-serif";
      tc.textAlign = "center";
      tc.textBaseline = "middle";
      tc.lineWidth = 3;
      tc.strokeStyle = "rgba(0,0,0,.55)";
      tc.fillStyle = "#fff";
      for (const x of frame) {
        const p = m.latLngToContainerPoint([x.lat, x.lon]);
        tc.strokeText(String(x.kn), p.x, p.y);
        tc.fillText(String(x.kn), p.x, p.y);
      }
      const p = m.latLngToContainerPoint([place.lat, place.lon]);
      tc.beginPath();
      tc.arc(p.x, p.y + 12, 4.5, 0, Math.PI * 2);
      tc.fillStyle = "#3ddc97";
      tc.fill();
      tc.lineWidth = 2;
      tc.strokeStyle = "#fff";
      tc.stroke();
      setMoving(false);
    };
    const start = () => {
      grid.current = null;
      setMoving(true);
    };
    draw();
    m.on("movestart zoomstart", start);
    m.on("moveend zoomend resize", draw);
    return () => {
      m.off("movestart zoomstart", start);
      m.off("moveend zoomend resize", draw);
    };
  }, [frame, ready, place.lat, place.lon]);

  // Rüzgârla akan çizgiler (hareketi azalt açıksa yok)
  useEffect(() => {
    if (!ready || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let parts = [];
    const spawn = (G) => ({ x: Math.random() * G.w, y: Math.random() * G.h, age: Math.floor(Math.random() * 80) });
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const G = grid.current;
      const cv = flowCv.current;
      if (!G || !cv) return;
      const ctx = cv.getContext("2d");
      const want = Math.min(900, Math.round((G.w * G.h) / 450));
      if (parts.length !== want) parts = Array.from({ length: want }, () => spawn(G));
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "rgba(0,0,0,.9)";
      ctx.fillRect(0, 0, G.w, G.h);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < parts.length; i++) {
        const q = parts[i];
        const cx = Math.floor(q.x / CELL);
        const cy = Math.floor(q.y / CELL);
        const k = cy * G.cols + cx;
        if (q.age++ > 90 || cx < 0 || cy < 0 || cx >= G.cols || cy >= G.rows || !G.ok[k]) {
          parts[i] = spawn(G);
          parts[i].age = 0;
          continue;
        }
        const nx = q.x + G.u[k] * SPEED;
        const ny = q.y - G.v[k] * SPEED;
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(nx, ny);
        q.x = nx;
        q.y = ny;
      }
      ctx.stroke();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  const zoom = (d) => map.current?.[d > 0 ? "zoomIn" : "zoomOut"]();

  return (
    <div className="relative isolate h-[46vh] max-h-[26rem] min-h-[17rem] w-full overflow-hidden rounded-[1.375rem] bg-[#1b2128]">
      <div ref={box} className="absolute inset-0 isolate z-0" />
      <canvas ref={fieldCv} className={`pointer-events-none absolute left-0 top-0 z-10 transition-opacity ${moving ? "opacity-0" : ""}`} />
      <canvas ref={flowCv} className="pointer-events-none absolute left-0 top-0 z-20" />
      <canvas ref={topCv} className={`pointer-events-none absolute left-0 top-0 z-30 ${moving ? "opacity-0" : ""}`} />
      {err && <div className="absolute inset-0 z-40 grid place-items-center px-6 text-center text-[0.8125rem] text-white/70">Harita yüklenemedi</div>}
      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <div className="pointer-events-auto absolute right-3 top-3 flex flex-col gap-2">
          <div className={`flex flex-col overflow-hidden rounded-full ${GLASS}`}>
            <button type="button" onClick={() => zoom(1)} aria-label="Yakınlaştır" className="grid size-9 place-items-center text-[1.125rem] font-semibold">
              +
            </button>
            <span className="mx-2 h-px bg-white/15" />
            <button type="button" onClick={() => zoom(-1)} aria-label="Uzaklaştır" className="grid size-9 place-items-center text-[1.125rem] font-semibold">
              −
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// Seçili günün saatleri (konumdaki noktada): çubuk boyu rüzgâr, rengi şiddet; dokununca o saat seçilir
function HourBars({ spot, from, to, sel, onSel, nowI }) {
  const idx = [];
  for (let i = from; i < to; i++) idx.push(i);
  const top = Math.max(15, ...idx.map((i) => spot.g[i] ?? 0));
  return (
    <div className="flex h-20 items-end gap-[2px]" role="group" aria-label="Saatlik rüzgâr">
      {idx.map((i) => {
        const kn = spot.w[i] ?? 0;
        const on = i === sel;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSel(i)}
            aria-label={`${String(i - from).padStart(2, "0")}:00, ${kn} knot`}
            aria-pressed={on}
            className="relative flex h-full flex-1 flex-col justify-end"
          >
            <span className="block w-full rounded-t-[3px]" style={{ height: `${Math.max(4, (kn / top) * 100)}%`, background: colorOf(kn), opacity: on ? 1 : 0.45 }} />
            {i === nowI && <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-acc" />}
          </button>
        );
      })}
    </div>
  );
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="ml-0.5 size-[1.125rem]" aria-hidden>
    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
  </svg>
);

export function WindMapView() {
  // Konum profilde de saklanır (başka cihazda seçildiyse burada da uygulanır; useWeather ile aynı)
  const saved = useAuth().profile?.weatherPlace;
  useEffect(() => {
    if (saved?.lat != null && !samePlace(saved, getPlace())) setPlace(saved);
  }, [saved]);
  const [place, setPlaceState] = useState(PLACE);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(null);
  const [play, setPlay] = useState(false);
  const [info, setInfo] = useState(false);

  const refresh = useCallback(async (force) => {
    const p = getPlace();
    setPlaceState(p);
    setBusy(true);
    try {
      const d = await loadMap(p, force);
      setData(d);
      setErr(false);
      setSel((s) => (s == null || s >= d.times.length ? nowIndex(d.times, nowStr()) : s));
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const run = () => alive && refresh(false);
    run();
    const onVis = () => document.visibilityState === "visible" && run();
    const onPlace = () => {
      setData(null);
      setSel(null);
      if (alive) refresh(true);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("sa-place", onPlace);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("sa-place", onPlace);
    };
  }, [refresh]);

  // Oynat: saat saat ilerler, sonda başa döner
  useEffect(() => {
    if (!play || !data) return;
    const t = setInterval(() => setSel((s) => ((s ?? 0) + 1) % data.times.length), 700);
    return () => clearInterval(t);
  }, [play, data]);

  const frame = useMemo(() => (data && sel != null ? frameAt(data, sel) : []), [data, sel]);
  if (!data) {
    return err ? (
      <button type="button" onClick={() => refresh(true)} className="mt-3 w-full rounded-2xl bg-card px-4 py-6 text-center text-[0.875rem] text-mut shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        Rüzgâr alınamadı · tekrar dene
      </button>
    ) : (
      <Loading className="py-16" />
    );
  }

  const today = nowStr().slice(0, 10);
  const nowI = nowIndex(data.times, nowStr());
  const days = daysOf(data.times);
  const t = data.times[sel] || data.times[0];
  const day = days.findLast((d) => d.from <= sel) || days[0];
  const dayEnd = days[days.indexOf(day) + 1]?.from ?? data.times.length;
  // Konuma en yakın nokta
  const spot = data.spots.reduce((a, b) => ((b.lat - place.lat) ** 2 + (b.lon - place.lon) ** 2 < (a.lat - place.lat) ** 2 + (a.lon - place.lon) ** 2 ? b : a));
  const here = spot.w[sel] != null ? { kn: spot.w[sel], gust: spot.g[sel] ?? spot.w[sel], dir: spot.d[sel] } : null;
  const links = compareLinks(place);
  const grad = `linear-gradient(90deg, ${LEGEND.map((l, i) => `${l.color} ${(i / (LEGEND.length - 1)) * 100}%`).join(", ")})`;

  return (
    <div className="mt-2 space-y-3">
      <WindLeaflet data={data} frame={frame} place={place}>
        {/* Konumdaki rüzgâr */}
        {here && (
          <div className={`absolute left-3 top-3 flex items-center gap-2 rounded-full py-1.5 pl-3 pr-3.5 ${GLASS}`}>
            <b className="text-[1.375rem] font-bold leading-none tabular-nums" style={{ color: colorOf(here.kn) }}>
              {here.kn}
            </b>
            <span className="text-[0.6875rem] font-semibold text-white/60">kn</span>
            <WindArrow deg={here.dir} className="size-4" />
            <span className="text-[0.8125rem] leading-tight">
              <b className="font-semibold">{windName(here.dir)[0]}</b>
              <span className="block text-[0.6875rem] text-white/60">sağanak {here.gust}</span>
            </span>
          </div>
        )}

        {/* Bilgi */}
        <button
          type="button"
          onClick={() => setInfo((v) => !v)}
          aria-label="Bilgi"
          aria-expanded={info}
          className={`pointer-events-auto absolute right-3 top-[6.25rem] grid size-9 place-items-center rounded-full text-[0.9375rem] font-bold italic ${GLASS}`}
        >
          i
        </button>
        {info && (
          <div className={`pointer-events-auto absolute right-14 top-3 w-[min(15rem,calc(100%-5rem))] rounded-2xl p-3 text-[0.75rem] ${GLASS}`}>
            <b className="block text-[0.8125rem] font-semibold">{placeLabel(place)}</b>
            <p className="mt-1 text-white/60">Rüzgâr Open-Meteo · {DARK_ATTR}</p>
            <div className="mt-2.5 flex gap-1.5">
              <a href={links.windy} target="_blank" rel="noreferrer" className="flex h-8 flex-1 items-center justify-center gap-1 rounded-full bg-white/15 font-semibold">
                <Icon name="map" className="size-3.5" /> Windy
              </a>
              <button
                type="button"
                onClick={() => refresh(true)}
                disabled={busy}
                className="flex h-8 flex-1 items-center justify-center gap-1 rounded-full bg-white/15 font-semibold disabled:opacity-50"
              >
                <Icon name="load" className={`size-3.5 ${busy ? "animate-spin" : ""}`} /> Yenile
              </button>
            </div>
          </div>
        )}

        {/* Ölçek ve oynatma */}
        <div className="pointer-events-auto absolute inset-x-3 bottom-3">
          <div className="mb-1.5 px-1">
            <div className="h-1.5 rounded-full" style={{ background: grad }} />
            <div className="mt-0.5 flex justify-between text-[0.625rem] font-semibold text-white/80 tabular-nums [text-shadow:0_1px_2px_rgba(0,0,0,.7)]">
              {LEGEND.map((l) => (
                <span key={l.kn}>{l.kn}</span>
              ))}
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-full p-1.5 pr-3 ${GLASS}`}>
            <button
              type="button"
              onClick={() => setPlay((v) => !v)}
              aria-label={play ? "Durdur" : "Oynat"}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#111820]"
            >
              {play ? <Icon name="stop" className="size-4" /> : <PlayIcon />}
            </button>
            <button type="button" onClick={() => setSel(nowI)} className="shrink-0 text-left text-[0.75rem] leading-tight">
              <b className="block font-semibold capitalize">{dayLabel(t.slice(0, 10), today)}</b>
              <span className="tabular-nums text-white/70">{t.slice(11, 16)}</span>
            </button>
            <input
              type="range"
              min={0}
              max={data.times.length - 1}
              value={sel ?? 0}
              onChange={(e) => {
                setPlay(false);
                setSel(+e.target.value);
              }}
              aria-label="Saat"
              className="h-9 min-w-0 flex-1 accent-white"
            />
          </div>
        </div>
      </WindLeaflet>

      {/* Gün ve saat seçimi */}
      <section className="rounded-2xl bg-card p-3 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d, k) => {
            const on = d === day;
            const max = dayMax(spot, d.from, days[k + 1]?.from ?? data.times.length);
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setSel(d.date === today ? nowI : Math.min(d.from + 12, data.times.length - 1))}
                aria-pressed={on}
                className={`flex h-12 flex-col items-center justify-center rounded-xl text-[0.8125rem] font-semibold capitalize ${on ? "bg-acc text-white" : "bg-bg text-fg"}`}
              >
                {dayLabel(d.date, today)}
                {max != null && <span className={`text-[0.6875rem] font-medium tabular-nums ${on ? "text-white/80" : "text-mut"}`}>en çok {max} kn</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <HourBars spot={spot} from={day.from} to={dayEnd} sel={sel} onSel={(i) => {
              setPlay(false);
              setSel(i);
            }} nowI={nowI} />
          <div className="mt-1 flex justify-between text-[0.6875rem] text-mut tabular-nums">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </div>
      </section>
    </div>
  );
}
