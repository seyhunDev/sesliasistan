"use client";

import "./toplu.css";
import { useCallback, useMemo, useState } from "react";
import { Sheet, SheetActions, SheetTone } from "@/components/ui/Sheet";
import { PdfViewer } from "@/components/ui/PdfViewer";
import { useData } from "@/features/data/DataProvider";
import { todayStr } from "@/lib/utils/format";
import { monthLabel, monthsAhead } from "@/lib/topluAntrenman";
import { monthOf, parentTrainings, periodTitle } from "@/lib/veliTakvimi";

// Veli takvimi (Seyhun 2026-11-26; örnek project-files/toplu-antrenman/ornek.html): aylar · başlık · not → "PDF hazırla".
// PDF görüntüleyicide Paylaş: iPhone paylaşım penceresi (Mail, WhatsApp, Dosyalar). Çizim veliPdf.js, veri lib/veliTakvimi.js.
// Son yazılan başlık ve not bu cihazda hatırlanır (yalnız kolaylık).
const KEY = "sa-veli-takvim";
const saved = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};
export function VeliTakvimi({ open, onClose, month, prefill }) {
  const { plans } = useData();
  const today = todayStr();
  const all = useMemo(() => monthsAhead(today, 13), [today]);
  const [f, setF] = useState(() => {
    const s = saved();
    const start = month && all.includes(month) ? month : today.slice(0, 7);
    const i = all.indexOf(start);
    return { months: prefill?.months?.length ? prefill.months.filter((m) => all.includes(m)) : all.slice(i, i + 3), title: s.title || "", note: s.note || "" };
  });
  const [view, setView] = useState(false);
  const put = (p) => setF((x) => ({ ...x, ...p }));
  const flip = (m) => put({ months: f.months.includes(m) ? f.months.filter((x) => x !== m) : [...f.months, m] });
  const months = useMemo(() => [...f.months].sort(), [f.months]);
  const n = useMemo(() => parentTrainings(plans, months).length, [plans, months]);
  const hol = useMemo(() => months.reduce((a, ym) => a + monthOf(ym).notes.filter((x) => !x.half).length, 0), [months]);

  const make = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ title: f.title, note: f.note }));
    } catch {}
    setView(true);
  };
  const load = useCallback(async () => {
    const [{ buildParentPdf }, { loadFonts }] = await Promise.all([import("./veliPdf"), import("@/features/athletes/raceDocs")]);
    return buildParentPdf({ plans, months, title: f.title.trim(), note: f.note.trim() }, await loadFonts());
    // PDF bir kez hazırlanır (açıkken veri değişse de yeniden çizilmez)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <>
      <SheetTone.Provider value="sahne">
        <Sheet open={open && !view} onClose={onClose} title="Veli takvimi" footer={<SheetActions onCancel={onClose} yes="PDF hazırla" onYes={make} disabled={!months.length} />}>
          <div className="tb">
            <div>
              <div className="tb-k">Aylar</div>
              <div className="tb-chips">
                {all.map((m) => (
                  <button key={m} type="button" data-press aria-pressed={f.months.includes(m)} className="tb-chip" onClick={() => flip(m)}>
                    {monthLabel(m)}
                  </button>
                ))}
              </div>
            </div>
            <label className="tb-row">
              <span>Başlık</span>
              <input value={f.title} onChange={(e) => put({ title: e.target.value })} placeholder="Optimist grubu" maxLength={40} />
            </label>
            <label className="tb-row tb-note">
              <span>Not</span>
              <textarea value={f.note} onChange={(e) => put({ note: e.target.value })} placeholder="Yer, iletişim…" rows={3} maxLength={300} />
            </label>
            <div className="tb-sum" aria-live="polite">
              <b>{periodTitle(months) || "Ay seç"}</b>
              {months.length > 0 && <small>{`${n} antrenman · ${hol} tatil`}</small>}
            </div>
          </div>
        </Sheet>
      </SheetTone.Provider>
      {view && (
        <PdfViewer
          title="Veli takvimi"
          load={load}
          onClose={() => {
            setView(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
