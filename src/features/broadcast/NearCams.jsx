"use client";
/* eslint-disable @next/next/no-img-element -- YouTube küçük resimleri doğrudan */

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { racePlace } from "@/features/athletes/raceWeather";

// Bölgede ara (Seyhun 2026-11-03 "yarış bölgesinde otelin, limanın kendi kamerası yayın yapıyordur belki"): Canlı kaynak ekle penceresinde
// yarışın yerine göre YouTube'daki canlı yayınlar (konumu eklenmiş yayınlar 30 km içinde + "<ilçe> canlı" araması, /api/cams geo=1).
// Otel ya da marina adı yazılıp da aranır. Satıra dokununca o yayın kaynak olarak eklenir (onPick(url, ad)).
export function NearCams({ race, onPick }) {
  const [at, setAt] = useState(null); // { name, lat, lon }
  const [q, setQ] = useState("");
  const [st, setSt] = useState({ busy: false, list: null, note: "" });
  const seq = useRef(0);

  const run = async (spot, text) => {
    const n = ++seq.current;
    setSt({ busy: true, list: null, note: "" });
    try {
      const p = new URLSearchParams({ lat: String(spot.lat), lon: String(spot.lon), q: text, geo: "1" });
      const r = await authFetch(`/api/cams?${p}`);
      const d = await r.json();
      if (n !== seq.current) return;
      const note = d.ytState === "nokey" ? "YouTube anahtarı yok" : d.ytState === "fail" ? "YouTube'a bağlanılamadı" : "";
      setSt({ busy: false, list: d.yt || [], note });
    } catch {
      if (n === seq.current) setSt({ busy: false, list: [], note: "Aranamadı. İnterneti kontrol et." });
    }
  };

  useEffect(() => {
    if (!race) return;
    let on = true;
    racePlace(race).then(
      (p) => {
        if (!on) return;
        const name = String(race.district || race.city || p.name.split(",")[0] || "").trim();
        setAt(p);
        setQ(name);
        run(p, name);
      },
      (e) => on && setSt({ busy: false, list: [], note: e?.message || "Yarışın yeri bulunamadı" })
    );
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız yarış yüklenince bir kez
  }, [race?.id, race?.district, race?.city]);

  const search = (e) => {
    e.preventDefault();
    if (at && !st.busy) run(at, q.trim());
  };

  return (
    <div className="mt-5">
      <h3 className="text-[0.9375rem] font-semibold">Bölgede canlı yayınlar</h3>
      <form onSubmit={search} className="mt-2 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Yer, otel ya da marina adı" enterKeyHint="search" className="h-11 min-w-0 flex-1 rounded-[0.6875rem] bg-[var(--chip)] px-3 text-[0.9375rem] outline-none" />
        <button type="submit" data-press disabled={!at || st.busy} className="masa-tog h-11 shrink-0 px-4 disabled:opacity-50">
          Ara
        </button>
      </form>
      <div className="mt-2 max-h-[16rem] space-y-1.5 overflow-y-auto">
        {st.busy || (!st.list && !st.note) ? (
          [0, 1].map((i) => (
            <div key={i} className="flex h-[3.75rem] items-center gap-3 rounded-[0.6875rem] bg-[var(--chip)] px-2">
              <span className="h-11 w-[4.75rem] shrink-0 rounded-md bg-black/10" />
              <span className="h-3 flex-1 rounded bg-black/10" />
            </div>
          ))
        ) : st.list?.length ? (
          st.list.map((c) => (
            <button key={c.id} type="button" data-press onClick={() => onPick(c.link, c.ch || c.title)} className="flex h-[3.75rem] w-full items-center gap-3 rounded-[0.6875rem] bg-[var(--chip)] px-2 text-left">
              <img src={c.thumb} alt="" className="h-11 w-[4.75rem] shrink-0 rounded-md object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-semibold">{c.title}</span>
                <span className="block truncate text-[0.8125rem] text-mut">{c.ch}</span>
              </span>
              <span className="shrink-0 text-[0.875rem] font-semibold text-[#7fb6ff]">Ekle</span>
            </button>
          ))
        ) : (
          <p className="py-2 text-[0.875rem] text-mut">{st.note || "Bu bölgede şu an canlı yayın yok"}</p>
        )}
      </div>
    </div>
  );
}
