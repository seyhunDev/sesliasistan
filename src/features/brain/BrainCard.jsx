"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { LABELS } from "@/lib/brain/model";
import { flush, guess, stats, subscribe } from "@/lib/brain/store";

const kb = (b) => (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`);
const labelName = (l) => LABELS[l] || (l.startsWith("nav:") ? `Sayfa: ${l.slice(4)}` : l);

// Hesap ekranında: öğrenme verisinin boyutu, Firebase okuma/yazma sayısı, model denemesi
export function BrainCard() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    const up = () => setS(stats());
    up();
    return subscribe(up);
  }, []);
  if (!s) return null;
  const g = q.trim() ? guess(q) : null;
  const pct = Math.min(100, Math.round((s.docBytes / s.docLimit) * 100));

  async function sync() {
    const ok = await flush(true);
    toast(ok ? "Eşitlendi" : s.pending ? "Eşitlenemedi, sonra tekrar dene" : "Bekleyen veri yok");
  }

  return (
    <div className="mt-4 rounded-xl bg-bg p-3.5">
      <div className="flex items-center justify-between gap-3">
        <b className="text-[15px] font-medium">Öğrenme verisi</b>
        <button onClick={sync} className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-semibold active:scale-95">
          Şimdi eşitle
        </button>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
        {[
          ["Örnek", s.team ? `${s.count} · ${s.team} ekipten` : s.count],
          ["Bekleyen", s.pending],
          ["Cihazdaki boyut", kb(s.bytes)],
          ["Bu ayki belge", `${kb(s.docBytes)} · %${pct}`],
          ["Bu ay okuma", s.reads],
          ["Bu ay yazma", s.writes],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-card px-2.5 py-2 ring-1 ring-line">
            <dt className="text-mut">{k}</dt>
            <dd className="font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {s.byLabel.length > 0 && (
        <p className="mt-2 text-[13px] leading-snug text-mut">{s.byLabel.slice(0, 6).map(([l, n]) => `${labelName(l)} ${n}`).join(" · ")}</p>
      )}

      {/* Modeli dene */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Modeli dene · örn. “cuma antrenman koy”"
        className="mt-3 h-10 w-full rounded-lg border border-line bg-card px-3 text-[14px] outline-none focus:border-acc"
      />
      {q.trim() && (
        <div className="mt-2 text-[13px]">
          {g ? (
            <>
              <p>
                Tahmin: <b>{labelName(g.label)}</b> · güven %{Math.round(g.score * 100)} {g.score < 0.55 && <span className="text-mut">(kullanmak için düşük)</span>}
              </p>
              <ul className="mt-1 space-y-0.5 text-mut">
                {g.near.slice(0, 3).map((n, i) => (
                  <li key={i} className="truncate">%{Math.round(n.sim * 100)} “{n.x}” → {labelName(n.l)}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-mut">{s.count < 5 ? "En az 5 örnek gerekli." : "Benzer örnek yok."}</p>
          )}
        </div>
      )}
    </div>
  );
}
