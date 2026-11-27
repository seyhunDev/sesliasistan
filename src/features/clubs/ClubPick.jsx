"use client";

import { useEffect, useMemo, useState } from "react";
import { SeaBackdrop } from "@/sports/SeaBackdrop";
import { searchClubs } from "@/lib/club";
import { loadClubs } from "./clubs";

// "Kulübün?" (Seyhun 2026-11-27): resmi kulüp listesinden seç ya da "Kulüpsüz devam et". Serbest ad yazılmaz.
// Kayıttan sonra ve kulübü sorulmamış eski hesaplara bir kez (ClubGate), yarış evrakında kulüp yoksa ve Ayarlar'dan.
// onPick(id) — kulüpsüzde "". Tam ekran, "Hangi spor?" ile aynı deniz arka planı.
export function ClubPick({ onPick, onClose, current = "" }) {
  const [list, setList] = useState(null);
  const [fail, setFail] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    loadClubs()
      .then(setList)
      .catch(() => setFail(true));
  }, []);
  const shown = useMemo(() => searchClubs(list || [], q), [list, q]);

  const pick = async (id) => {
    if (busy) return;
    setBusy(id || "-");
    try {
      await onPick(id);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="sp-screen fixed inset-0 z-[70] overflow-hidden text-white" role="dialog" aria-modal="true" aria-label="Kulüp seçimi">
      <SeaBackdrop />
      <div className="relative mx-auto flex h-full max-w-[26.25rem] flex-col px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        <div className="flex items-center gap-3">
          {onClose && (
            <button type="button" className="btn-round sp-back" aria-label="Kapat" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
          )}
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]">Kulübün?</h1>
        </div>
        <input
          id="kulup-ara"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Kulüp, il ya da ilçe ara"
          autoComplete="off"
          className="mt-5 h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-[1rem] text-white outline-none placeholder:text-white/50 focus:border-white/40"
        />
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl">
          {fail ? (
            <p className="px-1 py-4 text-[0.9375rem] text-white/70">Liste açılamadı. Kulüpsüz devam edip sonra Ayarlar&apos;dan seçebilirsin.</p>
          ) : !list ? (
            <div className="space-y-2 pt-1">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/10" />)}</div>
          ) : !shown.length ? (
            <p className="px-1 py-4 text-[0.9375rem] text-white/70">{list.length ? "Bu adla kulüp yok." : "Liste henüz boş."}</p>
          ) : (
            <div className="space-y-2 pb-2">
              {shown.map((c) => (
                <button key={c.id} type="button" className="sp-opt w-full text-left" disabled={!!busy} onClick={() => pick(c.id)} aria-pressed={current === c.id}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{c.name}</span>
                    {(c.district || c.city) && <span className="block truncate text-[0.8125rem] font-normal text-white/60">{[c.district, c.city].filter(Boolean).join(", ")}</span>}
                  </span>
                  {current === c.id ? <span className="text-[0.8125rem] font-semibold text-[#8fb3ff]">Seçili</span> : busy === c.id ? <span className="text-white/60">…</span> : <span aria-hidden="true" className="sp-chev">›</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" disabled={!!busy} onClick={() => pick("")} className="mt-3 h-12 w-full rounded-2xl border border-white/20 text-[1rem] font-semibold text-white active:scale-[0.98]">
          Kulüpsüz devam et
        </button>
      </div>
    </div>
  );
}
