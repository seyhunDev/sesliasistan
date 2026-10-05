"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { OSM, OSM_ATTR, loadLeaflet } from "@/lib/leaflet";
import { LEGEND, cellOf, colorOf, daysOf, frameAt, frameSummary, fresh, gridOf, mapUrl, nowIndex, placeId, shapeMap } from "@/lib/windMap";
import { PLACE, compareLinks, getPlace, placeLabel, samePlace, setPlace, windLevel, windName } from "./weather";
import { WindArrow } from "./parts";
import { useAuth } from "@/features/auth/AuthProvider";

// Rüzgâr haritası: konumun (varsayılan Dikili) çevresinde 6×6 noktada saat saat rüzgâr okları ve renkli alan.
// Veri Open-Meteo'dan tek istekte (3 gün), cihazda 30 dk saklanır; Firestore'a dokunmaz.
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

// Ok: rüzgârın estiği yöne bakar (meteoroloji geldiği yönü verir, +180°); altında knot
const arrow = (L, x) =>
  L.divIcon({
    className: "",
    iconSize: [34, 40],
    iconAnchor: [17, 17],
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
<svg width="26" height="26" viewBox="0 0 24 24" style="transform:rotate(${x.dir + 180}deg);filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.45))"><path d="M12 3v18M12 3l-6 7M12 3l6 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
<span style="margin-top:-1px;font:700 11px/1 system-ui;color:#fff;text-shadow:0 0 3px rgba(0,0,0,.7),0 1px 2px rgba(0,0,0,.6)">${x.kn}</span></div>`,
  });

function WindLeaflet({ data, frame, place }) {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let live = true;
    loadLeaflet()
      .then((L) => {
        if (!live || !box.current) return;
        const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false, tap: false });
        L.tileLayer(OSM, { maxZoom: 14, attribution: OSM_ATTR }).addTo(m);
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
    m.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [18, 18] });
  }, [spotsKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seçili saatin renkli alanı ve okları
  useEffect(() => {
    const m = map.current;
    const L = typeof window !== "undefined" ? window.L : null;
    if (!m || !L) return;
    layer.current?.remove();
    const g = L.layerGroup();
    for (const x of frame) L.rectangle(cellOf(x), { stroke: false, fillColor: colorOf(x.kn), fillOpacity: 0.5, interactive: false }).addTo(g);
    for (const x of frame) L.marker([x.lat, x.lon], { icon: arrow(L, x), interactive: false, keyboard: false }).addTo(g);
    L.circleMarker([place.lat, place.lon], { radius: 5, color: "#fff", weight: 2, fillColor: "#0f172a", fillOpacity: 1, interactive: false }).addTo(g);
    g.addTo(m);
    layer.current = g;
  }, [frame, ready, place.lat, place.lon]);

  if (err) return <div className="grid h-24 place-items-center rounded-2xl bg-card px-4 text-center text-[0.8125rem] text-mut">Harita yüklenemedi. Aşağıdaki saatlik rüzgâr yine güncel.</div>;
  return <div ref={box} className="isolate h-[52vh] max-h-[30rem] min-h-[18rem] w-full overflow-hidden rounded-2xl bg-line/40" />;
}

// Seçili günün saatleri (konumdaki noktada): çubuk boyu rüzgâr, rengi şiddet; dokununca o saat seçilir
function HourBars({ spot, from, to, sel, onSel, nowI }) {
  const idx = [];
  for (let i = from; i < to; i++) idx.push(i);
  const top = Math.max(15, ...idx.map((i) => spot.g[i] ?? 0));
  return (
    <div className="flex h-24 items-end gap-[2px]" role="group" aria-label="Saatlik rüzgâr">
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
            <span className="block w-full rounded-t-[3px]" style={{ height: `${Math.max(4, (kn / top) * 100)}%`, background: colorOf(kn), opacity: on ? 1 : 0.6 }} />
            {on && <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-fg" />}
            {i === nowI && !on && <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-acc" />}
          </button>
        );
      })}
    </div>
  );
}

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
  const sum = frameSummary(frame);
  const links = compareLinks(place);

  return (
    <div className="mt-2 space-y-3">
      <WindLeaflet data={data} frame={frame} place={place} />

      {/* Seçili saat: konumdaki rüzgâr ve haritanın geneli */}
      <section className="rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        <div className="flex items-baseline justify-between gap-2">
          <b className="text-[1rem] font-semibold capitalize">
            {dayLabel(t.slice(0, 10), today)} {t.slice(11, 16)}
          </b>
          {sel !== nowI && (
            <button type="button" onClick={() => setSel(nowI)} className="text-[0.8125rem] font-semibold text-acc">
              Şimdi
            </button>
          )}
        </div>
        {here && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.9375rem]">
            <span className="flex items-center gap-1 font-semibold" style={{ color: colorOf(here.kn) }}>
              <WindArrow deg={here.dir} className="size-4" />
              {windName(here.dir)[0]} ({windName(here.dir)[1]}) {here.kn} kn
            </span>
            <span className="text-mut">
              sağanak {here.gust} kn · {windLevel(here.kn).label} · {place.name}
            </span>
          </p>
        )}
        {sum && (
          <p className="mt-1 text-[0.8125rem] text-mut">
            Haritanın geneli: {sum.min}–{sum.max} kn, en sert sağanak {sum.gust} kn, çoğunlukla {windName(sum.dir)[0]}
          </p>
        )}

        {/* Gün seçimi */}
        <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d) => {
            const on = d === day;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setSel(d.date === today ? nowI : Math.min(d.from + 12, data.times.length - 1))}
                aria-pressed={on}
                className={`h-9 rounded-full text-[0.8125rem] font-semibold capitalize transition active:scale-95 ${on ? "bg-acc text-white" : "bg-bg text-fg"}`}
              >
                {dayLabel(d.date, today)}
              </button>
            );
          })}
        </div>

        {/* Saatlik çubuklar (konumda) ve kaydırıcı */}
        <div className="mt-3">
          <HourBars spot={spot} from={day.from} to={dayEnd} sel={sel} onSel={setSel} nowI={nowI} />
          <div className="mt-1 flex justify-between text-[0.6875rem] text-mut tabular-nums">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlay((v) => !v)}
            aria-label={play ? "Durdur" : "Oynat"}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-acc text-white active:scale-95"
          >
            {play ? (
              <Icon name="stop" className="size-[1.125rem]" />
            ) : (
              <svg viewBox="0 0 24 24" className="ml-0.5 size-[1.125rem]" aria-hidden>
                <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
              </svg>
            )}
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
            className="h-10 min-w-0 flex-1 accent-[var(--acc)]"
          />
        </div>
      </section>

      {/* Renk ölçeği */}
      <section className="rounded-2xl bg-card px-4 py-3 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        <div className="flex h-2.5 overflow-hidden rounded-full">
          {LEGEND.map((l) => (
            <span key={l.kn} className="flex-1" style={{ background: l.color }} />
          ))}
        </div>
        <div className="mt-1 flex text-[0.6875rem] text-mut tabular-nums">
          {LEGEND.map((l) => (
            <span key={l.kn} className="flex-1">
              {l.kn}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[0.75rem] text-mut">
          Oklar rüzgârın estiği yönü, sayılar knot’u gösterir. Kaynak Open-Meteo; ızgara aralığı yaklaşık 5 km.
        </p>
      </section>

      <div className="flex gap-2">
        <a href={links.windy} target="_blank" rel="noreferrer" className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-card text-[0.875rem] font-semibold shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-95">
          <Icon name="map" className="size-4" /> Windy’de aç
        </a>
        <button
          type="button"
          onClick={() => refresh(true)}
          disabled={busy}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-card text-[0.875rem] font-semibold shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-95 disabled:opacity-50"
        >
          <Icon name="load" className={`size-4 ${busy ? "animate-spin" : ""}`} /> Yenile
        </button>
      </div>
      <p className="px-1 text-center text-[0.75rem] text-mut">{placeLabel(place)} · konumu Ayarlar › Hava durumu konumu’ndan değiştirebilirsin</p>
    </div>
  );
}
