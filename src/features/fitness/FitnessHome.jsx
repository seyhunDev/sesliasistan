"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { card, Empty } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { todayStr } from "@/lib/utils/format";
import {
  STATUS, addDays, cleanItem, cleanProgram, dowOf, fitPlans, monthStats, programLine, progWeek, records, statusOf, weekStats,
} from "@/lib/fitness/model";
import { FIT_PREVIEW, FIT_SAVED, activeOf, askFitness, deleteProgram, loadPrograms, removePlans, saveProfile, saveProgram, syncPlans, takeProgram, peekProgram } from "./fitnessData";
import { NewProgram, ProfileFields } from "./NewProgram";
import { ProgramEditor } from "./ProgramEditor";
import { BodyStep, FitIntro } from "./FitIntro";
import { hasBody } from "@/lib/fitness/forecast";
import { HistoryCard, MonthCard, ProgramCard, ProgressCard, TodayCard, WeekCard } from "./FitDashboard";
import { FoodView } from "./FoodView";
import { useRouter, useSearchParams } from "next/navigation";

// Fitness sayfası (yalnız ana hesap): bugünkü antrenman (Başla), bu hafta (halka, 7 gün, seri), gelişim (en iyi değer, küçük grafik),
// program (hafta ilerlemesi, düzenle, planlara ekle), bu ay, geçmiş (parçalar FitDashboard.jsx). Takip planlardan hesaplanır (ek okuma yok); programlar tek sorgu.
// Program yapay zekayla hazırlanır (Program hazırla: günler, saat, hafta, süre, profil) ya da asistana söylenir; önizlemede açılır.
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
  const [newGoal, setNewGoal] = useState("");
  const [profOpen, setProfOpen] = useState(false);
  const [bodyLater, setBodyLater] = useState(false);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [fitProf, setFitProf] = useState(profile.fit || {});
  const router = useRouter();
  const tab = useSearchParams().get("tab") === "food" ? "food" : "train";
  const setTab = (t) => router.replace(t === "food" ? "/fitness?tab=food" : "/fitness", { scroll: false });

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

  const bodySheet = (
    <Sheet open={bodyOpen} onClose={() => setBodyOpen(false)}>
      <BodyStep
        fit={fitProf}
        onSave={async (f) => {
          await saveBody(f);
          setBodyOpen(false);
        }}
      />
    </Sheet>
  );

  if (tab === "food") {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <PageHeader title="Fitness" sub="Beslenme ve kilo takibin" />
        <Tabs tab={tab} setTab={setTab} />
        <FoodView orgId={orgId} uid={uid} fit={fitProf} fitW={profile.fitW} trainDays={prog?.days?.length || 3} onBody={() => setBodyOpen(true)} />
        {bodySheet}
      </main>
    );
  }

  // Hiç programı ve fitness antrenmanı yoksa: tanıtım (kısa mesaj, boy/kilo, hedef kartları, adımlar)
  if (list && !list.length && !all.length) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <PageHeader title="Fitness" sub="Antrenman programın ve takibin" />
        <Tabs tab={tab} setTab={setTab} />
        <FitIntro name={profile.name} fit={fitProf} onStart={(g) => {
            setNewGoal(g);
            setNewOpen(true);
          }} onSaveBody={saveBody} />
        <NewProgram key={newOpen ? "o" : "c"} goal={newGoal} open={newOpen} onClose={() => setNewOpen(false)} profile={fitProf} onAsk={ask} onBlank={blank} busy={busy === "ask"} />
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
      <Tabs tab={tab} setTab={setTab} />

      {!hasBody(fitProf) && !bodyLater && (
        <div className="mt-2 flex items-center gap-1 rounded-[1.25rem] bg-card shadow-[0_1px_3px_rgba(38,40,44,.08)]">
          <button type="button" onClick={() => setBodyOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-4 text-left">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
              <Icon name="user" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[0.9375rem] font-semibold leading-snug">Boy ve kilonu ekle</b>
              <small className="block text-[0.8125rem] leading-snug text-mut">Antrenmanın sana göre hazırlansın.</small>
            </span>
            <Icon name="chev" className="size-4 shrink-0 text-mut" />
          </button>
          <button type="button" onClick={() => setBodyLater(true)} aria-label="Şimdi değil" className="grid size-11 shrink-0 place-items-center text-[1.25rem] text-mut">
            ×
          </button>
        </div>
      )}
      {bodySheet}

      <TodayCard plan={todays[0]} next={nextOne} week={prog && progWeek(prog, today)} today={today} onOpen={open} />
      {todays.slice(1).map((p) => (
        <button key={p.id} type="button" onClick={() => open(p)} className={`${card} mt-2 flex w-full items-center gap-3 px-4 py-3 text-left`}>
          <Icon name="dumbbell" className="size-5 shrink-0 text-acc" />
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{p.fit?.name || p.title}</span>
          <span className="shrink-0 text-[0.8125rem] text-mut">{p.time || STATUS[statusOf(p, today)]}</span>
        </button>
      ))}

      {list && !prog && (
        <div className="mt-1">
          <Empty icon="dumbbell" title="Henüz programın yok" sub="Günlerini ve saatini seç, yapay zeka haftalık programını hazırlasın. Asistana da söyleyebilirsin: “Pazartesi, çarşamba, cuma sabah 7'de 4 haftalık program hazırla”." />
          <Button className="mt-3" onClick={() => setNewOpen(true)}>
            <Icon name="spark" className="size-5" />
            Program hazırla
          </Button>
        </div>
      )}

      <WeekCard week={week} strip={strip} today={today} onOpen={open} />
      <ProgressCard recs={recs} plans={plans} />
      {prog && (
        <ProgramCard
          prog={prog}
          today={today}
          onCal={onCal}
          busy={!!busy}
          onEdit={() => setEdit({ prog, fresh: false, k: Date.now() })}
          onPlan={() => save(prog, true)}
          onUnplan={unplan}
          onDrop={drop}
        />
      )}
      <MonthCard month={month} today={today} />
      <HistoryCard list={history} today={today} onOpen={open} />

      <NewProgram key={newOpen ? "o" : "c"} open={newOpen} onClose={() => setNewOpen(false)} profile={fitProf} onAsk={ask} onBlank={blank} busy={busy === "ask"} />
      <ProfileSheet key={profOpen ? "o" : "c"} open={profOpen} onClose={() => setProfOpen(false)} value={fitProf} onSave={async (f) => setFitProf(await saveProfile(uid, f))} />
    </main>
  );
}

// Antrenman | Beslenme seçimi (adres ?tab=food; asistan "beslenmeyi aç" ile de gelir)
function Tabs({ tab, setTab }) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-card p-1 shadow-[0_1px_3px_rgba(38,40,44,.08)]">
      {[
        ["train", "Antrenman", "dumbbell"],
        ["food", "Beslenme", "utensils"],
      ].map(([k, n, ic]) => (
        <button key={k} type="button" onClick={() => setTab(k)} className={`flex h-10 items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold transition-colors ${tab === k ? "bg-acc text-white" : "text-mut"}`}>
          <Icon name={ic} className="size-4" />
          {n}
        </button>
      ))}
    </div>
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
