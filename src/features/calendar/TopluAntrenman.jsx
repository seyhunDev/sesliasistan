"use client";

import "./toplu.css";
import { useMemo, useState } from "react";
import { Sheet, SheetActions, SheetTone } from "@/components/ui/Sheet";
import { useData } from "@/features/data/DataProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { todayStr } from "@/lib/utils/format";
import { KimlerPick, useKimler } from "./Kimler";
import { audLabel } from "@/lib/kimler";
import { WEEKDAYS, bulkDrafts, bulkPlan, bulkSummary, monthLabel, monthsAhead } from "@/lib/topluAntrenman";

// Toplu antrenman penceresi (Seyhun 2026-11-26; örnek project-files/toplu-antrenman/ornek.html):
// aylar · Hafta sonu / Hafta içi / Gün seç · "Bayram ve resmi tatiller de" · saat · ad · yer → "N antrenman ekle".
// Ekledikten sonra "Geri al" bütün seriyi siler. Kurallar lib/topluAntrenman.js. prefill: sesli asistandan (bulkCommand).
const MODES = [
  ["weekend", "Hafta sonu"],
  ["weekday", "Hafta içi"],
  ["days", "Gün seç"],
];
export function TopluAntrenman({ open, onClose, prefill, month }) {
  const { plans, saveDrafts, deleteSeries } = useData();
  const toast = useToast();
  const { profile } = useAuth();
  const today = todayStr();
  const all = useMemo(() => monthsAhead(today, 13), [today]);
  const [f, setF] = useState(() => ({
    months: prefill?.months?.length ? prefill.months.filter((m) => all.includes(m)) : [month && month >= today.slice(0, 7) ? month : today.slice(0, 7)],
    mode: prefill?.mode || "weekend",
    days: prefill?.days || [],
    holidays: !!prefill?.holidays,
    time: prefill?.time || "10:30",
    endTime: prefill?.endTime || "",
    title: prefill?.title || "Antrenman",
    place: prefill?.place || "",
    aud: prefill?.aud || null,
  }));
  const kim = useKimler();
  const put = (p) => setF((x) => ({ ...x, ...p }));
  const flip = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const r = useMemo(() => bulkPlan({ ...f, from: today }, plans), [f, plans, today]);
  const sum = bulkSummary(r);
  const n = r.add.length;

  const save = async () => {
    if (!n) return;
    const res = await saveDrafts(bulkDrafts(r.add, { ...f, audUids: f.aud ? kim.uidsOf(f.aud) : null }), { source: "manual", by: { name: profile?.name ?? "Kullanıcı" } });
    if (res.error) return;
    onClose();
    const sid = res.seriesId;
    navigator.vibrate?.(10);
    toast(`${n} antrenman eklendi${f.aud ? ` · ${audLabel(f.aud)}` : ""}`, sid ? { duration: 8000, action: { label: "Geri al", onClick: () => deleteSeries(sid, "").then((k) => k && toast("Geri alındı")) } } : undefined);
  };

  return (
    <SheetTone.Provider value="sahne">
      <Sheet open={open} onClose={onClose} title="Toplu antrenman" footer={<SheetActions onCancel={onClose} yes={n ? `${n} antrenman ekle` : "Ekle"} onYes={save} disabled={!n} />}>
        <div className="tb">
          <div>
            <div className="tb-k">Aylar</div>
            <div className="tb-chips">
              {all.map((m) => (
                <button key={m} type="button" data-press aria-pressed={f.months.includes(m)} className="tb-chip" onClick={() => put({ months: flip(f.months, m) })}>
                  {monthLabel(m)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="tb-k">Günler</div>
            <div className="tb-seg" role="radiogroup">
              {MODES.map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={f.mode === k} onClick={() => put({ mode: k })}>
                  {l}
                </button>
              ))}
            </div>
            {f.mode === "days" && (
              <div className="tb-chips mt-2">
                {WEEKDAYS.map(([d, l]) => (
                  <button key={d} type="button" data-press aria-pressed={f.days.includes(d)} className="tb-chip" onClick={() => put({ days: flip(f.days, d) })}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <KimlerPick value={f.aud} onChange={(aud) => put({ aud })} classes={kim.classes} />
          <button type="button" role="switch" aria-checked={f.holidays} className="tb-row" onClick={() => put({ holidays: !f.holidays })}>
            <span>Bayram ve resmi tatiller de</span>
            <i className="tb-tg" />
          </button>
          <div className="tb-row">
            <span>Saat</span>
            <span className="tb-tm">
              <input type="time" aria-label="Başlama saati" value={f.time} onChange={(e) => put({ time: e.target.value })} />
              <span>–</span>
              <input type="time" aria-label="Bitiş saati" value={f.endTime} onChange={(e) => put({ endTime: e.target.value })} />
            </span>
          </div>
          <label className="tb-row">
            <span>Ad</span>
            <input value={f.title} onChange={(e) => put({ title: e.target.value })} maxLength={80} />
          </label>
          <label className="tb-row">
            <span>Yer</span>
            <input value={f.place} onChange={(e) => put({ place: e.target.value })} maxLength={80} />
          </label>
          <div className="tb-sum" aria-live="polite">
            <b>{sum.head}</b>
            {sum.sub && <small>{sum.sub}</small>}
          </div>
        </div>
      </Sheet>
    </SheetTone.Provider>
  );
}
