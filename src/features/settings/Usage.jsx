"use client";

import { useState } from "react";
import { monthName, servicesOf, sttUsage, ttsUsage, usageRows, usd } from "@/lib/aiUsage";
import { spendOf, tlText } from "@/lib/aiPrice";

// Ayarlar › Durum › Harcamalar › Google Gemini (ana hesap): bu ay yapay zekaya kaç istek gitti (işe göre), geçen ay, görseller ve yaklaşık maliyet.
// Google kalan kotayı API ile vermediği için sayaç uygulamanındır.
// Aylık yapay zeka bütçesi (TL): yalnız bu telefonda; harcamanın yüzdesi gösterilir
const BUDGET_KEY = "sa-ai-butce";
export const readBudget = () => {
  try {
    return Number(localStorage.getItem(BUDGET_KEY)) || 250;
  } catch {
    return 250;
  }
};

// Gemini ayrıntısı (bugün/bu ay, bütçe, gün gün, iş iş); Harcamalar listesinde Gemini satırına dokununca da açılır
export function UsageDetail({ data }) {
  const [budget, setBudget] = useState(readBudget);
  const saveBudget = (v) => {
    const n = Math.max(0, Math.round(Number(String(v).replace(",", ".")) || 0));
    setBudget(n);
    try {
      localStorage.setItem(BUDGET_KEY, String(n));
    } catch {}
  };
  const d = data;
  const cur = usageRows(d?.ai?.month);
  const prev = usageRows(d?.ai?.prev);
  const img = d?.img;
  const stt = sttUsage(d?.ai?.month);
  const tts = ttsUsage(d?.ai?.month);
  const textCost = (n) => n * (d?.textPrice || 0.001);
  // Harcama: Google'ın bildirdiği token sayısından (lib/aiPrice.js), TL
  const sp = spendOf(d?.ai?.month, d?.today || "", d?.rate);
  // Bütçe çubuğu tüm servislerin toplamına göre (Durum kartıyla aynı yüzde)
  const pct = budget > 0 ? Math.min(100, Math.round((servicesOf(d).total / budget) * 100)) : 0;
  return (
    <div className="px-4 pb-3 text-[0.875rem]">
      <div className="mb-3 rounded-xl bg-bg px-3 py-2.5">
        <div className="flex justify-between">
          <span>Yazı ve ses · bugün</span>
          <b className="tabular-nums font-semibold">≈ {tlText(sp.today)}</b>
        </div>
        <div className="mt-1 flex justify-between">
          <span>Yazı ve ses · bu ay</span>
          <b className="tabular-nums font-semibold">≈ {tlText(sp.month)}</b>
        </div>
        {budget > 0 && (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div className={`h-full rounded-full ${pct >= 80 ? "bg-warn" : "bg-acc"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[0.75rem] text-mut">
              Aylık bütçe {tlText(budget)} · %{pct}
            </p>
          </div>
        )}
        {sp.days.length > 1 && (
          <ul className="mt-2 border-t border-line pt-1.5 text-[0.8125rem] text-mut">
            {sp.days.slice(0, 7).map(([day, v]) => (
              <li key={day} className="flex justify-between py-0.5">
                <span>
                  {new Date(`${d.ai.month.month}-${String(day).padStart(2, "0")}T12:00:00`).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                    weekday: "short",
                  })}
                </span>
                <span className="tabular-nums">{tlText(v)}</span>
              </li>
            ))}
          </ul>
        )}
        <label className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2 text-[0.8125rem]">
          <span>Aylık bütçe (TL)</span>
          <input
            type="number"
            inputMode="numeric"
            defaultValue={budget}
            onBlur={(e) => saveBudget(e.target.value)}
            className="w-20 rounded-lg border border-line bg-card px-2 py-1 text-right tabular-nums"
          />
        </label>
      </div>
      <p className="font-semibold">
        {monthName(d.ai?.month?.month)}: {cur.total} istek
        {img?.month ? ` · ${img.month} görsel` : ""} · ≈ {usd(textCost(cur.total) + (img?.cost || 0) + stt.cost)}
      </p>
      {cur.rows.length > 0 && (
        <ul className="mt-1.5 divide-y divide-line rounded-xl bg-bg px-3">
          {cur.rows.map(([k, n]) => (
            <li key={k} className="flex justify-between py-1.5">
              <span>{k}</span>
              <b className="tabular-nums">{n}</b>
            </li>
          ))}
        </ul>
      )}
      {stt.min > 0 && (
        <p className="mt-2 text-mut">
          Gemini ses tanıma: bu ay {stt.min.toLocaleString("tr-TR")} dk (≈ {usd(stt.cost)})
        </p>
      )}
      {tts.gem > 0 && (
        <p className="mt-2 text-mut">
          Gemini doğal ses: bu ay {tts.gem.toLocaleString("tr-TR")} harf (≈ {usd(tts.gemCost)})
        </p>
      )}
      {tts.chars > 0 && (
        <p className="mt-2 text-mut">
          Google seslendirme: bu ay {tts.chars.toLocaleString("tr-TR")} harf {`(ücretsiz 1 milyonun %${tts.pct}'i)`}
        </p>
      )}
      {img && (
        <p className="mt-2 text-mut">
          Instagram görseli: bugün {img.today}/{img.limit}, bu ay {img.month} (≈ {usd(img.cost)})
        </p>
      )}
      {prev.total > 0 && (
        <p className="mt-1 text-mut">
          {monthName(d.ai?.prev?.month)}: {prev.total} istek (≈ {usd(textCost(prev.total))})
        </p>
      )}
      <p className="mt-2 text-[0.75rem] leading-snug text-mut">
        Google’ın bildirdiği token sayısından hesaplanır (1 $ ≈ {d.rate} TL), 20 Ekim 2026’dan beri sayar. Metin isteği başına ≈ ${String(d.textPrice || 0.001).replace(".", ",")} varsayıldı.
      </p>
    </div>
  );
}
