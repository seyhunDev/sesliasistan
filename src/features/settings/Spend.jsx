"use client";

import { useState } from "react";
import { servicesOf } from "@/lib/aiUsage";
import { tlText } from "@/lib/aiPrice";
import { UsageDetail } from "./Usage";
import { Btn, Group } from "./ui";

// Ayarlar › Durum › Harcama kartı penceresi: kullanılan her servis, bu ayın tahmini tutarı ve servisin kendi
// fatura/kullanım sayfasını açan düğme (Seyhun 2026-11-26 "borcum var mı, harcamalar artmış mı görebilmek istiyorum").
// Gemini satırına dokununca bütçe ve iş iş döküm açılır. data: /api/usage?ai=1 cevabı.
export function SpendList({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return <p className="px-1 text-[0.875rem] text-mut">Yükleniyor…</p>;
  const { rows, total } = servicesOf(data);
  return (
    <>
      <Group>
        {rows.map((r) => {
          const val = r.tl == null ? "–" : r.free && !r.tl ? "Ücretsiz" : `≈ ${tlText(r.tl)}`;
          const main = (
            <span className="min-w-0 flex-1 py-2.5">
              <span className="block truncate text-[1rem] font-medium">{r.name}</span>
              <span className="mt-0.5 block text-[0.8125rem] leading-snug text-mut">{r.sub}</span>
            </span>
          );
          return (
            <div key={r.id}>
              <div className="flex min-h-[3.5rem] items-center gap-3 px-4">
                {r.id === "gemini" ? (
                  <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 text-left">
                    {main}
                  </button>
                ) : (
                  main
                )}
                <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">{val}</span>
                <Btn kind="line" small href={r.href} target="_blank" rel="noreferrer">
                  {r.btn}
                </Btn>
              </div>
              {r.id === "gemini" && open && <UsageDetail data={data} />}
            </div>
          );
        })}
        <div className="flex items-center justify-between px-4 py-3 text-[0.9375rem] font-semibold">
          <span>Toplam · bu ay</span>
          <span className="tabular-nums">≈ {tlText(total)}</span>
        </div>
      </Group>
      <p className="mt-2 px-1 text-[0.75rem] text-mut">Tahmini; gerçek tutar servisin faturasında.</p>
    </>
  );
}
