"use client";

import { Icon } from "@/components/ui/Icon";

const box = "h-10 w-16 rounded-lg bg-bg px-2 text-center text-[0.9375rem] tabular-nums outline-none focus:ring-1 focus:ring-acc";

// Yarış başlayınca Sporcular sekmesinde: tekne sayısı ve her sporcunun sırası (isteğe bağlı kısa not: "ILCA 4 · 2. gün DNF").
// Sporcu kartında yarış geçmişi ve Instagram sonuç gönderisi buradan gelir.
export function RaceResults({ results, athletes, onChange }) {
  const res = results || { fleet: "", rows: {} };
  const put = (id, k, v) => onChange({ ...res, rows: { ...res.rows, [id]: { ...(res.rows?.[id] || {}), [k]: v } } });
  return (
    <section className="mt-4 rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <div className="flex items-center gap-2">
        <Icon name="flag" className="size-5 text-acc" />
        <b className="flex-1 text-[0.9375rem] font-semibold">Sonuçlar</b>
        <label className="flex items-center gap-2 text-[0.8125rem] text-mut">
          Tekne sayısı
          <input inputMode="numeric" value={res.fleet || ""} onChange={(e) => onChange({ ...res, fleet: e.target.value.replace(/\D/g, "") })} className={box} aria-label="Tekne sayısı" />
        </label>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {athletes.map((a) => (
          <li key={a.id} className="flex items-center gap-2 py-2">
            <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{a.studentName}</span>
            <input
              value={res.rows?.[a.id]?.note || ""}
              onChange={(e) => put(a.id, "note", e.target.value)}
              placeholder="not"
              aria-label={`${a.studentName} not`}
              className="h-10 w-24 rounded-lg bg-bg px-2 text-[0.8125rem] outline-none focus:ring-1 focus:ring-acc"
            />
            <input inputMode="numeric" value={res.rows?.[a.id]?.place || ""} onChange={(e) => put(a.id, "place", e.target.value.replace(/\D/g, ""))} placeholder="sıra" aria-label={`${a.studentName} sıra`} className={box} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.75rem] text-mut">Sıra sporcu kartında yarış geçmişine ve Instagram sonuç gönderisine gelir.</p>
    </section>
  );
}
