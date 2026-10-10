"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { card, Empty, Hero, HeroLabel, Label, Stat } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { todayStr } from "@/lib/utils/format";
import {
  DOWS, STATUS, addDays, bestText, cleanItem, cleanProgram, dowOf, fitPlans, itemLine, monthStats, programLine, records, resLine, statusOf, weekStats,
} from "@/lib/fitness/model";
import { FIT_PREVIEW, FIT_SAVED, activeOf, askFitness, deleteProgram, loadPrograms, removePlans, saveProfile, saveProgram, syncPlans, takeProgram, peekProgram } from "./fitnessData";
import { NewProgram, ProfileFields } from "./NewProgram";
import { ProgramEditor } from "./ProgramEditor";
import { BodyAsk, FitIntro } from "./FitIntro";
import { hasBody } from "@/lib/fitness/forecast";

// Fitness sayfası (yalnız ana hesap): bu hafta (yapılan/kalan, seri, süre), bugünkü antrenman, program (düzenle, planlara ekle),
// gelişim (hareket başına en iyi değer), bu ay, geçmiş. Takip planlardan hesaplanır (ek okuma yok); programlar tek sorgu.
// Program yapay zekayla hazırlanır (Program hazırla: günler, saat, hafta, süre, profil) ya da asistana söylenir; önizlemede açılır.
const DOT = { done: "bg-acc text-white", skip: "bg-rec/15 text-rec", missed: "bg-rec text-white", today: "bg-white text-deep", next: "bg-white/15 text-white" };
const CHIP = { done: "bg-acc/10 text-acc", skip: "bg-bg text-mut", missed: "bg-rec/10 text-rec", today: "bg-orange-500/10 text-orange-700", next: "bg-bg text-mut" };
const dayText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
// İlk antrenman: başlangıçtan sonraki ilk seçili gün (yeni programda başlangıç geçmişteyse bugün)
const fixStart = (p) => ({ ...p, start: p.start && (p.id || p.start >= todayStr()) ? p.start : todayStr() });

export function FitnessHome() {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const toast = useToast();
  const orgId = profile.orgId;
  const uid = profile.uid;
  const today = todayStr();
  const [list, setList] = useState(null);
  // Asistanın hazırladığı ve sayfa açılmadan önce bekleyen program: önizlemede açılır
  const [edit, setEdit] = useState(() => {
    const p = peekProgram();
    return p ? { prog: fixStart(p), fresh: !p.id, k: 1 } : null;
  }); // { prog, fresh, k }
  const [busy, setBusy] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [profOpen, setProfOpen] = useState(false);
  const [bodyLater, setBodyLater] = useState(false);
  const [fitProf, setFitProf] = useState(profile.fit || {});

  const reload = useCallback(
    (force) =>
      loadPrograms(orgId, { force })
        .then(setList)
        .catch(() => setList([])),
    [orgId],
  );
  useEffect(() => {
    reload(false);
    const onSaved = () => reload(false);
    // Asistanın hazırladığı program: önizlemede açılır
    const onPreview = (e) => {
      takeProgram();
      if (e.detail) setEdit({ prog: fixStart(e.detail), fresh: !e.detail.id, k: Date.now() });
    };
    takeProgram();
    window.addEventListener(FIT_SAVED, onSaved);
    window.addEventListener(FIT_PREVIEW, onPreview);
    return () => {
      window.removeEventListener(FIT_SAVED, onSaved);
      window.removeEventListener(FIT_PREVIEW, onPreview);
    };
  }, [reload]);

  const prog = activeOf(list);
  const week = weekStats(plans, today);
  const month = monthStats(plans, today.slice(0, 7), today);
  const recs = records(plans);
  const all = fitPlans(plans);
  const todays = all.filter((p) => p.date === today);
  const nextOne = all.find((p) => p.date > today);
  const history = all.filter((p) => p.date < today || p.fit?.res?.st).reverse().slice(0, 12);
  const onCal = prog && all.filter((p) => p.fit?.prog === prog.id && p.date >= today).length;
  const open = (p) => openAdd({ edit: { kind: "plan", id: p.id } });

  async function save(p, withPlans) {
    setBusy(withPlans ? "plans" : "save");
    try {
      const saved = await saveProgram(orgId, uid, { ...p, active: true });
      let r = null;
      if (withPlans) r = await syncPlans(orgId, uid, saved, plans, { name: profile.name });
      setEdit(null);
      reload(false);
      toast(r ? `Kaydedildi · takvimde ${r.added} antrenman` : "Program kaydedildi");
    } catch (e) {
      toast(e.message || "Kaydedilemedi");
    } finally {
      setBusy("");
    }
  }

  async function ask(text, f, pre) {
    setBusy("ask");
    try {
      const pf = await saveProfile(uid, f).catch(() => f);
      setFitProf(pf);
      const r = await askFitness({ text, profile: pf });
      if (!r.program) throw new Error(r.message || "Program hazırlanamadı");
      // Seçilenler kesin: gün ve saatler formdakiyle aynı olsun
      const days = r.program.days.map((d) => ({ ...d, time: d.time || pre.time, min: d.min || pre.min }));
      setNewOpen(false);
      setEdit({ prog: fixStart({ ...r.program, days, weeks: pre.weeks, start: pre.start, note: r.program.note || r.message }), fresh: true, k: Date.now() });
    } catch (e) {
      toast(e.message || "Program hazırlanamadı");
    } finally {
      setBusy("");
    }
  }

  function blank(pre, f) {
    saveProfile(uid, f).then(setFitProf).catch(() => {});
    setNewOpen(false);
    const days = pre.days.map((dow) => ({ dow, time: pre.time, min: pre.min, name: "Antrenman", items: [cleanItem({ ex: "warmup", min: 5 }), cleanItem({ ex: "stretch", min: 5 })] }));
    setEdit({ prog: cleanProgram({ title: "Fitness programım", weeks: pre.weeks, start: pre.start, days }), fresh: true, k: Date.now() });
  }

  async function saveBody(f) {
    try {
      setFitProf(await saveProfile(uid, f));
      toast("Kaydedildi");
    } catch (e) {
      toast(e.message || "Kaydedilemedi");
    }
  }

  async function unplan() {
    setBusy("unplan");
    try {
      const n = await removePlans(orgId, prog, plans);
      toast(`Takvimden ${n} antrenman kaldırıldı`);
    } finally {
      setBusy("");
    }
  }
  async function drop() {
    if (!window.confirm("Program silinsin mi? Takvimdeki gelecek antrenmanları da kaldırılır; yapılanlar kalır.")) return;
    setBusy("drop");
    try {
      await removePlans(orgId, prog, plans);
      await deleteProgram(orgId, prog.id);
      toast("Program silindi");
    } finally {
      setBusy("");
    }
  }

  if (edit) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <PageHeader title={edit.fresh ? "Yeni program" : "Programı düzenle"} back="/fitness" />
        <ProgramEditor key={edit.k} prog={edit.prog} fresh={edit.fresh} busy={busy} onSave={save} onCancel={() => setEdit(null)} />
      </main>
    );
  }

  // Hiç programı ve fitness antrenmanı yoksa: tanıtım (kısa mesaj, boy/kilo, hedef kartları, adımlar)
  if (list && !list.length && !all.length) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <PageHeader title="Fitness" sub="Antrenman programın ve takibin" />
        <FitIntro name={profile.name} fit={fitProf} onStart={() => setNewOpen(true)} onSaveBody={saveBody} />
        <NewProgram key={newOpen ? "o" : "c"} open={newOpen} onClose={() => setNewOpen(false)} profile={fitProf} onAsk={ask} onBlank={blank} busy={busy === "ask"} />
      </main>
    );
  }

  const mon = addDays(today, 1 - dowOf(today));
  const strip = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(mon, i);
    const p = week.days.find((d) => d.date === date);
    return { date, dow: i + 1, st: p?.st || "", id: p?.id };
  });

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <PageHeader title="Fitness" sub={prog ? programLine(prog) : "Antrenman programın ve takibin"}>
        <button type="button" onClick={() => setProfOpen(true)} aria-label="Profil" className="grid size-10 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-90">
          <Icon name="user" className="size-5" />
        </button>
        <button type="button" onClick={() => setNewOpen(true)} aria-label="Program hazırla" className="grid size-10 place-items-center rounded-full bg-acc text-white shadow-[0_6px_14px_-8px_rgba(47,125,107,.9)] active:scale-90">
          <Icon name="plus" className="size-5" />
        </button>
      </PageHeader>

      {!hasBody(fitProf) && !bodyLater && <BodyAsk fit={fitProf} onSave={saveBody} onLater={() => setBodyLater(true)} className="mt-2" />}

      <Hero className="mt-2">
        <HeroLabel>BU HAFTA</HeroLabel>
        <div className="mt-1 flex items-end gap-2">
          <b className="text-[2.25rem] font-bold leading-none tabular-nums">
            {week.done}
            <span className="text-[1.25rem] text-white/60">/{week.planned}</span>
          </b>
          <span className="pb-1 text-[0.875rem] text-white/75">antrenman yapıldı</span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {strip.map((d) => (
            <button
              key={d.date}
              type="button"
              disabled={!d.id}
              onClick={() => d.id && open({ id: d.id })}
              className={`flex h-12 flex-col items-center justify-center rounded-xl text-[0.6875rem] font-semibold ${d.st ? DOT[d.st] : "bg-white/5 text-white/40"} ${d.date === today && !d.st ? "ring-1 ring-white/60" : ""}`}
            >
              {DOWS[d.dow]}
              <span className="mt-0.5 text-[0.8125rem] tabular-nums">{d.st === "done" ? "✓" : d.st === "missed" ? "✕" : +d.date.slice(8)}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Stat n={week.streak} label="hafta seri" />
          <Stat n={week.minutes || "–"} label="dakika" />
          <Stat n={week.missed} label="kaçırılan" tone={week.missed ? "rec" : ""} />
        </div>
      </Hero>

      {todays.map((p) => {
        const st = statusOf(p, today);
        const items = p.fit?.items || [];
        return (
          <button key={p.id} type="button" onClick={() => open(p)} className={`${card} mt-3 flex w-full items-center gap-3 p-4 text-left active:scale-[.99]`}>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-500/10 text-orange-700">
              <Icon name="dumbbell" className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <small className="block text-[0.75rem] font-bold tracking-[.08em] text-mut">BUGÜN{p.time ? ` · ${p.time}` : ""}</small>
              <b className="block truncate text-[1.0625rem] font-semibold">{p.fit?.name || p.title}</b>
              <small className="block truncate text-[0.8125rem] text-mut">{st === "done" ? resLine(p.fit) || "Yapıldı" : `${items.length} hareket · ${p.durationMin || 45} dk`}</small>
            </span>
            <span className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${st === "done" ? "bg-acc/10 text-acc" : st === "skip" ? "bg-bg text-mut" : "bg-acc text-white"}`}>
              {st === "done" ? "Yapıldı" : st === "skip" ? "Atlandı" : p.fit?.res?.ex?.some((e) => e.sets?.some((s) => s.ok)) ? "Devam et" : "Başla"}
            </span>
          </button>
        );
      })}
      {!todays.length && nextOne && (
        <button type="button" onClick={() => open(nextOne)} className={`${card} mt-3 flex w-full items-center gap-3 px-4 py-3 text-left`}>
          <Icon name="cal" className="size-5 shrink-0 text-mut" />
          <span className="min-w-0 flex-1 truncate text-[0.9375rem]">
            Sıradaki: <b className="font-semibold">{nextOne.fit?.name || nextOne.title}</b>
          </span>
          <span className="shrink-0 text-[0.8125rem] text-mut">
            {dayText(nextOne.date)}
            {nextOne.time ? ` ${nextOne.time}` : ""}
          </span>
        </button>
      )}

      {list && !prog && (
        <div className="mt-1">
          <Empty icon="dumbbell" title="Henüz programın yok" sub="Günlerini ve saatini seç, yapay zeka haftalık programını hazırlasın. Asistana da söyleyebilirsin: “Pazartesi, çarşamba, cuma sabah 7'de 4 haftalık program hazırla”." />
          <Button className="mt-3" onClick={() => setNewOpen(true)}>
            <Icon name="spark" className="size-5" />
            Program hazırla
          </Button>
        </div>
      )}

      {prog && (
        <>
          <Label right={onCal ? `${onCal} antrenman takvimde` : "Takvimde değil"}>PROGRAM</Label>
          <section className={`${card} p-4`}>
            <b className="block text-[1.0625rem] font-semibold">{prog.title}</b>
            <small className="block text-[0.8125rem] text-mut">
              {programLine(prog)}
              {prog.start ? ` · ${dayText(prog.start)} başlangıç` : ""}
            </small>
            <ul className="mt-3 space-y-2">
              {prog.days.map((d) => (
                <li key={d.dow} className="flex items-start gap-3">
                  <span className="grid h-10 w-11 shrink-0 place-items-center rounded-xl bg-bg text-[0.8125rem] font-bold">{DOWS[d.dow]}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-medium">
                      {d.name}
                      <span className="font-normal text-mut">
                        {d.time ? ` · ${d.time}` : ""} · {d.min} dk
                      </span>
                    </b>
                    <small className="line-clamp-2 block text-[0.8125rem] leading-snug text-mut">
                      {d.items
                        .filter((it) => !["warmup", "stretch"].includes(it.ex))
                        .map((it) => `${it.name} ${itemLine(it)}`)
                        .join(" · ")}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setEdit({ prog, fresh: false, k: Date.now() })} className="h-11 rounded-xl bg-bg text-[0.875rem] font-semibold">
                Düzenle
              </button>
              {onCal ? (
                <button type="button" disabled={!!busy} onClick={unplan} className="h-11 rounded-xl bg-bg text-[0.875rem] font-semibold text-mut">
                  Takvimden kaldır
                </button>
              ) : (
                <button type="button" disabled={!!busy} onClick={() => save(prog, true)} className="h-11 rounded-xl bg-acc text-[0.875rem] font-semibold text-white">
                  Planlara ekle
                </button>
              )}
            </div>
            <button type="button" disabled={!!busy} onClick={drop} className="mt-2 h-9 w-full text-[0.8125rem] font-semibold text-rec">
              Programı sil
            </button>
          </section>
        </>
      )}

      {recs.length > 0 && (
        <>
          <Label right="en iyi">GELİŞİM</Label>
          <section className={`${card} divide-y divide-line px-4`}>
            {recs.map((r) => {
              const up = r.best.kg && r.first.kg ? r.best.kg - r.first.kg : (r.best.reps || r.best.sec || 0) - (r.first.reps || r.first.sec || 0);
              return (
                <div key={r.key} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-medium">{r.name}</b>
                    <small className="block text-[0.75rem] text-mut">{r.times} kez yapıldı</small>
                  </span>
                  <span className="text-right">
                    <b className="block text-[0.9375rem] font-semibold tabular-nums">{bestText(r)}</b>
                    {up > 0 && <small className="block text-[0.75rem] font-semibold text-acc">+{String(up).replace(".", ",")}{r.best.kg && r.first.kg ? " kg" : r.kind === "time" ? " sn" : " tekrar"}</small>}
                  </span>
                </div>
              );
            })}
          </section>
        </>
      )}

      {month.planned > 0 && (
        <>
          <Label right={new Date(`${today}T12:00:00`).toLocaleDateString("tr-TR", { month: "long" })}>BU AY</Label>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [`${month.done}/${month.planned}`, "yapıldı"],
              [month.rate ? `%${month.rate}` : "–", "devam"],
              [month.minutes ? month.minutes < 60 ? `${month.minutes} dk` : `${String(Math.round(month.minutes / 6) / 10).replace(".", ",")} sa` : "–", "süre"],
            ].map(([v, l]) => (
              <div key={l} className={`${card} px-2 py-3`}>
                <b className="block text-[1.25rem] font-semibold tabular-nums">{v}</b>
                <small className="text-[0.75rem] text-mut">{l}</small>
              </div>
            ))}
          </div>
          {month.volume > 0 && <p className="mt-2 px-1 text-[0.8125rem] text-mut">Bu ay toplam {month.volume.toLocaleString("tr-TR")} kg kaldırdın.</p>}
        </>
      )}

      {history.length > 0 && (
        <>
          <Label>GEÇMİŞ</Label>
          <section className={`${card} divide-y divide-line`}>
            {history.map((p) => {
              const st = statusOf(p, today);
              return (
                <button key={p.id} type="button" onClick={() => open(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                  <span className="w-16 shrink-0 text-[0.8125rem] text-mut">{dayText(p.date)}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-medium">{p.fit?.name || p.title}</b>
                    {resLine(p.fit) && <small className="block truncate text-[0.75rem] text-mut">{resLine(p.fit)}</small>}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${CHIP[st]}`}>{STATUS[st]}</span>
                </button>
              );
            })}
          </section>
        </>
      )}

      <NewProgram key={newOpen ? "o" : "c"} open={newOpen} onClose={() => setNewOpen(false)} profile={fitProf} onAsk={ask} onBlank={blank} busy={busy === "ask"} />
      <ProfileSheet key={profOpen ? "o" : "c"} open={profOpen} onClose={() => setProfOpen(false)} value={fitProf} onSave={async (f) => setFitProf(await saveProfile(uid, f))} />
    </main>
  );
}

// Profil penceresi (her açılışta kayıtlı profille başlar: key ile yeniden kurulur)
function ProfileSheet({ open, onClose, value, onSave }) {
  const [f, setF] = useState(value);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="Fitness profilim">
      <p className="text-[0.8125rem] leading-snug text-mut">Program hazırlanırken kullanılır. Asistana da söyleyebilirsin: “kilom 82”, “evde çalışıyorum, dambılım var”.</p>
      <ProfileFields f={f} set={(k, v) => setF((x) => ({ ...x, [k]: v }))} />
      <Button
        className="mt-5"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onSave(f);
            onClose();
          } finally {
            setBusy(false);
          }
        }}
      >
        Kaydet
      </Button>
    </Sheet>
  );
}
