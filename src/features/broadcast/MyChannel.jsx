"use client";

import { useEffect, useState } from "react";
import { PRIVACY, YtNeed, ytConnect, ytMine } from "@/lib/youtube";

// Yayın › + Kaynak › Kanalımdan (Seyhun 2026-11-06): bağlı YouTube kanalındaki şu anki canlı yayın ve son videolar (liste dışı dahil).
// Dokunulan, seçili türde (Kamera/Telefon/Drone) kaynak olarak eklenir; link yapıştırmak gerekmez. Bağlı değilse "YouTube'a bağlan".
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" }) : "");

export function MyChannel({ onPick, used = [] }) {
  const [st, setSt] = useState({ busy: true, d: null, need: "", note: "" });
  const load = () =>
    ytMine().then(
      (d) => setSt({ busy: false, d, need: "", note: "" }),
      (e) => setSt({ busy: false, d: null, need: e instanceof YtNeed ? e.need : "", note: e instanceof YtNeed ? "" : e?.message || "YouTube'a ulaşılamadı" })
    );
  useEffect(() => {
    load();
    // Safari'de bağlanıp geri dönünce liste yenilenir
    const back = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, []);

  const row = (v, live) => (
    <button key={v.id} type="button" data-press onClick={() => onPick(v.link)} className="flex h-[3.75rem] w-full items-center gap-3 rounded-[0.6875rem] bg-[var(--chip)] px-2 text-left">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {v.thumb ? <img src={v.thumb} alt="" className="h-11 w-[4.75rem] shrink-0 rounded-md object-cover" /> : <span className="h-11 w-[4.75rem] shrink-0 rounded-md bg-black/10" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.875rem] font-semibold">{v.title}</span>
        <span className="block truncate text-[0.8125rem] text-mut">{live ? st.d?.channel : [day(v.at), PRIVACY[v.privacy]].filter(Boolean).join(" · ")}</span>
      </span>
      {live ? <span className="shrink-0 rounded-md bg-[var(--rec)] px-1.5 py-0.5 text-[0.6875rem] font-bold text-white">Canlı</span> : used.includes(v.link) ? <span className="shrink-0 text-[0.75rem] font-semibold text-acc">Ekli</span> : null}
    </button>
  );

  return (
    <div className="mt-5">
      <h3 className="text-[0.9375rem] font-semibold">Kanalımdan</h3>
      <div className="mt-2 max-h-[16rem] space-y-1.5 overflow-y-auto">
        {st.busy && !st.d ? (
          [0, 1].map((i) => (
            <div key={i} className="flex h-[3.75rem] items-center gap-3 rounded-[0.6875rem] bg-[var(--chip)] px-2">
              <span className="h-11 w-[4.75rem] shrink-0 rounded-md bg-black/10" />
              <span className="h-3 flex-1 rounded bg-black/10" />
            </div>
          ))
        ) : st.need === "connect" ? (
          <button type="button" data-press onClick={() => ytConnect().catch((e) => setSt((s) => ({ ...s, note: e?.message || "Bağlanılamadı" })))} className="masa-tog h-11 w-full">
            YouTube&apos;a bağlan
          </button>
        ) : st.d ? (
          <>
            {st.d.live.map((v) => row(v, true))}
            {st.d.videos.map((v) => row(v, false))}
            {!st.d.live.length && !st.d.videos.length ? <p className="py-2 text-[0.875rem] text-mut">Kanalda video yok</p> : null}
          </>
        ) : null}
        {st.need === "setup" ? <p className="py-1 text-[0.875rem] text-mut">YouTube bağlantısı henüz kurulmadı</p> : null}
        {st.note ? <p className="py-1 text-[0.875rem] text-mut">{st.note}</p> : null}
      </div>
    </div>
  );
}
