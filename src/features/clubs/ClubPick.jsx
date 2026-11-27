"use client";

import { useEffect, useMemo, useState } from "react";
import { liveHead } from "@/features/liveScreen/fonts";
import { searchClubs } from "@/lib/club";
import { BASE_CLUBS, loadClubs } from "./clubs";

// "Kulübün?" (Seyhun 2026-11-27): resmi kulüp listesinden seç ya da "Kulüpsüz devam et". Serbest ad yazılmaz.
// Kayıttan sonra ve kulübü sorulmamış eski hesaplara bir kez (ClubGate), yarış evrakında kulüp yoksa ve Ayarlar'dan.
// onPick(id) — kulüpsüzde "". Tam ekran, ana sayfanın koyu "Sahne" dili (limon vurgu, ince çizgili liste).
// Liste okunamazsa Dikili yine görünür (BASE_CLUBS), altta sade "Liste açılamadı · Tekrar dene".
export function ClubPick({ onPick, onClose, current = "" }) {
  const [list, setList] = useState(null);
  const [fail, setFail] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [n, setN] = useState(0);

  useEffect(() => {
    let on = true;
    loadClubs({ fresh: n > 0 })
      .then((l) => on && (setList(l), setFail(false)))
      .catch(() => on && (setList(BASE_CLUBS), setFail(true)));
    return () => {
      on = false;
    };
  }, [n]);
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
    <div className={`${liveHead.variable} fixed inset-0 z-[70] flex flex-col bg-[#0b0b0c] text-white`} role="dialog" aria-modal="true" aria-label="Kulüp seçimi">
      <div className="mx-auto flex min-h-0 w-full max-w-[27.5rem] flex-1 flex-col px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))]">
        <div className="flex shrink-0 items-center gap-3">
          {onClose && (
            <button type="button" data-press className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1f1f22] text-white active:scale-95" aria-label="Kapat" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
          )}
          <h1 className="sahne-t text-[2.5rem]">
            Kulüb<span className="text-[#d4ff3a]">ün</span>?
          </h1>
        </div>
        <input
          id="kulup-ara"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Kulüp, il ya da ilçe ara"
          autoComplete="off"
          className="mt-5 h-12 w-full shrink-0 rounded-2xl border border-[#26262b] bg-[#17171a] px-4 text-[1rem] text-white outline-none placeholder:text-[#71717a] focus:border-[#d4ff3a]"
        />
        <div className="-mx-6 mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
          {!list ? (
            <div className="space-y-px pt-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[3.75rem] animate-pulse border-b border-[#1f1f22] bg-white/[.03]" />)}</div>
          ) : !shown.length ? (
            <p className="py-4 text-[0.9375rem] text-[#a1a1aa]">Bu adla kulüp yok.</p>
          ) : (
            <ul>
              {shown.map((c) => {
                const sel = current === c.id;
                return (
                  <li key={c.id} className="border-b border-[#1f1f22] last:border-0">
                    <button type="button" disabled={!!busy} onClick={() => pick(c.id)} aria-pressed={sel} className="flex min-h-[3.75rem] w-full items-center gap-3 py-2.5 text-left active:opacity-70 disabled:opacity-60">
                      <span className="min-w-0 flex-1">
                        <b className="line-clamp-2 block text-[1rem] font-semibold leading-snug">{c.name}</b>
                        {(c.district || c.city) && <small className="block truncate text-[0.875rem] text-[#a1a1aa]">{[c.district, c.city].filter(Boolean).join(", ")}</small>}
                      </span>
                      {sel ? (
                        <span className="shrink-0 text-[0.875rem] font-bold text-[#d4ff3a]">Seçili</span>
                      ) : busy === c.id ? (
                        <span className="shrink-0 text-[#a1a1aa]">…</span>
                      ) : (
                        <span aria-hidden="true" className="shrink-0 text-[1.25rem] text-[#71717a]">›</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {fail && (
            <p className="py-3 text-[0.875rem] text-[#a1a1aa]">
              Liste açılamadı.{" "}
              <button type="button" className="font-semibold text-[#d4ff3a]" onClick={() => (setList(null), setN((x) => x + 1))}>
                Tekrar dene
              </button>
            </p>
          )}
        </div>
        <button
          type="button"
          data-press
          disabled={!!busy}
          onClick={() => pick("")}
          className="mt-4 h-[3.375rem] w-full shrink-0 rounded-2xl bg-[#1f1f22] text-[1.0625rem] font-bold text-white transition active:scale-[.98] disabled:opacity-60"
        >
          {busy === "-" ? "…" : "Kulüpsüz devam et"}
        </button>
      </div>
    </div>
  );
}
