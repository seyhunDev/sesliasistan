"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { MAP_ATTR, MAP_STYLE, loadMapLibre } from "@/lib/maplibre";
import { denseArrows, regionSteps, regionUrl, shapeRegion, mmColor } from "@/lib/regionMap";
import { colorOf } from "@/lib/windMap";
import { km } from "@/lib/windObs";
import { PLACE, kn as knTxt, windName } from "./weather";

// Bölge haritası (Seyhun 2026-10-28 "Evet, böyle yap", örnek bolge-haritasi): Yemek'teki gibi akıcı vektör harita (MapLibre, OpenFreeMap)
// koyu "Fiord" görünümde; bulunduğun yer ortada. Üstte Rüzgâr · Yağış. Rüzgâr: ~5 km'de bir renkli oklar (renk şiddet, yön rüzgârın estiği yön)
// ve yumuşak renk alanı. Yağış: geçmiş son 2 saat radar (RainViewer, 10 dk'da bir), şimdiden sonrası saatlik tahmin (Open-Meteo mm).
// Altta zaman kaydırıcı (−2 sa · Şimdi · +12), ▶ sırayla oynatır; ⤢ tam ekran. Mavi nokta seçilen yer, beyaz nokta ölçüm istasyonu;
// haritaya dokununca onPick({ lat, lon }) (seçilen yer oraya taşınır).
// 2026-10-29 (Seyhun): harita "Harita" düğmesiyle tam ekran açılır (sayfada sürekli durmaz), yere yakın (zoom 12) başlar,
// tek parmakla her yöne kaydırılır; oklar yaklaştıkça sıklaşır (denseArrows: noktalar arası ara değer), uzağa kayınca o bölgenin verisi yüklenir.
// mini: sayfada küçük, dokunulmaz önizleme (şimdiki rüzgâr okları); dokununca aynı tam ekran harita açılır (yarış sayfası için).
const DARK_STYLES = ["https://tiles.openfreemap.org/styles/fiord", "https://tiles.openfreemap.org/styles/dark", MAP_STYLE];
const RADAR_LIST = "https://api.rainviewer.com/public/weather-maps.json";
const GRID = new Map(); // yer → { t, v } (30 dk)
const HM = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: PLACE.tz });

async function loadGrid(p) {
  const k = `${(+p.lat).toFixed(3)},${(+p.lon).toFixed(3)}`;
  const hit = GRID.get(k);
  if (hit && Date.now() - hit.t < 30 * 60e3) return hit.v;
  const { url, pts } = regionUrl(p, PLACE.tz);
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("grid");
  const v = shapeRegion(await r.json(), pts);
  GRID.set(k, { t: Date.now(), v });
  return v;
}
async function loadRadar() {
  try {
    const r = await fetch(RADAR_LIST, { signal: AbortSignal.timeout(8000) });
    const j = r.ok ? await r.json() : null;
    return (j?.radar?.past || []).slice(-12).map((f) => ({ at: f.time * 1000, url: `${j.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png` }));
  } catch {
    return [];
  }
}
async function pickStyle() {
  for (const s of DARK_STYLES) {
    try {
      const r = await fetch(s, { signal: AbortSignal.timeout(6000) });
      if (r.ok) return s;
    } catch {}
  }
  return MAP_STYLE;
}
// Ok (SDF: rengi katmanda verilir); aşağı bakar, rüzgârın estiği yöne döner
function arrowImage() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  g.strokeStyle = "#fff";
  g.lineWidth = 3.5;
  g.lineCap = g.lineJoin = "round";
  g.beginPath();
  g.moveTo(16, 4);
  g.lineTo(16, 27);
  g.moveTo(9, 20);
  g.lineTo(16, 27);
  g.lineTo(23, 20);
  g.stroke();
  return g.getImageData(0, 0, 32, 32);
}

export function RegionMap({ place, station, obs, onPick, mini = false, className = "h-24" }) {
  const box = useRef(null);
  const map = useRef(null);
  const pick = useRef(onPick);
  const here0 = useRef(place);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);
  const [grid, setGrid] = useState(null);
  const [radar, setRadar] = useState([]);
  const [mode, setMode] = useState("wind");
  const [full, setFull] = useState(false); // açık: tam ekran harita; kapalıyken yalnız "Harita" düğmesi
  const [center, setCenter] = useState(null); // verinin yüklendiği merkez (harita uzağa kayınca değişir)
  const [view, setView] = useState(0); // harita kaydı/yakınlaştı: oklar yeniden dizilir
  const [play, setPlay] = useState(false);
  const [sel, setSel] = useState(null); // seçilen adım (null: şimdi)
  useEffect(() => {
    pick.current = onPick;
    here0.current = place;
  }, [onPick, place]);

  const pk = `${place.lat},${place.lon}`;
  const gc = center?.pk === pk ? center : place; // seçilen yer değişince veri yeniden onun çevresinden
  const shown = full || mini; // harita çiziliyor mu (kapalı mini: küçük önizleme)
  useEffect(() => {
    if (!shown) return;
    let on = true;
    loadGrid(gc).then((v) => on && setGrid(v), () => {});
    return () => {
      on = false;
    };
  }, [shown, gc.lat, gc.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!full) return;
    let on = true;
    loadRadar().then((v) => on && setRadar(v));
    return () => {
      on = false;
    };
  }, [full]);

  useEffect(() => {
    if (!shown) return;
    let live = true;
    Promise.all([loadMapLibre(), pickStyle()])
      .then(([ml, style]) => {
        if (!live || !box.current) return;
        const m = new ml.Map({ container: box.current, style, center: [+place.lon, +place.lat], zoom: full ? 12 : 10.5, interactive: full, attributionControl: false, dragRotate: false, pitchWithRotate: false });
        m.addControl(new ml.AttributionControl({ compact: true, customAttribution: `${MAP_ATTR} · Radar RainViewer · Open-Meteo` }));
        m.touchZoomRotate.disableRotation();
        if (full) m.on("click", (e) => pick.current?.({ lat: +e.lngLat.lat.toFixed(4), lon: +e.lngLat.lng.toFixed(4) }));
        // Kaydırınca/yakınlaşınca oklar yeniden dizilir; verinin merkezinden 12 km'den uzağa gidilince o bölgenin verisi yüklenir
        m.on("moveend", () => {
          setView((v) => v + 1);
          const c = m.getCenter();
          const p = here0.current;
          const k = `${p.lat},${p.lon}`;
          setCenter((old) => {
            const base = old?.pk === k ? old : { lat: +p.lat, lon: +p.lon };
            return km(base, { lat: c.lat, lon: c.lng }) > 12 ? { pk: k, lat: +c.lat.toFixed(3), lon: +c.lng.toFixed(3) } : old;
          });
        });
        m.on("load", () => {
          if (!live) return;
          m.addImage("ok", arrowImage(), { sdf: true });
          box.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"); // kaynak yazısı "i" içinde kapalı başlar
          map.current = m;
          setReady(true);
        });
        m.on("error", () => {});
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
      setReady(false);
    };
  }, [full, shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = useNow().getTime();
  const steps = useMemo(() => regionSteps(grid, radar, mode, now), [grid, radar, mode, now]);
  const nowIx = steps.findIndex((s) => s.now);
  const ix = sel == null || sel >= steps.length ? Math.max(0, nowIx) : sel;
  const step = steps[ix];

  // Oynat: adım adım, sonda durur
  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => setSel((s) => {
      const cur = s ?? Math.max(0, nowIx);
      if (cur >= steps.length - 1) {
        setPlay(false);
        return cur;
      }
      return cur + 1;
    }), 800);
    return () => clearInterval(id);
  }, [play, steps.length, nowIx]);

  // Katmanlar: ızgara (rüzgâr alanı + oklar, tahmin yağışı), radar karoları, seçilen yer ve istasyon
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !grid) return;
    const fc = { type: "FeatureCollection", features: grid.spots.map((s, k) => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.lon, s.lat] }, properties: { k } })) };
    if (m.getSource("grid")) m.getSource("grid").setData(fc);
    else {
      m.addSource("grid", { type: "geojson", data: fc });
      m.addLayer({ id: "wind-heat", type: "circle", source: "grid", paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 8, 18, 10, 70, 12, 280], "circle-blur": 1, "circle-opacity": 0.35, "circle-color": "#7aa6d6" } });
      m.addLayer({ id: "rain-fc", type: "circle", source: "grid", paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 8, 16, 10, 64, 12, 256], "circle-blur": 1, "circle-opacity": 0, "circle-color": "#38bdf8" } });
      m.addSource("arrows", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "wind-arrow", type: "symbol", source: "arrows", layout: { "icon-image": "ok", "icon-size": 0.75, "icon-allow-overlap": true, "icon-rotation-alignment": "map", "icon-rotate": ["get", "d"] }, paint: { "icon-color": ["get", "c"] } });
    }
    const pts = { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [+place.lon, +place.lat] }, properties: { kind: "place" } }] };
    if (station?.lat != null) pts.features.push({ type: "Feature", geometry: { type: "Point", coordinates: [+station.lon, +station.lat] }, properties: { kind: "station" } });
    if (m.getSource("pts")) m.getSource("pts").setData(pts);
    else {
      m.addSource("pts", { type: "geojson", data: pts });
      m.addLayer({ id: "pts", type: "circle", source: "pts", paint: { "circle-radius": ["match", ["get", "kind"], "place", 7, 4.5], "circle-color": ["match", ["get", "kind"], "place", "#0ea5c4", "#fff"], "circle-stroke-width": 3, "circle-stroke-color": ["match", ["get", "kind"], "place", "#fff", "#1c3550"] } });
    }
  }, [ready, grid, place.lat, place.lon, station?.lat, station?.lon]);
  useEffect(() => {
    const m = map.current;
    if (m && ready) m.easeTo({ center: [+place.lon, +place.lat], duration: 600 });
  }, [ready, place.lat, place.lon]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    radar.forEach((f, k) => {
      const id = `radar${k}`;
      if (m.getSource(id)) return;
      m.addSource(id, { type: "raster", tiles: [f.url], tileSize: 256, maxzoom: 7 });
      m.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": 0, "raster-fade-duration": 0 } }, m.getLayer("wind-heat") ? "wind-heat" : undefined);
    });
  }, [ready, radar]);

  // Seçilen adımı çiz
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !grid || !step) return;
    const wind = mode === "wind";
    const i = step.i ?? -1;
    const by = (f) => ["match", ["get", "k"], ...grid.spots.flatMap((s, k) => [k, f(s)]), f(grid.spots[0])];
    if (m.getLayer("wind-arrow")) {
      m.setLayoutProperty("wind-arrow", "visibility", wind && i >= 0 ? "visible" : "none");
      m.setLayoutProperty("wind-heat", "visibility", wind && i >= 0 ? "visible" : "none");
      if (wind && i >= 0) {
        const b = m.getBounds();
        const list = denseArrows(grid, i, [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], m.getZoom());
        m.getSource("arrows")?.setData({ type: "FeatureCollection", features: list.map((a) => ({ type: "Feature", geometry: { type: "Point", coordinates: [a.lon, a.lat] }, properties: { d: a.d, c: colorOf(a.w) } })) });
        m.setPaintProperty("wind-heat", "circle-color", by((s) => colorOf(s.w[i] ?? 0)));
      }
      const rainFc = !wind && step.kind === "fc";
      m.setLayoutProperty("rain-fc", "visibility", rainFc ? "visible" : "none");
      if (rainFc) {
        m.setPaintProperty("rain-fc", "circle-color", by((s) => mmColor(s.mm[i] ?? 0)));
        m.setPaintProperty("rain-fc", "circle-opacity", by((s) => ((s.mm[i] ?? 0) >= 0.1 ? 0.5 : 0)));
      }
    }
    radar.forEach((_, k) => m.getLayer(`radar${k}`) && m.setPaintProperty(`radar${k}`, "raster-opacity", !wind && step.kind === "radar" && step.r === k ? 0.75 : 0));
  }, [ready, grid, radar, mode, step, view]);


  if (!full && mini)
    return (
      <button type="button" onClick={() => (setErr(false), setFull(true))} aria-label="Bölge haritasını aç" className={`relative block w-full overflow-hidden rounded-[1.125rem] bg-[#0f1f38] active:scale-[.98] ${className}`}>
        <div ref={box} className="pointer-events-none absolute inset-0" />
        {err && <span className="absolute inset-0 grid place-items-center text-[0.8125rem] text-white/70">Harita açılamadı</span>}
      </button>
    );
  if (!full)
    return (
      <button type="button" onClick={() => (setErr(false), setFull(true))} aria-label="Bölge haritasını aç" className="flex h-12 w-full items-center justify-center gap-2 rounded-[1.125rem] bg-[#0f1f38] text-[0.9375rem] font-semibold text-white active:scale-[.98]">
        <Icon name="map" className="size-[1.125rem]" />
        Harita
      </button>
    );
  if (err)
    return (
      <button type="button" onClick={() => setFull(false)} aria-label="Bölge haritası" className="grid h-24 w-full place-items-center rounded-[1.125rem] bg-[#0f1f38] px-4 text-center text-[0.8125rem] text-white/70">
        Harita açılamadı. İnterneti kontrol et.
      </button>
    );
  const here = grid ? nearest(grid.spots, place) : null;
  const ob = step && step.kind !== "fc" && obs?.find((o) => o.hh === step.hh);
  let info = "";
  if (step && here) {
    if (mode === "wind") info = step.i >= 0 ? `${windName(here.d[step.i])[0]} ${knTxt(here.w[step.i], here.g[step.i])} kn${ob ? ` · ölçüm ${station?.name || ""} ${Math.round(ob.wind)} kn` : ""}` : "";
    else if (step.kind === "radar") info = "Radar";
    else {
      const top = Math.max(0, ...grid.spots.map((s) => s.mm[step.i] ?? 0));
      info = top >= 0.1 ? `Tahmin: en çok ${top >= 1 ? Math.round(top) : "<1"} mm/sa` : "Tahmin: yağış yok";
    }
  }
  const nowPct = steps.length > 1 ? (Math.max(0, nowIx) / (steps.length - 1)) * 100 : 0;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0f1f38] pt-[env(safe-area-inset-top)]" aria-label="Bölge haritası">
      <div className="relative min-h-0 flex-1">
        <div ref={box} className="h-full w-full" />
        <div className="absolute left-2.5 top-2.5 flex rounded-full bg-[rgba(15,31,56,.78)] p-[3px] backdrop-blur" role="group" aria-label="Katman">
          {[["wind", "Rüzgâr"], ["rain", "Yağış"]].map(([k, t]) => (
            <button key={k} type="button" aria-pressed={mode === k} onClick={() => (setMode(k), setSel(null), setPlay(false))} className={`h-7 rounded-full px-3 text-[0.8125rem] font-semibold ${mode === k ? "bg-white text-[#11203a]" : "text-white/75"}`}>
              {t}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => (setFull(false), setPlay(false), setSel(null))} aria-label="Haritayı kapat" className="absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full bg-[rgba(15,31,56,.78)] text-white">
          <Icon name="x" className="size-4" />
        </button>
      </div>
      <div className="px-3 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-white">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => (ix >= steps.length - 1 && setSel(0), setPlay((p) => !p))} aria-label={play ? "Durdur" : "Oynat"} className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0ea5c4] text-white">
            <Icon name={play ? "pause" : "play"} className="size-4" />
          </button>
          <div className="relative h-8 min-w-0 flex-1">
            <div className="absolute inset-x-0 top-[9px] h-1 rounded-full bg-white/18" />
            <div className="absolute left-0 top-[9px] h-1 rounded-full bg-white" style={{ width: `${nowPct}%` }} />
            <div className="absolute top-1 h-3.5 w-0.5 bg-[#ff6b6b]" style={{ left: `${nowPct}%` }} />
            <input type="range" min={0} max={Math.max(0, steps.length - 1)} value={ix} onChange={(e) => (setPlay(false), setSel(+e.target.value))} aria-label="Zaman" className="ck-range absolute inset-x-0 top-0 h-6 w-full" />
            <div className="absolute inset-x-0 top-[1.15rem] text-[0.625rem] text-white/60">
              <span className="absolute left-0">−2 sa</span>
              <span className="absolute -translate-x-1/2" style={{ left: `${nowPct}%` }}>Şimdi</span>
              <span className="absolute right-0">+12</span>
            </div>
          </div>
        </div>
        <p className="mt-1.5 truncate text-[0.8125rem] font-semibold">
          {step ? (step.now ? `Şimdi ${HM.format(step.at)}` : HM.format(step.at)) : "…"}
          {info && <span className="font-medium text-white/65"> · {info}</span>}
        </p>
      </div>
    </div>
  );
}

function nearest(spots, p) {
  let best = spots[0];
  let d = Infinity;
  for (const s of spots) {
    const x = (s.lat - p.lat) ** 2 + (s.lon - p.lon) ** 2;
    if (x < d) (d = x), (best = s);
  }
  return best;
}

// Dokunulan noktanın adı (OpenStreetMap): köy / mahalle / ilçe; bulunamazsa "Seçilen nokta"
export async function pointName({ lat, lon }) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=tr&lat=${lat}&lon=${lon}`);
    const j = r.ok ? await r.json() : null;
    const a = j?.address || {};
    const name = a.village || a.suburb || a.neighbourhood || a.town || a.hamlet || a.city_district || a.county || a.city || "";
    return { name: name || "Seçilen nokta", region: a.province || a.state || "" };
  } catch {
    return { name: "Seçilen nokta", region: "" };
  }
}
