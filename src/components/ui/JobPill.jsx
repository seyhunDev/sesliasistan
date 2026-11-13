"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { jobClose, jobLine, leadJob, useJobs } from "@/lib/jobs";

// Tek iş göstergesi (Seyhun 2026-11-13, örnek "Velora iş göstergesi"): ekranın üstünde, çentiğin altında küçük lacivert hap.
// Hem kısa bildirim (toast) hem arka plan işleri (lib/jobs.js) burada; ekranda iki ayrı şey olmaz.
// Süren iş: dönen halka + işin adı + o anki adım + altta ince adım çizgisi; birden çok işte sayı.
// Bitti: yeşil ✓ + "Aç"; hata: kırmızı nokta + "Tekrar". Dokununca yerinde büyür, işler adım çizgileriyle listelenir.
// Hareket yalnız iş sürerken (CSS: .jb-*, globals.css); sayaç ya da saniye yok.

function Ic({ state }) {
  if (state === "done")
    return (
      <span className="jb-ic jb-ok" aria-hidden="true">
        <svg viewBox="0 0 16 16"><path d="M4 8.4l2.6 2.5L12 5.5" /></svg>
      </span>
    );
  if (state === "fail") return <span className="jb-ic jb-fail" aria-hidden="true"><i /></span>;
  return <span className="jb-ic jb-run" aria-hidden="true"><i /></span>;
}

// Adım çizgisi: çok adımlıda dolan çizgi, tek adımlıda akan çizgi
function Bar({ j, steps = false }) {
  if (j.state !== "run") return null;
  const n = j.steps.length;
  if (steps && n > 1)
    return (
      <span className="jb-steps">
        {j.steps.map((_, i) => <i key={i} className={i < j.step ? "d" : i === j.step ? "c" : ""} />)}
      </span>
    );
  const pct = n > 1 ? ((j.step + (j.total ? j.got / j.total : 0)) / n) * 100 : 0;
  return (
    <span className={`jb-pg ${n > 1 ? "" : "jb-flow"}`}>
      <i style={n > 1 ? { width: `${Math.max(6, pct)}%` } : undefined} />
    </span>
  );
}

export function JobPill({ note: noteIn, onNote, onHide, jobs: withJobs = true }) {
  let note = noteIn;
  let lead;
  const router = useRouter();
  const all = useJobs();
  const jobs = withJobs ? all : [];
  const [open, setOpen] = useState(false);
  // Kaybolurken içerik boşalmasın: son görünen bildirim / iş tutulur
  const live = { note, lead: leadJob(jobs) };
  const on = !!live.note || !!live.lead;
  const [last, setLast] = useState(live);
  if (on && (last.note !== live.note || last.lead !== live.lead)) setLast(live);
  ({ note, lead } = on ? live : last);
  const shown = open && jobs.length > 0;

  const go = (j) => {
    jobClose(j.id);
    setOpen(false);
    if (j.state === "fail") j.retry?.();
    else if (j.href) router.push(j.href);
  };
  const btn = (j) => (j.state === "done" && j.href ? "Aç" : j.state === "fail" && j.retry ? "Tekrar" : "");

  const right = note ? (
    note.action && (
      <button type="button" onClick={onNote} className="jb-act">
        {note.action.label}
      </button>
    )
  ) : lead && btn(lead) ? (
    <button type="button" onClick={(e) => (e.stopPropagation(), go(lead))} className="jb-act">
      {btn(lead)}
    </button>
  ) : jobs.length > 1 ? (
    <span className="jb-n num">{jobs.length}</span>
  ) : null;

  return (
    <>
      {shown && <button type="button" aria-label="Kapat" className="fixed inset-0 z-[89] cursor-default" onClick={() => setOpen(false)} />}
      <div className={`jb ${on ? "jb-on" : ""}`} role="status" aria-live="polite" data-toast>
        {shown ? (
          <div className="jb-panel">
            {jobs.map((j) => (
              <div key={j.id} className="jb-row">
                <Ic state={j.state} />
                <span className="min-w-0">
                  <b className="block truncate">{j.name}</b>
                  <span className="jb-sub block truncate">{jobLine(j)}</span>
                </span>
                {btn(j) ? (
                  <button type="button" onClick={() => go(j)} className="jb-act">
                    {btn(j)}
                  </button>
                ) : (
                  <span className="jb-x num">{j.state === "run" && j.steps.length > 1 ? `${Math.min(j.step + 1, j.steps.length)}/${j.steps.length}` : ""}</span>
                )}
                <Bar j={j} steps />
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`jb-pill ${note ? "jb-note" : ""}`}
            onClick={() => (note ? onHide?.() : jobs.length && setOpen(true))}
          >
            {note ? (
              <span key={`n${note.n}`} className="jb-tx jb-in truncate py-0.5 font-medium">{note.msg}</span>
            ) : lead ? (
              <>
                <Ic state={lead.state} />
                <span className="jb-tx">
                  <b className="truncate">{lead.name}</b>
                  <span key={`${lead.id}-${lead.state}-${lead.step}-${lead.text}`} className="jb-sub jb-in truncate">{jobLine(lead)}</span>
                </span>
              </>
            ) : null}
            {right}
            {!note && lead && <Bar j={lead} />}
          </div>
        )}
      </div>
    </>
  );
}
