"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { todayStr } from "@/lib/utils/format";
import {
  GOALS, LEVEL_MAX, SPORTS, STATUS, addDays, ageFrom, copyFor, levelUp, progEnd, athleteRows, dayLine, dayRows, cleanItem, cleanProgram, dowOf, fitPlans, labelOf, monthStats, programText, progWeek, records, statusOf, weekStats,
} from "@/lib/fitness/model";
import { libList } from "@/lib/fitness/library";
import { useFitLib } from "./useFitLib";
import { kindOf } from "@/lib/kinds";
import { FIT_PREVIEW, FIT_SAVED, activeOf, adoptProgram, spreadLib, askFitness, deleteProgram, loadPrograms, resetFitness, notifyProgram, removePlans, dropFrom, saveProfile, saveProgram, syncPlans, takeProgram, peekProgram, peekPrograms } from "./fitnessData";
import { NewProgram, ProfileFields } from "./NewProgram";
import { importFile, importText } from "./fitImport";
import { TEMPLATES, fromTemplate } from "@/lib/fitness/templates";
import { ProgramEditor } from "./ProgramEditor";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { BodyStep, FitIntro } from "./FitIntro";
import { HistoryCard, MonthCard, ProgramCard, ProgressCard, RowButton, TodayCard, WeekCard, WeekStrip, progSub } from "./FitDashboard";
import { FoodView } from "./FoodView";
import { FitReview } from "./FitReview";
import { useRouter, useSearchParams } from "next/navigation";

// Fitness sayfası (yalnız ana hesap), sade: bugünkü antrenman (Başla), bu hafta (7 gün), "Programım" satırı (pencerede günler, düzenle,
// planlara ekle, profil) ve kapalı "Gelişim ve geçmiş" (halka, seri, gelişim, bu ay, geçmiş; parçalar FitDashboard.jsx). Takip planlardan hesaplanır (ek okuma yok); programlar tek sorgu.
// Program yapay zekayla hazırlanır (Program hazırla: günler, saat, hafta, süre, profil) ya da asistana söylenir; önizlemede açılır.
// İlk antrenman: başlangıçtan sonraki ilk seçili gün (yeni programda başlangıç geçmişteyse bugün)
// Raporda sporcunun altı: "14 yaş · Yelken"
const athMeta = (a, prog, today) => [ageFrom(a?.birth, today) || prog?.forAge ? `${ageFrom(a?.birth, today) || prog?.forAge} yaş` : "", labelOf(SPORTS, prog?.sport)].filter(Boolean).join(" · ");
const fixStart = (p) => ({ ...p, start: p.start && (p.id || p.start >= todayStr()) ? p.start : todayStr() });

export function FitnessHome() {
  const { profile } = useAuth();
  const { plans, fitOthers = [], members = [] } = useData();
  const { openAdd } = useAdd();
  const toast = useToast();
  const orgId = profile.orgId;
  const uid = profile.uid;
  const today = todayStr();
  const [list, setList] = useState(() => peekPrograms(orgId));
  // Asistanın hazırladığı ve sayfa açılmadan önce bekleyen program: önizlemede açılır
  const [edit, setEdit] = useState(() => {
    const p = peekProgram();
    return p ? { prog: fixStart(p), fresh: !p.id, k: 1 } : null;
  }); // { prog, fresh, k }
  const [busy, setBusy] = useState("");
  const [askErr, setAskErr] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [profOpen, setProfOpen] = useState(false);
  const [progOpen, setProgOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [dayDate, setDayDate] = useState(today);
  const [growOpen, setGrowOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [fitProf, setFitProf] = useState(profile.fit || {});
  const [forUid, setForUid] = useState(""); // Program hazırla bir sporcu için açıldıysa
  const [libOpen, setLibOpen] = useState(false);
  const [ath, setAth] = useState(""); // Açık sporcu sayfası
  const [revOpen, setRevOpen] = useState(false); // sporcunun Değerlendirme sayfası
  // Program verilebilecek sporcular: uygulamada hesabı olan sporcu ve öğrenciler
  const athletes = useMemo(
    () =>
      members
        .filter((m) => m.account !== false && (kindOf(m) === "athlete" || kindOf(m) === "student"))
        .map((m) => ({ uid: m.uid, name: m.name || "Sporcu", birth: m.birth || "", athleteId: m.athleteId || "" }))
        .sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [members],
  );
  const router = useRouter();
  const sp = useSearchParams();
  // Üç sekme: Sporcular (sporcusu varsa ilk), Benim, Beslenme (?tab=me, ?tab=food)
  const tq = sp.get("tab");
  const tab = tq === "food" ? "food" : tq === "me" || !athletes.length ? "me" : "ath";
  const athQ = sp.get("sporcular");
  const gunQ = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("gun") || "") ? sp.get("gun") : ""; // Ana sayfadaki Antrenman kartından o gün
  const setTab = (t) => {
    setAth("");
    router.replace(t === "ath" ? "/fitness" : `/fitness?tab=${t}`, { scroll: false });
  };

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
      if (e.detail) setEdit({ prog: fixStart(e.detail), fresh: !e.detail.id, simple: !e.detail.id, k: Date.now() });
    };
    takeProgram();
    window.addEventListener(FIT_SAVED, onSaved);
    window.addEventListener(FIT_PREVIEW, onPreview);
    return () => {
      window.removeEventListener(FIT_SAVED, onSaved);
      window.removeEventListener(FIT_PREVIEW, onPreview);
    };
  }, [reload]);

  useEffect(() => {
    const show = (gun) => {
      setAth("");
      setDayDate(gun || todayStr());
      setDayOpen(true);
    };
    if (athQ) show(gunQ);
    // Asistan ("sporcular bugün antrenman yaptı mı") Fitness sayfası açıkken
    const onEv = () => {
      show();
      router.replace("/fitness", { scroll: false });
    };
    window.addEventListener("sa-fit-athletes", onEv);
    return () => window.removeEventListener("sa-fit-athletes", onEv);
  }, [athQ, gunQ, router]);

  const mine = list ? list.filter((p) => !p.for) : null;
  const prog = activeOf(mine);
  const rows = athleteRows(list || [], fitOthers, athletes, today);
  const plansFor = (p) => (p?.for ? fitOthers : plans);
  const newFor = (id) => {
    setForUid(id);
    setNewGoal("");
    setAskErr("");
    setDayOpen(false);
    setNewOpen(true);
  };
  const week = weekStats(plans, today);
  const month = monthStats(plans, today.slice(0, 7), today);
  const recs = records(plans);
  const all = fitPlans(plans);
  const todays = all.filter((p) => p.date === today);
  const nextOne = all.find((p) => p.date > today);
  const history = all.filter((p) => p.date < today || p.fit?.res?.st).reverse().slice(0, 12);
  const onCal = prog && all.filter((p) => p.fit?.prog === prog.id && p.date >= today).length;
  const open = (p) => openAdd({ edit: { kind: "plan", id: p.id } });
  const { lib } = useFitLib();
  const libCount = useMemo(() => {
    const l = libList(lib);
    return { n: l.length, v: l.filter((x) => x.yt?.id || (x.media || []).some((m) => m.kind === "video")).length };
  }, [lib]);

  const nextTitle = (t) => {
    const m = String(t || "Program").match(/^(.*?)\s*·\s*(\d+)$/);
    return m ? `${m[1]} · ${+m[2] + 1}` : `${t || "Program"} · 2`;
  };

  async function save(p, withPlans) {
    setBusy(withPlans ? "plans" : "save");
    try {
      // Takvimde bu programın gelecek planları varsa onlar da her kayıtta yenilenir (video, hareket değişikliği sporcuya gitsin)
      const onPlans = (plansFor(p) || []).some((x) => p.id && x.fit?.prog === p.id && x.date >= todayStr() && !x.fit?.res?.st);
      if (onPlans) withPlans = true;
      // Hareketler kütüphaneye girer (yenilere numara), fotoğraf/video kütüphanedekiyle aynı olur
      p = await adoptProgram(orgId, p).catch(() => p);
      // Devam programı ya da başka sporcuya verilen kopya: eski programın o tarihten sonraki antrenmanları kalkar
      if (!p.id && withPlans) {
        const old = activeOf((list || []).filter((x) => (x.for || "") === (p.for || "")));
        if (old) await dropFrom(orgId, old.id, plansFor(p), p.start).catch(() => 0);
      }
      const saved = await saveProgram(orgId, uid, { ...p, active: true });
      let r = null;
      if (withPlans) r = await syncPlans(orgId, uid, saved, plansFor(saved), { name: profile.name });
      // Sporcuya tek bildirim: "Yeni fitness programın hazır" (sunucu bir kez gönderir)
      if (saved.for && (withPlans || saved.plansAt)) notifyProgram(saved.id);
      // Kütüphanede değişen video başka programlara ve sporcuların antrenmanlarına da gitsin
      spreadLib(orgId, [...plans, ...fitOthers]).then((x) => x.progs && reload(false)).catch(() => {});
      setEdit(null);
      reload(false);
      if (saved.for) toast(r ? `Kaydedildi · ${saved.forName} için ${r.added} antrenman` : "Program kaydedildi");
      else toast(r ? `Kaydedildi · takvimde ${r.added} antrenman` : "Program kaydedildi");
    } catch (e) {
      toast(e.message || "Kaydedilemedi");
    } finally {
      setBusy("");
    }
  }

  async function ask(text, f, pre) {
    setBusy("ask");
    setAskErr("");
    try {
      // Sporcu için: senin profiline yazılmaz, sporcunun adı yapay zekaya gitmez
      const pf = pre.for ? f : await saveProfile(uid, f).catch(() => f);
      if (!pre.for) setFitProf(pf);
      const r = await askFitness({ text, profile: pf, want: "program" });
      if (!r.program) throw new Error(r.message || "Program hazırlanamadı");
      // Seçilenler kesin: gün ve saatler formdakiyle aynı olsun
      const days = r.program.days.map((d) => ({ ...d, time: d.time || pre.time, min: d.min || pre.min }));
      setNewOpen(false);
      const who = pre.for ? { for: pre.for, forName: pre.forName, forAge: f.age || 0, sport: f.sport || "" } : {};
      setEdit({ prog: fixStart({ ...r.program, goal: r.program.goal || f.goal, level: r.program.level || f.level, place: r.program.place || f.place, ...who, days, weeks: pre.weeks, start: pre.start, note: r.program.note || r.message }), fresh: true, simple: true, k: Date.now() });
    } catch (e) {
      // Hata pencerede kalır (önceden yalnız kısa bildirimdi, kaçırılıyordu)
      setAskErr(e.message || "Program hazırlanamadı, tekrar dene.");
    } finally {
      setBusy("");
    }
  }

  // Elindeki program (PDF, fotoğraf, metin): yapay zeka okur, düzenleme ekranında tam açılır
  async function importProg({ file, text, ask: extra }, f, pre) {
    setBusy("import");
    setAskErr("");
    try {
      const opt = { ask: extra, age: pre.for ? f.age || 0 : 0, sport: pre.for ? f.sport || "" : "" };
      const r = file ? await importFile(file, opt) : await importText(text, opt);
      if (!r.program?.days?.length) throw new Error(r.message || "Programda antrenman bulunamadı");
      const who = pre.for ? { for: pre.for, forName: pre.forName, forAge: f.age || 0, sport: f.sport || "" } : {};
      setNewOpen(false);
      setEdit({ prog: fixStart({ ...cleanProgram(r.program), ...who, start: pre.start }), fresh: true, k: Date.now() });
      if (r.message) toast(r.message);
    } catch (e) {
      setAskErr(e.message || "Program okunamadı, tekrar dene.");
    } finally {
      setBusy("");
    }
  }

  // Hazır program: seçili sporcuya tek dokunuş, kaydetmeden önce düzenleme ekranında
  function template(id, f, pre) {
    const t = TEMPLATES.find((x) => x.id === id);
    const p = fromTemplate(id, pre.start);
    if (!t || !p) return;
    const who = pre.for ? { for: pre.for, forName: pre.forName, forAge: f.age || t.forAge || 0, sport: f.sport || t.sport || "" } : {};
    setNewOpen(false);
    setEdit({ prog: fixStart({ ...p, ...who, title: pre.for ? `${pre.forName} · ${t.title}` : p.title }), fresh: true, k: Date.now() });
  }

  function blank(pre, f) {
    if (!pre.for) saveProfile(uid, f).then(setFitProf).catch(() => {});
    setNewOpen(false);
    const days = pre.days.map((dow) => ({ dow, time: pre.time, min: pre.min, name: "Antrenman", items: [cleanItem({ ex: "warmup", min: 5 }), cleanItem({ ex: "stretch", min: 5 })] }));
    const who = pre.for ? { for: pre.for, forName: pre.forName, forAge: f?.age || 0, sport: f?.sport || "" } : {};
    setEdit({ prog: { ...cleanProgram({ title: pre.for ? `${pre.forName} · fitness` : "Fitness programım", goal: f?.goal, level: f?.level, place: f?.place, weeks: pre.weeks, start: pre.start, days }), ...who }, fresh: true, k: Date.now() });
  }

  async function saveBody(f) {
    try {
      setFitProf(await saveProfile(uid, f));
      toast("Kaydedildi");
    } catch (e) {
      toast(e.message || "Kaydedilemedi");
    }
  }

  async function unplan(pg = prog) {
    setBusy("unplan");
    try {
      const n = await removePlans(orgId, pg, plansFor(pg));
      toast(`Takvimden ${n} antrenman kaldırıldı`);
    } finally {
      setBusy("");
    }
  }
  async function drop(pg = prog) {
    if (!window.confirm("Program silinsin mi? Bütün antrenmanları (yapılanlar dahil), fotoğraf ve videoları da silinir. Geri alınamaz.")) return false;
    setBusy("drop");
    try {
      const n = await deleteProgram(orgId, pg.id);
      toast(n ? `Program ve ${n} antrenmanı silindi` : "Program silindi");
    } catch (e) {
      toast(e.message || "Silinemedi");
      return false;
    } finally {
      setBusy("");
    }
  }
  useEffect(() => {
    const on = () => reset();
    window.addEventListener("sa-fit-reset", on);
    return () => window.removeEventListener("sa-fit-reset", on);
  });
  // Bütün fitness'ı sıfırla (denemeler silinsin): programlar, antrenmanlar, fotoğraf ve videolar; profil ve beslenme kalır
  async function reset() {
    if (!window.confirm("Fitness sıfırlansın mı? Bütün programlar (sporcularınki dahil), bütün antrenmanlar (yapılanlar dahil), fotoğraf ve videolar silinir. Boy, kilo ve beslenme kalır.")) return;
    if (!window.confirm("Emin misin? Geri alınamaz.")) return;
    setBusy("reset");
    try {
      const r = await resetFitness(orgId);
      setList([]);
      toast(`Sıfırlandı: ${r.progs} program, ${r.plans} antrenman silindi`);
    } catch (e) {
      toast(e.message || "Sıfırlanamadı");
    } finally {
      setBusy("");
    }
  }

  if (edit) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <PageHeader title={edit.prog.for ? `${edit.prog.forName} için program` : edit.simple ? "Programın hazır" : edit.fresh ? "Yeni program" : "Programı düzenle"} back="/fitness" />
        <ProgramEditor key={edit.k} prog={edit.prog} fresh={edit.fresh} simple={edit.simple} busy={busy} onSave={save} onCancel={() => {
          setEdit(null);
          spreadLib(orgId, [...plans, ...fitOthers]).then((x) => x.progs && reload(false)).catch(() => {});
        }} />
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
        <Tabs tab={tab} setTab={setTab} withAth={athletes.length > 0} />
        <FoodView orgId={orgId} uid={uid} fit={fitProf} fitW={profile.fitW} trainDays={prog?.days?.length || 3} onBody={() => setBodyOpen(true)} />
        {bodySheet}
      </main>
    );
  }

  // Program listesi ilk kez okunuyor ve takvimde fitness antrenmanı yok: tanıtım mı program mı belli değil,
  // ikisinden birini çizip sonra değiştirmek yerine aynı yerde sakin bir iskelet (zıplama olmasın)
  if (!list && !all.length) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <PageHeader title="Fitness" sub="Antrenman programın ve takibin" />
        <Tabs tab={tab} setTab={setTab} withAth={athletes.length > 0} />
        <div aria-hidden="true" className="grid gap-3">
          <div className="shimmer h-36 rounded-2xl" />
          <div className="shimmer h-20 rounded-2xl" />
          <div className="shimmer h-14 rounded-2xl" />
        </div>
      </main>
    );
  }

  // Hiç programı, fitness antrenmanı ve program verilecek sporcusu yoksa: tek ekran tanıtım, "Programımı hazırla" (hedef ve hafta pencerede sorulur)
  if (mine && !mine.length && !all.length && !rows.length && !athletes.length) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <PageHeader title="Fitness" sub="Antrenman programın ve takibin" />
        <Tabs tab={tab} setTab={setTab} withAth={athletes.length > 0} />
        <FitIntro
          name={profile.name}
          onStart={(g) => {
            setNewGoal(g);
            setNewOpen(true);
          }}
        />
        <NewProgram key={newOpen ? "o" : "c"} goal={newGoal} athletes={athletes} open={newOpen} onClose={() => setNewOpen(false)} profile={fitProf} onAsk={ask} onBlank={blank} onImport={importProg} onTemplate={template} busy={busy === "ask" || busy === "import"} error={askErr} />
      </main>
    );
  }

  const mon = addDays(today, 1 - dowOf(today));
  const strip = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(mon, i);
    const p = week.days.find((d) => d.date === date);
    return { date, dow: i + 1, st: p?.st || "", id: p?.id };
  });

  const rest = athletes.filter((a) => !rows.some((r) => r.uid === a.uid));
  const selRow = rows.find((r) => r.uid === ath);
  const selAth = athletes.find((a) => a.uid === ath);
  const editProg = (pg) => setEdit({ prog: pg, fresh: false, k: Date.now() });
  const sheets = (
    <>
      {bodySheet}
      <ExerciseLibrary
        open={libOpen}
        orgId={orgId}
        progs={list || []}
        onClose={() => {
          setLibOpen(false);
          spreadLib(orgId, [...plans, ...fitOthers]).then((x) => x.progs && reload(false)).catch(() => {});
        }}
      />
      <NewProgram key={newOpen ? `o${forUid}` : "c"} forUid={forUid} athletes={athletes} open={newOpen} onClose={() => setNewOpen(false)} profile={fitProf} onAsk={ask} onBlank={blank} onImport={importProg} onTemplate={template} busy={busy === "ask" || busy === "import"} error={askErr} />
      <ProfileSheet key={profOpen ? "o" : "c"} open={profOpen} onClose={() => setProfOpen(false)} value={fitProf} onSave={async (f) => setFitProf(await saveProfile(uid, f))} />
    </>
  );

  // Sporcunun haftalık değerlendirmesi (sporcu sayfasındaki Değerlendirme): tam sayfa, geri ile sporcu sayfasına
  if (ath && revOpen && (selRow || selAth)) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <FitReview orgId={orgId} uid={ath} name={selAth?.name || selRow?.name || ""} meta={athMeta(selAth, selRow?.prog, today)} prog={selRow?.prog} plans={selRow?.plans || []} today={today} onBack={() => setRevOpen(false)} />
      </main>
    );
  }

  // Sporcu sayfası (Sporcular listesinden): tam sayfa, geri ile listeye
  if (ath && (selRow || selAth)) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <AthletePage
          name={selAth?.name || selRow?.name || ""}
          row={selRow}
          athlete={selAth}
          today={today}
          busy={!!busy}
          onBack={() => setAth("")}
          onReview={() => setRevOpen(true)}
          onNew={() => newFor(ath)}
          onOpen={open}
          onEdit={editProg}
          onPlan={(pg) => save(pg, true)}
          onUnplan={unplan}
          onDrop={async (pg) => {
            if ((await drop(pg)) !== false) setAth("");
          }}
          onCard={selAth?.athleteId ? () => router.push(`/athletes/${selAth.athleteId}`) : null}
          others={athletes.filter((a) => a.uid !== ath).map((a) => ({ ...a, has: rows.some((r) => r.uid === a.uid && r.prog) }))}
          onContinue={(pg, n, start, weeks) => setEdit({ prog: { ...levelUp(pg, n), start, weeks, title: nextTitle(pg.title) }, fresh: true, simple: true, k: Date.now() })}
          onGive={(pg, a, start) => setEdit({ prog: copyFor(pg, a, start, today), fresh: true, simple: true, k: Date.now() })}
        />
        {sheets}
      </main>
    );
  }

  const todayRows = dayRows(fitOthers, athletes, today, today);
  const wk = rows.reduce((t, r) => ({ done: t.done + r.week.done, planned: t.planned + r.week.planned, missed: t.missed + r.week.missed }), { done: 0, planned: 0, missed: 0 });

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <PageHeader title="Fitness" sub={tab === "ath" ? "Sporcuların programı ve takibi" : "Antrenman programın ve takibin"}>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Diğer" className="grid size-10 place-items-center rounded-full bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.08)]">
          <Icon name="more" className="size-5" />
        </button>
        <button type="button" onClick={() => newFor("")} aria-label="Program hazırla" className="grid size-10 place-items-center rounded-full bg-acc text-white shadow-[0_6px_14px_-8px_rgba(47,125,107,.9)]">
          <Icon name="plus" className="size-5" />
        </button>
      </PageHeader>
      <Tabs tab={tab} setTab={setTab} withAth={athletes.length > 0} />

      {tab === "ath" ? (
        <>
          <button
            type="button"
            onClick={() => {
              setDayDate(today);
              setDayOpen(true);
            }}
            className="block w-full rounded-[1.625rem] bg-deep p-5 text-left text-white"
          >
            <div className="flex items-center justify-between">
              <small className="text-[0.75rem] font-bold tracking-[.06em] text-white/60">BUGÜN</small>
              <span className="flex items-center gap-1 text-[0.8125rem] font-semibold text-white/80">
                Gün gün
                <Icon name="chev" className="size-4" />
              </span>
            </div>
            <b className="mt-1 block text-[1.125rem] font-semibold leading-snug">{dayLine(todayRows) || "Bugün sporcu antrenmanı yok"}</b>
            {wk.planned > 0 && (
              <>
                <div className="mt-4 flex items-baseline justify-between text-[0.8125rem]">
                  <span className="text-white/70">Bu hafta</span>
                  <span>
                    <b className="tabular-nums">{`${wk.done}/${wk.planned}`}</b>
                    <span className="text-white/70"> yapıldı</span>
                    {wk.missed > 0 && <span className="text-[#f3a39a]">{` · ${wk.missed} yapılmadı`}</span>}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-[#bfe8d6]" style={{ width: `${Math.round((wk.done / wk.planned) * 100)}%` }} />
                </div>
              </>
            )}
          </button>

          {rows.length > 0 && (
            <>
              <Head title={`SPORCULAR · ${rows.length}`} />
              <ul className={`${card} divide-y divide-line overflow-hidden`}>
                {rows.map((r) => (
                  <li key={r.uid} className="px-4 py-3">
                    <button type="button" onClick={() => (setRevOpen(false), setAth(r.uid))} className="flex w-full items-center gap-3 text-left">
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.9375rem] font-bold text-acc">{initialsOf(r.name)}</span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[1rem] font-semibold">{r.name}</b>
                        <small className={`block truncate text-[0.8125rem] ${/yapmadı/.test(nowLine(r, today)) ? "text-rec" : "text-mut"}`}>{nowLine(r, today)}</small>
                      </span>
                      {r.week.planned > 0 && <b className={`shrink-0 text-[0.9375rem] font-bold tabular-nums ${r.week.missed ? "text-rec" : "text-acc"}`}>{`${r.week.done}/${r.week.planned}`}</b>}
                      <Icon name="chev" className="size-4 shrink-0 text-mut" />
                    </button>
                    <WeekDots row={r} today={today} onOpen={open} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {rest.length > 0 && (
            <>
              <Head title="PROGRAMI YOK" />
              <ul className={`${card} divide-y divide-line overflow-hidden`}>
                {rest.map((a) => (
                  <li key={a.uid} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bg text-[0.8125rem] font-bold text-mut">{initialsOf(a.name)}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{a.name}</span>
                    <button type="button" onClick={() => newFor(a.uid)} className="h-9 shrink-0 rounded-full bg-acc/10 px-3.5 text-[0.875rem] font-semibold text-acc">
                      + Program
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : list && !prog && !todays.length && !all.length ? (
        <div className={`${card} flex flex-col items-center gap-3 px-5 py-8 text-center`}>
          <span className="grid size-14 place-items-center rounded-full bg-acc/10 text-acc">
            <Icon name="dumbbell" className="size-7" />
          </span>
          <b className="text-[1.0625rem] font-semibold">Kendi programın yok</b>
          <p className="text-[0.875rem] text-mut">Hedefini ve günlerini seç, yapay zeka haftalık programını hazırlasın.</p>
          <Button onClick={() => newFor("")}>
            <Icon name="spark" className="size-5" />
            Programımı hazırla
          </Button>
        </div>
      ) : (
        <>
          <TodayCard plan={todays[0]} next={nextOne} week={prog && progWeek(prog, today)} today={today} onOpen={open} />
          {todays.slice(1).map((p) => (
            <button key={p.id} type="button" onClick={() => open(p)} className={`${card} mt-2 flex w-full items-center gap-3 px-4 py-3 text-left`}>
              <Icon name="dumbbell" className="size-5 shrink-0 text-acc" />
              <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{p.fit?.name || p.title}</span>
              <span className="shrink-0 text-[0.8125rem] text-mut">{p.time || STATUS[statusOf(p, today)]}</span>
            </button>
          ))}
          <WeekStrip week={week} strip={strip} today={today} onOpen={open} />
          {prog ? (
            <RowButton icon="cal" title={prog.title || "Programım"} sub={progSub(prog, today, onCal)} onClick={() => setProgOpen(true)} />
          ) : (
            <RowButton icon="spark" title="Programımı hazırla" sub="Kendi programın yok" onClick={() => newFor("")} />
          )}
          {(recs.length > 0 || week.planned > 0 || month.done > 0) && <RowButton icon="trend" title="Gelişim" sub="Bu hafta, en iyiler, bu ay" onClick={() => setGrowOpen(true)} />}
          {history.length > 0 && <RowButton icon="check" title="Geçmiş" sub={`${history.length} antrenman`} onClick={() => setHistOpen(true)} />}
        </>
      )}

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Fitness">
        <MenuRow icon="video" title="Hareketler" sub={libCount.n ? `${libCount.n} hareket · ${libCount.v} videolu` : "Fotoğraf ve videolar"} onClick={() => (setMenuOpen(false), setLibOpen(true))} />
        <MenuRow icon="user" title="Profilim" sub="Boy, kilo, seviye" onClick={() => (setMenuOpen(false), setProfOpen(true))} />
        {(list?.length > 0 || all.length > 0 || fitOthers.length > 0) && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => {
              setMenuOpen(false);
              reset();
            }}
            className="mt-3 h-11 w-full rounded-xl text-[0.875rem] font-semibold text-rec disabled:opacity-50"
          >
            {busy === "reset" ? "Sıfırlanıyor…" : "Fitness'ı sıfırla"}
          </button>
        )}
      </Sheet>

      <DaySheet open={dayOpen} onClose={() => setDayOpen(false)} date={dayDate} setDate={setDayDate} today={today} rows={dayRows(fitOthers, athletes, dayDate, today)} onOpen={(p) => (setDayOpen(false), open(p))} />

      <Sheet open={growOpen} onClose={() => setGrowOpen(false)} title="Gelişim">
        <WeekCard week={week} strip={strip} today={today} onOpen={(p) => (setGrowOpen(false), open(p))} />
        <ProgressCard recs={recs} plans={plans} />
        <MonthCard month={month} today={today} />
      </Sheet>
      <Sheet open={histOpen} onClose={() => setHistOpen(false)} title="Geçmiş">
        <HistoryCard list={history} today={today} onOpen={(p) => (setHistOpen(false), open(p))} />
      </Sheet>

      {prog && (
        <Sheet open={progOpen} onClose={() => setProgOpen(false)} title="Programım">
          <ProgramCard
            bare
            age={fitProf?.age || 0}
            prog={prog}
            today={today}
            onCal={onCal}
            busy={!!busy}
            onEdit={() => {
              setProgOpen(false);
              editProg(prog);
            }}
            onPlan={() => save(prog, true)}
            onUnplan={unplan}
            onDrop={async () => {
              await drop();
              setProgOpen(false);
            }}
          />
        </Sheet>
      )}
      {sheets}
    </main>
  );
}

// Sporcular | Benim | Beslenme (adres: /fitness, ?tab=me, ?tab=food; sporcusu yoksa Sporcular yok)
function Tabs({ tab, setTab, withAth }) {
  const tabs = [withAth && ["ath", "Sporcular"], ["me", "Benim"], ["food", "Beslenme"]].filter(Boolean);
  return (
    <div className={`mb-3 grid gap-1 rounded-full bg-card p-1 shadow-[0_1px_3px_rgba(38,40,44,.08)] ${tabs.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {tabs.map(([k, n]) => (
        <button key={k} type="button" onClick={() => setTab(k)} className={`h-10 rounded-full text-[0.9375rem] font-semibold transition-colors ${tab === k ? "bg-acc text-white" : "text-mut"}`}>
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

const initialsOf = (s) => String(s || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr-TR");
// Sporcu satırının alt yazısı: bugünün antrenmanı, yoksa bu haftanın kaçırılanı, hafta tamamsa "Bu hafta tamam", yoksa sıradaki
function nowLine(r, today) {
  const t = r.week.days.find((d) => d.date === today);
  if (t) return `Bugün: ${t.name} · ${{ done: "yaptı", skip: "atladı", today: "bekliyor" }[t.st] || "bekliyor"}`;
  const miss = r.week.days.filter((d) => d.st === "missed").at(-1);
  if (miss) return `${new Date(`${miss.date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long" })} yapmadı`;
  if (r.week.planned && r.week.done === r.week.planned) return "Bu hafta tamam";
  if (r.next) return `Sıradaki: ${new Date(`${r.next.date}T12:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" })} · ${r.next.fit?.name || r.next.title}`;
  return r.prog?.title || "Bu hafta antrenman yok";
}
// Bu hafta (pazartesiden) 7 gün: yapıldı ✓, yapılmadı ✕, atlandı –, bekleyen gün numarası, antrenmansız gün nokta.
// Antrenmanlı güne dokununca antrenman açılır.
function WeekDots({ row, today, onOpen }) {
  const mon = addDays(today, 1 - dowOf(today));
  return (
    <div className="mt-2 grid grid-cols-7 pl-[3.25rem]">
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(mon, i);
        const d = row.week.days.find((x) => x.date === date);
        const plan = d && row.plans.find((p) => p.id === d.id);
        if (!d) return <span key={date} className="grid h-8 place-items-center"><span className="size-1 rounded-full bg-mut/40" /></span>;
        const look = { done: "bg-acc text-white", missed: "bg-rec/15 text-rec", skip: "bg-line text-mut", today: "border-2 border-acc text-acc", next: "border border-line text-mut" }[d.st];
        return (
          <button key={date} type="button" aria-label={`${d.name} · ${STATUS[d.st]}`} onClick={() => plan && onOpen(plan)} className="grid h-8 place-items-center">
            <span className={`grid size-7 place-items-center rounded-full text-[0.6875rem] font-bold ${look}`}>
              {d.st === "done" ? <Icon name="check" className="size-3.5" /> : d.st === "missed" ? "✕" : d.st === "skip" ? "–" : +date.slice(8)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Sporcu sayfası: üstte geri ve ⋯, koyu kart (ad, yaş · spor · hedef, bu hafta 7 gün, programın kaçıncı haftası),
// tek ana işlem "Programı düzenle", geçen ve gelecek haftanın antrenmanları. Seyrek işler ⋯ penceresinde.
function AthletePage({ name, row, athlete, today, busy, onBack, onReview, onNew, onOpen, onEdit, onPlan, onUnplan, onDrop, onCard, others = [], onContinue, onGive }) {
  const [cont, setCont] = useState(false);
  const [give, setGive] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sure, setSure] = useState(false);
  const [more, setMore] = useState(false);
  const prog = row?.prog;
  const age = ageFrom(athlete?.birth, today) || prog?.forAge || 0;
  const meta = [age ? `${age} yaş` : "", labelOf(SPORTS, prog?.sport), labelOf(GOALS, prog?.goal)].filter(Boolean).join(" · ");
  const pw = prog && progWeek(prog, today);
  const perWeek = prog ? (prog.days || []).length : 0;
  const onCal = row && prog ? row.plans.filter((p) => p.fit?.prog === prog.id && p.date >= today).length : 0;
  const mon = addDays(today, 1 - dowOf(today));
  const from = addDays(today, -7);
  const to = addDays(today, 7);
  const list = row ? row.plans.filter((p) => p.date >= from && p.date <= to).slice(-8).reverse() : [];
  const text = prog ? programText(prog, { age, sport: labelOf(SPORTS, prog.sport) }) : "";
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => {});
  };
  const dayText = (d) => new Date(`${d}T12:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
  const pill = (p) => {
    const st = statusOf(p, today);
    if (st === "done") return ["Yaptı", "bg-acc/12 text-acc"];
    if (st === "missed") return ["Yapmadı", "bg-rec/12 text-rec"];
    if (st === "skip") return ["Atladı", "bg-line text-mut"];
    return [p.time || "Bekliyor", "bg-bg text-mut"];
  };
  return (
    <>
      <div className="sticky top-0 z-10 -mx-5 mb-3 flex items-center gap-2.5 bg-bg/90 px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button type="button" aria-label="Geri" onClick={onBack} className="grid size-11 shrink-0 place-items-center rounded-full bg-card shadow-[0_1px_3px_rgba(38,40,44,.08)]">
          <Icon name="back" className="size-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-semibold">{name}</h1>
        <button type="button" aria-label="Diğer işlemler" onClick={() => (setSure(false), setMore(true))} className="grid size-11 shrink-0 place-items-center rounded-full bg-card shadow-[0_1px_3px_rgba(38,40,44,.08)]">
          <Icon name="more" className="size-5" />
        </button>
      </div>
      <section className="rounded-[1.625rem] bg-deep p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 text-[1rem] font-bold">{initialsOf(name)}</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[1.125rem] font-semibold">{name}</b>
            {meta && <small className="block truncate text-[0.8125rem] text-white/70">{meta}</small>}
          </span>
          {row?.week.planned > 0 && (
            <span className="shrink-0 text-right">
              <b className="block text-[1.25rem] font-bold tabular-nums leading-none">{`${row.week.done}/${row.week.planned}`}</b>
              <small className="text-[0.6875rem] text-white/60">bu hafta</small>
            </span>
          )}
        </div>
        {row && (
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(mon, i);
              const d = row.week.days.find((x) => x.date === date);
              const plan = d && row.plans.find((p) => p.id === d.id);
              const look = !d
                ? "text-white/30"
                : d.st === "done"
                  ? "bg-[#bfe8d6] text-deep"
                  : d.st === "missed"
                    ? "bg-[#f3a39a] text-[#5a1610]"
                    : d.st === "skip"
                      ? "bg-white/15 text-white/70"
                      : "border border-white/50 text-white";
              return (
                <button key={date} type="button" disabled={!plan} onClick={() => plan && onOpen(plan)} className="flex flex-col items-center gap-1">
                  <small className={`text-[0.6875rem] ${date === today ? "font-bold text-white" : "text-white/60"}`}>{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][i]}</small>
                  <span className={`grid h-9 w-full place-items-center rounded-xl text-[0.8125rem] font-bold ${look} ${date === today && d ? "ring-2 ring-white" : ""}`}>
                    {!d ? "·" : d.st === "done" ? <Icon name="check" className="size-4" /> : d.st === "missed" ? "✕" : d.st === "skip" ? "–" : +date.slice(8)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {prog && (
          <p className="mt-4 border-t border-white/15 pt-3 text-[0.8125rem] text-white/75">
            {[prog.title || "Program", pw && pw.n ? `${Math.min(pw.n, pw.of)}. hafta / ${pw.of}` : pw ? `${pw.of} hafta` : "", perWeek ? `Haftada ${perWeek} gün` : ""].filter(Boolean).join(" · ")}
          </p>
        )}
      </section>

      {prog ? (
        <>
          <div className="mt-3">
            <Button onClick={() => onEdit(prog)}>
              <Icon name="edit" className="size-5" />
              Programı düzenle
            </Button>
            <Button variant="secondary" onClick={onReview} className="mt-2">
              Değerlendirme
            </Button>
          </div>
          {listOpen && (
            <div className={`${card} mt-2 p-3`}>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-[0.8125rem] leading-snug">{text}</pre>
              <button type="button" onClick={copy} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white">
                <Icon name={copied ? "check" : "copy"} className="size-4" />
                {copied ? "Kopyalandı" : "Kopyala"}
              </button>
              <button type="button" onClick={() => setListOpen(false)} className="mt-1 h-10 w-full text-[0.875rem] font-semibold text-mut">
                Kapat
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-3">
          <Button onClick={onNew}>
            <Icon name="spark" className="size-5" />
            Program hazırla
          </Button>
        </div>
      )}

      {row && (
        <>
          <small className="mt-4 block text-[0.75rem] font-bold tracking-[.06em] text-mut">ANTRENMANLAR</small>
          {list.length ? (
            <ul className={`${card} mt-1.5 divide-y divide-line overflow-hidden`}>
              {list.map((p) => {
                const [t, c] = pill(p);
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => onOpen(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <span className="w-[4.5rem] shrink-0 text-[0.8125rem] text-mut">{dayText(p.date)}</span>
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{p.fit?.name || p.title}</span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${c}`}>{t}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-[0.8125rem] text-mut">Bu iki haftada antrenman yok.</p>
          )}
        </>
      )}

      <Sheet open={more} onClose={() => setMore(false)} title={name}>
        {prog && (
          <>
            <MenuRow icon="copy" title="Liste olarak al" sub="Programı yazı olarak kopyala" onClick={() => (setMore(false), setCopied(false), setListOpen(true))} />
            <MenuRow
              icon="cal"
              title={onCal > 0 ? "Takvimden kaldır" : "Planlara ekle"}
              sub={onCal > 0 ? `${onCal} antrenman takvimde` : "Antrenmanları takvime yaz"}
              onClick={() => (setMore(false), onCal > 0 ? onUnplan(prog) : onPlan(prog))}
            />
            <MenuRow icon="trend" title="Devam ettir" sub="Seviye artır, yeni başlangıç tarihi" onClick={() => (setMore(false), setCont(true))} />
            {others.length > 0 && <MenuRow icon="users" title="Başka sporcuya ver" sub="Aynı programı başka sporcuya da ekle" onClick={() => (setMore(false), setGive(true))} />}
            <MenuRow icon="spark" title="Yeni program hazırla" sub="Bu programın yerine" onClick={() => (setMore(false), onNew())} />
          </>
        )}
        {onCard && <MenuRow icon="user" title="Sporcu sayfasını aç" sub="Kart, yoklama, aidat" onClick={() => (setMore(false), onCard())} />}
        {prog && (
          <button
            type="button"
            disabled={busy}
            onClick={() => (sure ? (setMore(false), onDrop(prog)) : setSure(true))}
            className="mt-3 h-12 w-full rounded-2xl bg-rec/10 text-[0.9375rem] font-semibold text-rec disabled:opacity-50"
          >
            {sure ? "Emin misin? Silmek için yeniden dokun" : "Programı sil"}
          </button>
        )}
        <button type="button" onClick={() => setMore(false)} className="mt-1 h-11 w-full text-[0.9375rem] font-semibold text-mut">
          Vazgeç
        </button>
      </Sheet>
      {prog && <ContinueSheet key={cont ? "o" : "c"} open={cont} onClose={() => setCont(false)} prog={prog} today={today} onGo={(n, start, weeks) => (setCont(false), onContinue(prog, n, start, weeks))} />}
      {prog && <GiveSheet key={give ? "o" : "c"} open={give} onClose={() => setGive(false)} others={others} today={today} onGo={(a, start) => (setGive(false), onGive(prog, a, start))} />}
    </>
  );
}

// Programı devam ettir: seviye (her seviye +2 tekrar), başlangıç ve hafta seçilir, yeni program Hazır ekranında açılır
function ContinueSheet({ open, onClose, prog, today, onGo }) {
  const end = progEnd(prog);
  const [n, setN] = useState(1);
  const [start, setStart] = useState(end && end > today ? end : today);
  const [weeks, setWeeks] = useState(prog.weeks || 4);
  const sample = (prog.days || []).flatMap((d) => d.items || []).find((it) => it.kind === "reps");
  return (
    <Sheet open={open} onClose={onClose} title="Devam ettir">
      <p className="text-[0.875rem] text-mut">Aynı program, her harekette daha çok tekrar. Süreli hareketler aynı kalır.</p>
      <small className="mt-4 block text-[0.75rem] font-bold tracking-[.06em] text-mut">SEVİYE</small>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5">
        {Array.from({ length: LEVEL_MAX }, (_, i) => i + 1).map((k) => (
          <button key={k} type="button" onClick={() => setN(k)} className={`flex h-14 flex-col items-center justify-center rounded-2xl ${n === k ? "bg-acc text-white" : "bg-bg text-fg"}`}>
            <b className="text-[1rem] leading-none">{`+${k}`}</b>
            <small className={`mt-1 text-[0.6875rem] ${n === k ? "text-white/80" : "text-mut"}`}>{`+${2 * k} tekrar`}</small>
          </button>
        ))}
      </div>
      {sample && <p className="mt-2 text-[0.8125rem] text-mut">{`Örnek: ${sample.name} ${sample.sets} × ${sample.reps} → ${sample.sets} × ${Math.min(100, sample.reps + 2 * n)}`}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="block">
          <small className="text-[0.75rem] font-bold tracking-[.06em] text-mut">BAŞLANGIÇ</small>
          <input type="date" value={start} min={today} onChange={(e) => setStart(e.target.value)} className="mt-1.5 h-12 w-full min-w-0 appearance-none rounded-2xl bg-bg px-3 text-[0.9375rem]" />
        </label>
        <div>
          <small className="text-[0.75rem] font-bold tracking-[.06em] text-mut">HAFTA</small>
          <div className="mt-1.5 flex h-12 items-center justify-between rounded-2xl bg-bg px-1">
            <button type="button" aria-label="Azalt" onClick={() => setWeeks((w) => Math.max(1, w - 1))} className="grid size-10 place-items-center"><Icon name="minus" className="size-4" /></button>
            <b className="text-[1rem] tabular-nums">{weeks}</b>
            <button type="button" aria-label="Artır" onClick={() => setWeeks((w) => Math.min(26, w + 1))} className="grid size-10 place-items-center"><Icon name="plus" className="size-4" /></button>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <Button disabled={!start} onClick={() => onGo(n, start, weeks)}>Hazırla</Button>
      </div>
      <button type="button" onClick={onClose} className="mt-1 h-11 w-full text-[0.9375rem] font-semibold text-mut">Vazgeç</button>
    </Sheet>
  );
}

// Aynı programı başka sporcuya ver: sporcu ve başlangıç seçilir, program o sporcu için Hazır ekranında açılır
function GiveSheet({ open, onClose, others, today, onGo }) {
  const [start, setStart] = useState(today);
  return (
    <Sheet open={open} onClose={onClose} title="Başka sporcuya ver">
      <p className="text-[0.875rem] text-mut">Aynı hareketler, setler ve günler. Kaydetmeden önce gözden geçirirsin.</p>
      <label className="mt-4 block">
        <small className="text-[0.75rem] font-bold tracking-[.06em] text-mut">BAŞLANGIÇ</small>
        <input type="date" value={start} min={today} onChange={(e) => setStart(e.target.value)} className="mt-1.5 h-12 w-full min-w-0 appearance-none rounded-2xl bg-bg px-3 text-[0.9375rem]" />
      </label>
      <small className="mt-4 block text-[0.75rem] font-bold tracking-[.06em] text-mut">SPORCU</small>
      <ul className="mt-1.5 divide-y divide-line">
        {others.map((a) => (
          <li key={a.uid}>
            <button type="button" disabled={!start} onClick={() => onGo(a, start)} className="flex w-full items-center gap-3 py-3 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.8125rem] font-bold text-acc">{initialsOf(a.name)}</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{a.name}</b>
                {a.has && <small className="block text-[0.75rem] text-mut">Şimdiki programının yerine geçer</small>}
              </span>
              <Icon name="chev" className="size-4 text-mut" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="mt-1 h-11 w-full text-[0.9375rem] font-semibold text-mut">Vazgeç</button>
    </Sheet>
  );
}

// Bölüm başlığı (küçük harf aralıklı), sağda isteğe bağlı düğme
function Head({ title, action, onAction }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between">
      <small className="text-[0.75rem] font-bold tracking-[.06em] text-mut">{title}</small>
      {action && (
        <button type="button" onClick={onAction} className="h-8 px-1 text-[0.875rem] font-semibold text-acc">
          {action}
        </button>
      )}
    </div>
  );
}

// Pencere satırı: solda simge dairesi, ad ve açıklama, sağda ok
function MenuRow({ icon, title, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-1 py-2.5 text-left">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold">{title}</b>
        {sub && <small className="block truncate text-[0.8125rem] text-mut">{sub}</small>}
      </span>
      <Icon name="chev" className="size-4 shrink-0 text-mut" />
    </button>
  );
}

// Gün gün sporcuların antrenmanı: ‹ › ile gün değişir, satıra dokununca antrenman açılır
function DaySheet({ open, onClose, date, setDate, today, rows, onOpen }) {
  const title = date === today ? "Bugün" : new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const pill = (st, p) =>
    st === "done" ? ["Yaptı", "bg-acc/12 text-acc"] : st === "missed" ? ["Yapmadı", "bg-rec/12 text-rec"] : st === "skip" ? ["Atladı", "bg-line text-mut"] : [p.time || "Bekliyor", "bg-bg text-mut"];
  return (
    <Sheet open={open} onClose={onClose} title="Sporcuların antrenmanı">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Önceki gün" onClick={() => setDate(addDays(date, -1))} className="grid size-11 place-items-center rounded-full bg-bg">
          <Icon name="chev" className="size-4 rotate-180" />
        </button>
        <b className="min-w-0 flex-1 truncate text-center text-[1rem] font-semibold">{title}</b>
        <button type="button" aria-label="Sonraki gün" onClick={() => setDate(addDays(date, 1))} className="grid size-11 place-items-center rounded-full bg-bg">
          <Icon name="chev" className="size-4" />
        </button>
      </div>
      {rows.length ? (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((r) => {
            const [t, c] = pill(r.st, r.plan);
            return (
              <li key={r.plan.id}>
                <button type="button" onClick={() => onOpen(r.plan)} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.8125rem] font-bold text-acc">{initialsOf(r.name)}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{r.name}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">{r.plan.fit?.name || r.plan.title}</small>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${c}`}>{t}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-[0.875rem] text-mut">Bu gün sporcu antrenmanı yok</p>
      )}
    </Sheet>
  );
}
