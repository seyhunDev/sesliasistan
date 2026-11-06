"use client";

// Ortak gün gezintisi (Seyhun 2026-11-04 "bugün seçili, yarın / sonraki gün ileri geri"): ‹ Dün · Bugün · Sal 4 Kas · Yarın ›. Hava sayfası ve yarış havası aynı satırı kullanır.
// Gün adı: bugüne göre Dün / Bugün / Yarın, uzaktaysa tarih ("3 Kas")
const rel = (x, today) => {
  const k = Math.round((new Date(`${x}T12:00:00`) - new Date(`${today}T12:00:00`)) / 864e5);
  return k === 0 ? "Bugün" : k === 1 ? "Yarın" : k === -1 ? "Dün" : new Date(`${x}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
};
export function DayNav({ sel, days, today, onStep, light = false }) {
  const i = days.indexOf(sel);
  const prev = days[i - 1];
  const next = days[i + 1];
  // light: yarış sayfasının beyaz görünümü (2026-11-06); düğme yerine mavi yazı
  const btn = light ? "flex h-9 min-w-[5.5rem] items-center text-[0.875rem] font-medium text-acc last:justify-end" : "raised flex h-9 min-w-[5.5rem] items-center justify-center rounded-full border px-3 text-[0.875rem] font-semibold";
  return (
    <nav aria-label="Gün" className="mb-2.5 flex items-center justify-between gap-2">
      {prev ? <button type="button" data-press onClick={() => onStep(-1)} className={btn}>‹ {rel(prev, today)}</button> : <span className="min-w-[5.5rem]" />}
      <b aria-live="polite" className="min-w-0 truncate text-[0.9375rem] font-bold">
        {sel === today ? "Bugün · " : ""}
        {new Date(`${sel}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" })}
      </b>
      {next ? <button type="button" data-press onClick={() => onStep(1)} className={btn}>{rel(next, today)} ›</button> : <span className="min-w-[5.5rem]" />}
    </nav>
  );
}

