"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { addDays } from "@/lib/fitness/model";
import { TEMPLATES } from "@/lib/fitness/templates";
import { REPORT_CSS, cleanReview, cleanTrack, planSummary, reportHtml, reviewFilled, rowKind, valueText, weekLabel, weekOf, weekPlans } from "@/lib/fitness/review";
import { loadReviews, saveReview } from "./fitnessData";

// Sporcunun haftalık değerlendirmesi (Fitness › Sporcular › sporcu › Değerlendirme): hafta seçilir (Pzt–Paz),
// üstte o haftanın antrenmanları ve sonuçları, altında programın takip listesi ve pazar soruları; her hafta ayrı kayıt.
// Yazdır: bu haftanın antrenmanları, bütün antrenmanlar, değerlendirme (biri ya da hepsi).
const FALLBACK = TEMPLATES[0]?.prog?.review || { rows: [], ask: [] };
const FEEL = ["", "Zor", "İyi", "Kolay"];

export function FitReview({ orgId, uid, name, meta = "", prog, plans = [], today, onBack }) {
  const toast = useToast();
  const { profile } = useAuth();
  const [report, setReport] = useState("");
  const [week, setWeek] = useState(() => weekOf(today));
  const [list, setList] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [pick, setPick] = useState({ week: true, all: false, review: true });

  useEffect(() => {
    let live = true;
    loadReviews(orgId, uid)
      .then((l) => live && setList(l))
      .catch(() => live && setList([]));
    return () => {
      live = false;
    };
  }, [orgId, uid]);

  // Haftanın kaydı varsa o; yoksa programın takip listesi (yoksa son değerlendirmenin listesi, o da yoksa hazır programınki)
  const saved = list?.find((r) => r.week === week) || null;
  const track = cleanTrack(prog?.review) || cleanTrack(list?.[0]) || FALLBACK;
  const base = saved ? cleanReview(saved, saved) : cleanReview({ for: uid, forName: name, prog: prog?.id, week }, track);
  const rev = draft?.week === week ? draft : base;
  const edit = (f) => {
    setDraft(f(rev));
    setDirty(true);
  };
  const go = (n) => {
    setDraft(null);
    setDirty(false);
    setWeek(addDays(week, 7 * n));
  };

  const items = weekPlans(plans, week).map((p) => planSummary(p, today));
  const done = items.filter((x) => x.st === "done").length;

  async function save() {
    setBusy(true);
    try {
      const r = await saveReview(orgId, { ...rev, for: uid, forName: name, prog: prog?.id || rev.prog, createdAt: saved?.createdAt });
      setList((l) => [r, ...(l || []).filter((x) => x.week !== r.week)].sort((a, b) => b.week.localeCompare(a.week)));
      setDirty(false);
      toast("Değerlendirme kaydedildi");
      return true;
    } catch {
      toast("Kaydedilemedi, tekrar dene");
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Rapor uygulamanın içinde açılır (yeni pencere ana ekran uygulamasında kapanmıyordu); Kapat ve Yazdır üstte
  async function print() {
    if (pick.review && dirty && !(await save())) return;
    setPrintOpen(false);
    setReport(reportHtml({ name, prog, plans, review: cleanReview(rev, rev), week, pick, today, coach: profile?.coach?.name || profile?.name || "", meta }));
  }

  const inp = "w-16 rounded-xl bg-bg px-2 py-2 text-right text-[0.9375rem] tabular-nums outline-none";
  return (
    <>
      <div className="sticky top-0 z-10 -mx-5 mb-3 flex items-center gap-2.5 bg-bg/90 px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button type="button" aria-label="Geri" onClick={onBack} className="grid size-11 shrink-0 place-items-center rounded-full bg-card shadow-[0_1px_3px_rgba(38,40,44,.08)]">
          <Icon name="back" className="size-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-semibold">Değerlendirme</h1>
      </div>

      <div className={`${card} flex items-center gap-2 p-2`}>
        <button type="button" aria-label="Önceki hafta" onClick={() => go(-1)} className="grid size-10 place-items-center rounded-full text-mut">
          <Icon name="back" className="size-5" />
        </button>
        <span className="min-w-0 flex-1 text-center">
          <b className="block text-[1rem] font-semibold">{weekLabel(week)}</b>
          <small className="text-[0.8125rem] text-mut">{[name, saved ? "kaydedildi" : ""].filter(Boolean).join(" · ")}</small>
        </span>
        <button type="button" aria-label="Sonraki hafta" disabled={week >= weekOf(today)} onClick={() => go(1)} className="grid size-10 rotate-180 place-items-center rounded-full text-mut disabled:opacity-30">
          <Icon name="back" className="size-5" />
        </button>
      </div>

      <h2 className="mt-5 text-[1rem] font-semibold">
        Antrenmanlar <span className="font-normal text-mut">{items.length ? `${done} / ${items.length}` : ""}</span>
      </h2>
      {items.length ? (
        <ul className={`${card} mt-1.5 divide-y divide-line overflow-hidden`}>
          {items.map((s) => (
            <li key={s.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-[4.5rem] shrink-0 text-[0.8125rem] text-mut">{s.day}</span>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{s.name}</span>
                <span className={`shrink-0 text-[0.8125rem] font-semibold ${s.st === "done" ? "text-acc" : s.st === "missed" ? "text-rec" : "text-mut"}`}>{s.status}</span>
              </div>
              {s.rows.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 pl-[5.25rem] text-[0.8125rem] leading-snug">
                  {s.rows.map((x, i) => (
                    <li key={i}>
                      {x.name} <span className="text-mut">· {x.line}</span>
                      {x.sets && <span className="block text-mut">{x.sets}</span>}
                    </li>
                  ))}
                  {(s.min > 0 || s.feel > 0) && <li className="text-mut">{[s.min ? `${s.min} dk` : "", FEEL[s.feel]].filter(Boolean).join(" · ")}</li>}
                  {s.note && <li className="text-mut">Not: {s.note}</li>}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[0.875rem] text-mut">Bu hafta antrenman yok.</p>
      )}

      {rev.rows.length > 0 && (
        <>
          <h2 className="mt-5 text-[1rem] font-semibold">Haftalık takip</h2>
          <ul className={`${card} mt-1.5 divide-y divide-line overflow-hidden`}>
            {rev.rows.map((x, i) => {
              const k = rowKind(x.unit);
              const set = (v) => edit((r) => ({ ...r, rows: r.rows.map((y, j) => (j === i ? { ...y, v } : y)) }));
              return (
                <li key={x.label} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-medium">{x.label}</span>
                    {x.goal && <small className="block text-[0.8125rem] leading-snug text-mut">{x.goal}</small>}
                  </span>
                  {k.yn ? (
                    <span className="flex shrink-0 gap-1">
                      {[["e", "Evet"], ["h", "Hayır"]].map(([v, t]) => (
                        <button key={v} type="button" onClick={() => set(x.v === v ? "" : v)} className={`h-9 rounded-full px-3 text-[0.8125rem] font-semibold ${x.v === v ? "bg-acc text-white" : "bg-bg text-mut"}`}>
                          {t}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1.5 text-[0.875rem] text-mut">
                      <input
                        inputMode="decimal"
                        value={x.v === "" || x.v == null ? "" : String(x.v).replace(".", ",")}
                        onChange={(e) => set(e.target.value.replace(/[^\d,.]/g, ""))}
                        onBlur={() => set(cleanReview({ ...rev }, rev).rows[i]?.v ?? "")}
                        className={inp}
                        aria-label={x.label}
                      />
                      <span className="w-10">{k.of ? `/ ${k.of}` : k.unit}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {rev.ask.length > 0 && (
        <>
          <h2 className="mt-5 text-[1rem] font-semibold">Pazar geri bildirimi</h2>
          <div className={`${card} mt-1.5 space-y-3 p-4`}>
            {rev.ask.map((x, i) => (
              <label key={x.q} className="block">
                <span className="text-[0.875rem] font-medium leading-snug">{x.q}</span>
                <textarea
                  value={x.a}
                  rows={2}
                  maxLength={600}
                  onChange={(e) => edit((r) => ({ ...r, ask: r.ask.map((y, j) => (j === i ? { ...y, a: e.target.value } : y)) }))}
                  className="mt-1 w-full resize-y rounded-2xl bg-bg px-3 py-2 text-[0.9375rem] leading-snug outline-none"
                />
              </label>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-5 text-[1rem] font-semibold">Antrenör notu</h2>
      <textarea
        value={rev.note}
        rows={3}
        maxLength={1500}
        onChange={(e) => edit((r) => ({ ...r, note: e.target.value }))}
        className={`${card} mt-1.5 w-full resize-y px-4 py-3 text-[0.9375rem] leading-snug outline-none`}
      />

      {list && list.length > 0 && (
        <>
          <h2 className="mt-5 text-[1rem] font-semibold">Önceki değerlendirmeler</h2>
          <ul className={`${card} mt-1.5 divide-y divide-line overflow-hidden`}>
            {list.map((r) => (
              <li key={r.week}>
                <button type="button" onClick={() => (setDraft(null), setDirty(false), setWeek(r.week))} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className={`min-w-0 flex-1 text-[0.9375rem] ${r.week === week ? "font-semibold text-acc" : "font-medium"}`}>{weekLabel(r.week)}</span>
                  <span className="shrink-0 truncate text-[0.8125rem] text-mut">
                    {r.rows
                      ?.filter((x) => valueText(x))
                      .slice(0, 2)
                      .map((x) => `${x.label} ${valueText(x)}`)
                      .join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="sticky bottom-[calc(var(--stage-h,6rem)+0.5rem)] mt-4 flex gap-2">
        <Button variant="secondary" onClick={() => setPrintOpen(true)} className="flex-1">
          Yazdır
        </Button>
        <Button onClick={save} loading={busy} disabled={!dirty && !!saved} className="flex-1">
          {saved && !dirty ? "Kaydedildi" : "Kaydet"}
        </Button>
      </div>

      <Sheet open={printOpen} onClose={() => setPrintOpen(false)} title="Yazdır">
        {[
          ["week", `Bu haftanın antrenmanları · ${weekLabel(week)}`],
          ["all", "Bütün antrenmanlar"],
          ["review", reviewFilled(rev) ? "Değerlendirme" : "Değerlendirme (boş form)"],
        ].map(([k, t]) => (
          <button key={k} type="button" onClick={() => setPick((p) => ({ ...p, [k]: !p[k] }))} className="flex w-full items-center gap-3 border-b border-line py-3.5 text-left last:border-0">
            <span className={`grid size-6 shrink-0 place-items-center rounded-md border ${pick[k] ? "border-acc bg-acc text-white" : "border-line"}`}>{pick[k] && <Icon name="check" className="size-4" />}</span>
            <span className="text-[0.9375rem]">{t}</span>
          </button>
        ))}
        <Button onClick={print} disabled={!pick.week && !pick.all && !pick.review} loading={busy} className="mt-3">
          Yazdır
        </Button>
      </Sheet>
      {report && <Report html={report} onClose={() => setReport("")} />}
    </>
  );
}

// Tam ekran rapor: body'nin doğrudan altında; yazdırırken yalnız rapor çıkar (sayfanın geri kalanı gizlenir)
function Report({ html, onClose }) {
  return createPortal(
    <div id="fit-report" className="fixed inset-0 z-[80] flex flex-col bg-[#e9ebe7]">
      <style>{`${REPORT_CSS}
@media print{body>*:not(#fit-report){display:none!important}#fit-report{position:static!important;display:block!important;background:#fff!important}#fit-report .bar{display:none!important}#fit-report .scroll{overflow:visible!important}.fr{padding:0;max-width:none}@page{margin:14mm}}`}</style>
      <div className="bar flex items-center gap-2 bg-card px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-sm">
        <button type="button" onClick={onClose} className="h-10 rounded-full bg-bg px-4 text-[0.9375rem] font-semibold">
          Kapat
        </button>
        <span className="flex-1" />
        <button type="button" onClick={() => window.print()} className="h-10 rounded-full bg-acc px-5 text-[0.9375rem] font-semibold text-white">
          Yazdır
        </button>
      </div>
      <div className="scroll min-h-0 flex-1 overflow-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="fr rounded-xl shadow-sm" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>,
    document.body,
  );
}
