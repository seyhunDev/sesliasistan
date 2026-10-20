"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { resetCounts } from "@/lib/raceLive";

// Denemeleri sıfırla (Seyhun 2026-10-19: "denemeleri sıfırlamam gerekiyor… o sıfırlama butonu olsun"): neyin kaç tane silineceği yazar.
// Fotoğraf ve videolar ayrıca seçilirse silinir (kapalı başlar). Yarışın bilgileri, sonuçlar, evrak ve bütçe kalır.
export function ResetSheet({ open, onClose, live, onReset }) {
  return (
    <Sheet open={open} onClose={onClose} title="Denemeleri sıfırla">
      {open && <Body live={live} onReset={onReset} />}
    </Sheet>
  );
}

function Body({ live, onReset }) {
  const [media, setMedia] = useState(false);
  const [busy, setBusy] = useState(false);
  const n = resetCounts(live);
  const rows = [
    ["Eklenen gün", n.days],
    ["Yarış ve süreleri", n.starts],
    ["Rüzgâr kaydı", n.wind],
  ];
  return (
    <div className="pb-2">
      <ul className="divide-y divide-line border-y border-line">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between py-3 text-[0.9375rem]">
            <span className="text-mut">{k}</span>
            <b className="font-semibold tabular-nums">{v}</b>
          </li>
        ))}
        <li>
          <label className="flex items-center justify-between py-3 text-[0.9375rem]">
            <span className="text-mut">Fotoğraf ve videoları da sil ({n.media})</span>
            <input type="checkbox" checked={media} onChange={(e) => setMedia(e.target.checked)} disabled={!n.media} className="size-5 accent-[var(--color-rec)]" />
          </label>
        </li>
      </ul>
      <p className="mt-3 px-1 text-[0.8125rem] text-mut">Sayaç ve parkur noktaları da baştan başlar. Yarışın bilgileri, sonuçlar, evrak ve bütçe kalır.</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => (setBusy(true), Promise.resolve(onReset(media)).finally(() => setBusy(false)))}
        data-press className="btn btn-danger mt-4 h-14 w-full"
      >
        Sıfırla
      </button>
    </div>
  );
}
