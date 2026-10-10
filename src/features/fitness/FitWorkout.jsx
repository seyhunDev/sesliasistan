"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { exById } from "@/lib/fitness/exercises";
import { FEELS, cleanRes, itemLine, resLine, statusOf, STATUS, targetFor } from "@/lib/fitness/model";
import { todayStr } from "@/lib/utils/format";

// Fitness planının ekranında (AddSheet): antrenman. Her hareketin setleri tek tek işaretlenir (yapılan tekrar, kilo, süre);
// önerilen değer hazır gelir (geçen sefer bütün setler tamamsa biraz artırılmış; targetFor). Set işaretlenince dinlenme sayacı.
// Sonuç planın fit.res alanına yazılır (her işaretlemede); "Antrenmanı bitir" yapıldı, "Atladım" atlandı yapar.
// Sesle de: "squat 3 set 10 tekrar 60 kilo yaptım", "bugünkü antrenmanı yaptım" (ana asistan, bu plana yazar).
const box = "rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";
const inp = "h-9 w-full min-w-0 rounded-lg bg-bg px-1 text-center text-[0.9375rem] tabular-nums outline-none";
const n = (v) => (v === "" || v == null ? "" : String(v).replace(",", "."));

// Formdaki setler: kayıtlı sonuç, yoksa hedeften
function startSets(fit, plans, date) {
  return (fit.items || []).map((it, i) => {
    const saved = fit.res?.ex?.[i]?.sets;
    if (saved?.length) return saved.map((s) => ({ reps: s.reps ?? "", kg: s.kg ?? "", sec: s.sec ?? "", min: s.min ?? "", ok: !!s.ok }));
    const t = targetFor(it, plans, date);
    return Array.from({ length: it.sets || 1 }, () => ({ reps: t.reps || "", kg: t.kg || "", sec: t.sec || "", min: t.min || "", ok: false }));
  });
}

export function FitWorkout({ rec, by }) {
  const { plans, updateRecord } = useData();
  const toast = useToast();
  const fit = rec.fit || { items: [] };
  const today = todayStr();
  const st = statusOf(rec, today);
  const [sets, setSets] = useState(() => startSets(fit, plans, rec.date));
  const [mins, setMins] = useState(fit.res?.min || rec.durationMin || "");
  const [feel, setFeel] = useState(fit.res?.feel || 0);
  const [note, setNote] = useState(fit.res?.note || "");
  const [rest, setRest] = useState(null); // { end, total }
  const [now, setNow] = useState(0);
  const [edit, setEdit] = useState(!fit.res?.st);
  const tick = useRef(null);

  // Dinlenme sayacı: süre dolunca titreşir ve kapanır
  useEffect(() => {
    if (!rest) return;
    tick.current = setInterval(() => {
      const t = Date.now();
      if (t >= rest.end) {
        clearInterval(tick.current);
        navigator.vibrate?.([30, 60, 30]);
        setRest(null);
      } else setNow(t);
    }, 250);
    return () => clearInterval(tick.current);
  }, [rest]);
  const left = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0;
  const startRest = (sec) => {
    const t = Date.now();
    setNow(t);
    setRest({ end: t + sec * 1000, total: sec });
  };

  const resOf = (patch = {}) => cleanRes({ ...(fit.res || {}), ex: sets.map((s) => ({ sets: s })), min: mins, feel, note, ...patch }, fit.items || []);
  const save = (res) => updateRecord("plan", rec.id, { fit: { ...fit, res } }, by);

  function toggle(i, k) {
    const next = sets.map((s, a) => (a === i ? s.map((x, b) => (b === k ? { ...x, ok: !x.ok } : x)) : s));
    setSets(next);
    const on = next[i][k].ok;
    save(cleanRes({ ...(fit.res || {}), ex: next.map((s) => ({ sets: s })), st: fit.res?.st || "", at: fit.res?.at || new Date().toISOString() }, fit.items || []));
    const r = fit.items[i]?.rest || 60;
    if (on) startRest(r);
  }
  const setVal = (i, k, key, v) => setSets((p) => p.map((s, a) => (a === i ? s.map((x, b) => (b === k ? { ...x, [key]: n(v) } : x)) : s)));
  const addSet = (i) => setSets((p) => p.map((s, a) => (a === i ? [...s, { ...(s.at(-1) || {}), ok: false }] : s)));

  async function finish(stv) {
    // Bitir'de işaretlenmemiş ama değeri yazılmış setler yapılmış sayılmaz; hiçbiri işaretlenmediyse hepsi yapılmış sayılır
    const anyOk = sets.some((s) => s.some((x) => x.ok));
    const ex = stv === "done" && !anyOk ? sets.map((s) => ({ sets: s.map((x) => ({ ...x, ok: true })) })) : sets.map((s) => ({ sets: s }));
    const res = resOf({ st: stv, ex, at: new Date().toISOString() });
    await save(res);
    setRest(null);
    setEdit(false);
    toast(stv === "done" ? "Antrenman kaydedildi" : "Atlandı olarak işaretlendi");
  }

  const done = sets.reduce((t, s) => t + s.filter((x) => x.ok).length, 0);
  const total = sets.reduce((t, s) => t + s.length, 0);

  if (!edit && fit.res?.st) {
    return (
      <div className={`${box} mt-3 p-4`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[0.75rem] font-bold ${fit.res.st === "done" ? "bg-acc/10 text-acc" : "bg-rec/10 text-rec"}`}>{STATUS[fit.res.st]}</span>
          <Link href="/fitness" className="text-[0.8125rem] font-semibold text-acc">
            Fitness
          </Link>
        </div>
        {fit.res.st === "done" && <p className="mt-2 text-[0.9375rem] leading-snug">{resLine(fit) || "Bütün hareketler"}</p>}
        <p className="mt-1 text-[0.8125rem] text-mut">{[fit.res.min && `${fit.res.min} dk`, fit.res.feel && FEELS.find(([k]) => k === fit.res.feel)?.[1], fit.res.note].filter(Boolean).join(" · ")}</p>
        <button type="button" onClick={() => setEdit(true)} className="mt-3 h-10 w-full rounded-xl bg-bg text-[0.875rem] font-semibold">
          Düzenle
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[0.75rem] font-bold tracking-[.08em] text-mut">ANTRENMAN · {STATUS[st].toLocaleUpperCase("tr-TR")}</span>
        <span className="text-[0.8125rem] tabular-nums text-mut">
          {done}/{total} set
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/60">
        <div className="h-full rounded-full bg-acc transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      {(fit.items || []).map((it, i) => {
        const ex = exById(it.ex);
        const t = targetFor(it, plans, rec.date);
        const s = sets[i] || [];
        const key = it.kind === "time" ? "sec" : it.kind === "cardio" ? "min" : "reps";
        const unit = it.kind === "time" ? "sn" : it.kind === "cardio" ? "dk" : "tekrar";
        const all = s.length > 0 && s.every((x) => x.ok);
        return (
          <section key={i} className={`${box} mt-3 p-3.5`}>
            <div className="flex items-start gap-2">
              <span className="min-w-0 flex-1">
                <b className={`block text-[0.96875rem] font-semibold ${all ? "text-acc" : ""}`}>{it.name}</b>
                <small className="block text-[0.8125rem] text-mut">
                  Hedef {itemLine(it)}
                  {t.up && <span className="ml-1 font-semibold text-acc">↑ geçen sefere göre artırıldı</span>}
                </small>
                {ex?.how && <small className="mt-0.5 block text-[0.75rem] leading-snug text-mut/80">{ex.how}</small>}
              </span>
              {all && <Icon name="check" className="mt-0.5 size-5 text-acc" />}
            </div>
            <div className="mt-2 space-y-1.5">
              {s.map((x, k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-9 shrink-0 text-[0.75rem] font-semibold text-mut">Set {k + 1}</span>
                  <label className="flex min-w-0 flex-1 items-center gap-1">
                    <input inputMode="numeric" aria-label={unit} value={x[key]} onChange={(e) => setVal(i, k, key, e.target.value)} className={inp} />
                    <span className="w-10 shrink-0 text-[0.75rem] text-mut">{unit}</span>
                  </label>
                  {it.kind === "reps" && (
                    <label className="flex min-w-0 flex-1 items-center gap-1">
                      <input inputMode="decimal" aria-label="kilo" value={x.kg} onChange={(e) => setVal(i, k, "kg", e.target.value)} placeholder="–" className={inp} />
                      <span className="w-5 shrink-0 text-[0.75rem] text-mut">kg</span>
                    </label>
                  )}
                  <button
                    type="button"
                    aria-label={x.ok ? "Yapılmadı" : "Yapıldı"}
                    aria-pressed={x.ok}
                    onClick={() => toggle(i, k)}
                    className={`grid size-9 shrink-0 place-items-center rounded-full transition active:scale-90 ${x.ok ? "bg-acc text-white" : "border-2 border-line text-transparent"}`}
                  >
                    <Icon name="check" className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => addSet(i)} className="mt-1.5 text-[0.75rem] font-semibold text-acc">
              + Set
            </button>
          </section>
        );
      })}

      {rest && (
        <div className="sticky bottom-[calc(var(--rec-h,6rem)+0.5rem)] z-10 mt-3 flex items-center gap-3 rounded-2xl bg-deep px-4 py-3 text-white shadow-lg">
          <Icon name="clock" className="size-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] tabular-nums">Dinlen · {left} sn</b>
            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/20">
              <span className="block h-full rounded-full bg-white transition-all" style={{ width: `${(left / rest.total) * 100}%` }} />
            </span>
          </span>
          <button type="button" onClick={() => setRest((r) => ({ ...r, end: r.end + 15000, total: r.total + 15 }))} className="rounded-full bg-white/15 px-3 py-1.5 text-[0.8125rem] font-semibold">
            +15
          </button>
          <button type="button" onClick={() => setRest(null)} className="rounded-full bg-white/15 px-3 py-1.5 text-[0.8125rem] font-semibold">
            Geç
          </button>
        </div>
      )}

      <section className={`${box} mt-3 p-3.5`}>
        <div className="flex items-center gap-2">
          <label className="flex w-28 shrink-0 items-center gap-1 rounded-xl bg-bg pr-3">
            <input inputMode="numeric" value={mins} onChange={(e) => setMins(n(e.target.value))} aria-label="Süre" className="h-10 w-full min-w-0 bg-transparent px-3 text-[0.9375rem] tabular-nums outline-none" />
            <span className="text-[0.8125rem] text-mut">dk</span>
          </label>
          <div className="flex flex-1 gap-1.5">
            {FEELS.map(([k, l]) => (
              <button key={k} type="button" aria-pressed={feel === k} onClick={() => setFeel(feel === k ? 0 : k)} className={`h-10 flex-1 rounded-xl text-[0.8125rem] font-semibold ${feel === k ? "bg-acc text-white" : "bg-bg"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (isteğe bağlı)" className="mt-2 h-10 w-full min-w-0 rounded-xl bg-bg px-3 text-[0.9375rem] outline-none" />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => finish("skip")} className="h-11 rounded-xl bg-bg px-4 text-[0.9375rem] font-semibold text-mut">
            Atladım
          </button>
          <button type="button" onClick={() => finish("done")} className="h-11 flex-1 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98]">
            Antrenmanı bitir
          </button>
        </div>
      </section>
    </div>
  );
}
