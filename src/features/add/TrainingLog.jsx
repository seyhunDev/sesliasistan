"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { DIRS, RATINGS, TOPICS, canLog, cleanLog, logLine } from "@/lib/trainingLog";
import { todayStr } from "@/lib/utils/format";

// Antrenman planının ekranında: "Antrenman günlüğü" (rüzgâr, yön, çalışılan konular, süre, nasıl geçti, not).
// Plan kaydının log alanına yazılır; kişilere bildirim gitmez. Ay özeti Sporcular › Antrenman günlüğü.
export function TrainingLog({ rec, by }) {
  const { updateRecord } = useData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(() => ({ wind: "", dir: "", topics: [], min: rec.durationMin || "", rating: null, note: "", ...(rec.log || {}) }));
  if (!canLog(rec, todayStr())) return null;
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (t) => set("topics", f.topics.includes(t) ? f.topics.filter((x) => x !== t) : [...f.topics, t]);

  async function save() {
    const log = cleanLog(f);
    await updateRecord("plan", rec.id, { log }, by);
    setOpen(false);
    toast(log ? "Günlük kaydedildi" : "Günlük silindi");
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-[.99]">
        <Icon name="book" className={`size-5 shrink-0 ${rec.log ? "text-acc" : "text-mut"}`} />
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] font-medium">Antrenman günlüğü</b>
          <small className="block truncate text-[0.8125rem] text-mut">{rec.log ? logLine(rec.log) || "Not yazıldı" : "Rüzgâr, çalışılan konular, not"}</small>
        </span>
        <Icon name="chev" className="size-4 text-mut" />
      </button>
    );
  }

  const chip = (on) => `rounded-full px-3 py-1.5 text-[0.8125rem] font-medium active:scale-95 ${on ? "bg-acc text-white" : "bg-bg"}`;
  return (
    <div className="mt-3 rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <div className="flex items-center justify-between">
        <p className="text-[0.9375rem] font-semibold">Antrenman günlüğü</p>
        <Link href="/training" className="text-[0.8125rem] font-semibold text-acc">Tümü</Link>
      </div>
      <div className="mt-3 flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-xl bg-bg px-3">
          <Icon name="wind" className="size-4 text-mut" />
          <input inputMode="numeric" value={f.wind ?? ""} onChange={(e) => set("wind", e.target.value)} placeholder="Rüzgâr" className="h-10 w-full bg-transparent text-[0.9375rem] outline-none" />
          <span className="text-[0.8125rem] text-mut">kn</span>
        </label>
        <label className="flex flex-1 items-center gap-2 rounded-xl bg-bg px-3">
          <Icon name="clock" className="size-4 text-mut" />
          <input inputMode="numeric" value={f.min ?? ""} onChange={(e) => set("min", e.target.value)} placeholder="Süre" className="h-10 w-full bg-transparent text-[0.9375rem] outline-none" />
          <span className="text-[0.8125rem] text-mut">dk</span>
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DIRS.map((d) => (
          <button key={d} type="button" onClick={() => set("dir", f.dir === d ? "" : d)} className={chip(f.dir === d)}>{d}</button>
        ))}
      </div>
      <p className="mt-3 text-[0.8125rem] font-semibold text-mut">Çalışılanlar</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {[...TOPICS, ...f.topics.filter((t) => !TOPICS.includes(t))].map((t) => (
          <button key={t} type="button" onClick={() => toggle(t)} className={chip(f.topics.includes(t))}>{t}</button>
        ))}
      </div>
      <div className="mt-3 flex gap-1.5">
        {RATINGS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => set("rating", f.rating === k ? null : k)} className={`flex-1 ${chip(f.rating === k)}`}>{l}</button>
        ))}
      </div>
      <textarea value={f.note} onChange={(e) => set("note", e.target.value)} rows={3} placeholder="Not: kim ne yaptı, sonraki antrenmanda ne çalışılacak…" className="mt-3 w-full resize-none rounded-xl bg-bg px-3 py-2.5 text-[0.9375rem] leading-snug outline-none" />
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={save} className="h-11 flex-1 rounded-full bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98]">Kaydet</button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Vazgeç" className="grid size-11 place-items-center rounded-full text-mut active:scale-95">
          <Icon name="x" className="size-5" />
        </button>
      </div>
    </div>
  );
}
