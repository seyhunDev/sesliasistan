"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { searchPlaces } from "@/features/weather/weather";
import { OSM, OSM_ATTR, loadLeaflet } from "@/lib/leaflet";
import { nearestStation } from "@/lib/windObs";

// Yarışın yeri (Seyhun 2026-10-19: "yoksa haritadan seçip hangi lokasyonu istiyorsun diye sorabilirsin"): il/ilçe ara ya da haritaya dokun.
// Altta en yakın resmî ölçüm istasyonu ve uzaklığı görünür (10 km'den uzaksa ölçülen rüzgâr çıkmaz). Kaydedilen yer yarışın `spot` alanına yazılır.
export function SpotSheet({ open, onClose, spot, onSave }) {
  return (
    <Sheet open={open} onClose={onClose} title="Yarışın yeri">
      {open && <Body spot={spot} onSave={onSave} />}
    </Sheet>
  );
}

const DIKILI = { name: "Dikili", lat: 39.0717, lon: 26.8886 };

function Body({ spot, onSave }) {
  const [p, setP] = useState(spot || null);
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) return;
    const c = new AbortController();
    const id = setTimeout(() => {
      searchPlaces(t, c.signal).then(setList, () => {});
    }, 350);
    return () => {
      clearTimeout(id);
      c.abort();
    };
  }, [q]);

  const st = p ? nearestStation(p.lat, p.lon) : null;
  const shown = q.trim().length >= 2 ? list : [];
  return (
    <div className="pb-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder="İlçe ya da yer ara"
        className="h-11 w-full rounded-xl bg-bg px-3 text-base outline-none placeholder:text-mut"
      />
      {shown.length > 0 && (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-bg">
          {shown.slice(0, 5).map((x) => (
            <li key={`${x.lat},${x.lon}`}>
              <button
                type="button"
                onClick={() => (setP({ name: [x.name, x.region].filter(Boolean).join(", "), lat: x.lat, lon: x.lon }), setQ(""), setList([]))}
                className="w-full px-3 py-2.5 text-left active:bg-line/40"
              >
                <b className="block truncate text-[0.9375rem] font-medium">{x.name}</b>
                <small className="block truncate text-[0.75rem] text-mut">{[x.district, x.region].filter(Boolean).join(" · ")}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <PinMap p={p} onPick={(lat, lon) => setP((o) => ({ name: o?.name || "Seçilen yer", lat, lon }))} />
      {p && (
        <p className="mt-2 px-1 text-[0.875rem] leading-snug">
          <b className="font-semibold">{p.name}</b>
          {st && (
            <span className={`block text-[0.8125rem] ${st.near ? "text-mut" : "text-warn"}`}>
              Ölçüm istasyonu: {st.name}, {Math.round(st.km)} km{st.near ? "" : " · uzak, ölçülen rüzgâr çıkmaz"}
            </span>
          )}
        </p>
      )}
      <button
        type="button"
        disabled={!p || busy}
        onClick={() => (setBusy(true), Promise.resolve(onSave(p)).finally(() => setBusy(false)))}
        className="mt-4 h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px disabled:opacity-40"
      >
        Kaydet
      </button>
    </div>
  );
}

// Harita: dokunulan yere iğne konur. Parmakla kaydırma pencereyi aşağı çekmesin diye dokunuşlar burada kalır.
function PinMap({ p, onPick }) {
  const box = useRef(null);
  const map = useRef(null);
  const pin = useRef(null);
  const pick = useRef(onPick);
  const [err, setErr] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    pick.current = onPick;
  });

  useEffect(() => {
    let live = true;
    loadLeaflet()
      .then((L) => {
        if (!live || !box.current) return;
        const c = p || DIKILI;
        const m = L.map(box.current, { zoomControl: true, attributionControl: true, tap: false }).setView([c.lat, c.lon], p ? 12 : 9);
        L.tileLayer(OSM, { maxZoom: 19, attribution: OSM_ATTR }).addTo(m);
        m.on("click", (e) => pick.current(Math.round(e.latlng.lat * 1e4) / 1e4, Math.round(e.latlng.lng * 1e4) / 1e4));
        map.current = m;
        setReady(true);
        setTimeout(() => m.invalidateSize(), 350); // pencere açılırken boyut sonradan oturur
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
      pin.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lat = p?.lat;
  const lon = p?.lon;
  useEffect(() => {
    const m = map.current;
    const L = typeof window !== "undefined" ? window.L : null;
    if (!m || !L || lat == null) return;
    if (!pin.current) pin.current = L.circleMarker([lat, lon], { radius: 9, color: "#fff", weight: 2, fillColor: "#0f766e", fillOpacity: 1 }).addTo(m);
    else pin.current.setLatLng([lat, lon]);
    if (!m.getBounds().contains([lat, lon])) m.setView([lat, lon], Math.max(m.getZoom(), 11));
  }, [lat, lon, ready]);

  if (err) return <p className="mt-3 rounded-xl bg-bg px-3 py-6 text-center text-[0.875rem] text-mut">Harita açılamadı. Yukarıdan arayarak seç.</p>;
  return <div ref={box} onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} className="mt-3 h-56 overflow-hidden rounded-xl bg-bg" />;
}
