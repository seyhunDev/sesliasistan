"use client";

import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { todayStr } from "@/lib/utils/format";
import {
  GOALS, LEVEL_MAX, SPORTS, STATUS, addDays, ageFrom, copyFor, levelUp, progEnd, athleteRows, upcomingList, dayLine, dayRows, cleanItem, cleanProgram, dowOf, fitPlans, itemLine, labelOf, monthStats, programText, progWeek, records, resLine, statusOf, weekStats,
} from "@/lib/fitness/model";
import { libList, progWithLib } from "@/lib/fitness/library";
import { useOrtak } from "./useOrtak";
import { HazirProgramlar } from "./HazirProgramlar";
import { VeloraHareketler } from "./VeloraHareketler";
import { useFitLib } from "./useFitLib";
import { kindOf } from "@/lib/kinds";
import { FIT_PREVIEW, FIT_SAVED, activeOf, adoptProgram, spreadLib, askFitness, deleteProgram, loadPrograms, resetFitness, notifyProgram, removePlans, dropFrom, saveProfile, saveProgram, syncPlans, takeProgram, peekProgram, peekPrograms, relinkPrograms } from "./fitnessData";
import { NewProgram, ProfileFields } from "./NewProgram";
import { importFile, importText } from "./fitImport";
import { TEMPLATES, fromTemplate } from "@/lib/fitness/templates";
import { ProgramEditor } from "./ProgramEditor";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { BodyStep, FitIntro } from "./FitIntro";
import { HistoryCard, MonthCard, ProgramCard, ProgressCard, WeekCard, progSub } from "./FitDashboard";
import { FoodView } from "./FoodView";
import { DOW, FsHead, WeekBoxes } from "./FitDark";
import { liveHead } from "@/features/liveScreen/fonts";
import "./fitSahne.css";
import { FitReview } from "./FitReview";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrollBar } from "@/components/ui/ScrollBar";
import { nudgeFit } from "./fitnessData";

// Fitness sayfası (yalnız ana hesap), sade: bugünkü antrenman (Başla), bu hafta (7 gün), "Programım" satırı (pencerede günler, düzenle,
// planlara ekle, profil) ve kapalı "Gelişim ve geçmiş" (halka, seri, gelişim, bu ay, geçmiş; parçalar FitDashboard.jsx). Takip planlardan hesaplanır (ek okuma yok); programlar tek sorgu.
// Program yapay zekayla hazırlanır (Program hazırla: günler, saat, hafta, süre, profil) ya da asistana söylenir; önizlemede açılır.
// İlk antrenman: başlangıçtan sonraki ilk seçili gün (yeni programda başlangıç geçmişteyse bugün)
// Raporda sporcunun altı: "14 yaş · Yelken"
const athMeta = (a, prog, today) => [ageFrom(a?.birth, today) || prog?.forAge ? `${ageFrom(a?.birth, today) || prog?.forAge} yaş` : "", labelOf(SPORTS, prog?.sport)].filter(Boolean).join(" · ");
const fixStart = (p) => ({ ...p, start: p.start && (p.id || p.start >= todayStr()) ? p.start : todayStr() });

export function FitnessHome() {
  const confirmAsk = useConfirm();
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
  // Hazır programlar ve Velora hareketleri (Seyhun 2026-11-27): herkes görür; Velora sahibi olmayan hesapta Hareketler önce Velora'nınkiler
  const ortak = useOrtak();
  const [hazirOpen, setHazirOpen] = useState(false);
  const [veloraOpen, setVeloraOpen] = useState(false);
  const [newTpl, setNewTpl] = useState("");
  const pickHazir = (t) => {
    setHazirOpen(false);
    setNewTpl(t.id);
    setNewOpen(true);
  };
  const closeNew = () => {
    setNewOpen(false);
    setNewTpl("");
  };
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
  // Yeniden açılan sporcu hesabı: eski hesaba bağlı programları ona taşı (oturumda bir kez)
  const relinked = useRef(false);
  useEffect(() => {
    if (relinked.current || !list?.length || !athletes.length) return;
    relinked.current = true;
    relinkPrograms(orgId, list, athletes)
      .then((n) => n && reload(true))
      .catch(() => {});
  }, [list, athletes, orgId, reload]);

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

  // Admin › Uzman sayfası "Program hazırla": /fitness?hazirla=<sporcu uid> o sporcu seçili açılır
  const hazirlaQ = sp.get("hazirla") || "";
  useEffect(() => {
    if (!hazirlaQ) return;
    const ac = () => {
      setForUid(hazirlaQ);
      setNewGoal("");
      setAskErr("");
      setDayOpen(false);
      setNewOpen(true);
    };
    ac();
    router.replace("/fitness", { scroll: false });
  }, [hazirlaQ, router]);

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
      const who = pre.for ? { for: pre.for, forName: pre.forName, forAge: f.age || 0, sport: f.sport || "", forSex: f.sex || "" } : {};
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
      const who = pre.for ? { for: pre.for, forName: pre.forName, forAge: f.age || 0, sport: f.sport || "", forSex: f.sex || "" } : {};
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
    const t = pre.tpl || TEMPLATES.find((x) => x.id === id);
    const p0 = fromTemplate(id, pre.start, pre.times, ortak.hazir);
    // Velora sahibi olmayan hesapta hareketler Velora'nın fotoğraf, animasyon ve açıklamalarıyla gelir
    const p = p0 && !ortak.velora && ortak.lib ? progWithLib(p0, ortak.lib) : p0;
    if (!t || !p) return;
    const who = pre.for ? { for: pre.for, forName: pre.forName, forAge: f.age || t.forAge || 0, sport: f.sport || t.sport || "", forSex: f.sex || t.forSex || "" } : {};
    setNewOpen(false);
    setEdit({ prog: fixStart({ ...p, ...who, title: pre.for ? `${pre.forName} · ${t.title}` : p.title }), fresh: true, k: Date.now() });
  }

  function blank(pre, f) {
    if (!pre.for) saveProfile(uid, f).then(setFitProf).catch(() => {});
    setNewOpen(false);
    const days = pre.days.map((dow) => ({ dow, time: pre.time, min: pre.min, name: "Antrenman", items: [cleanItem({ ex: "warmup", min: 5 }), cleanItem({ ex: "stretch", min: 5 })] }));
    const who = pre.for ? { for: pre.for, forName: pre.forName, forAge: f?.age || 0, sport: f?.sport || "", forSex: f?.sex || "" } : {};
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
    if (!(await confirmAsk({ title: "Program silinsin mi?", text: "Bütün antrenmanları (yapılanlar dahil) silinir. Hareketler, fotoğraf ve videolar kalır." }))) return false;
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
    if (!(await confirmAsk({ title: "Fitness sıfırlansın mı?", text: "Bütün programlar (sporcularınki dahil), antrenmanlar, fotoğraf ve videolar silinir. Boy, kilo ve beslenme kalır.", yes: "Sıfırla" }))) return;
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
      <main className={`fs ${liveHead.variable} mx-auto min-h-dvh max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]`}>
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

  // Bütün Fitness ekranları "Sahne" (Seyhun 2026-11-25, fitSahne.css): ana sayfadaki üst çubuk (geri · ad ve tarih · ⋯ · limon +), sekme kapsülü
  const darkTop = (more) => (
    <>
      <FsHead onMore={more ? () => setMenuOpen(true) : undefined} onAdd={() => newFor("")} addLabel="Program hazırla" />
      <Tabs tab={tab} setTab={setTab} withAth={athletes.length > 0} />
    </>
  );
  const darkMain = `fs ${liveHead.variable} relative mx-auto min-h-dvh max-w-[30rem] px-4 pb-[calc(var(--stage-h,6rem)+2rem)] md:max-w-[40rem]`;

  if (tab === "food") {
    return (
      <main className={darkMain}>
        {darkTop(false)}
        <div className="relative">
          <FoodView orgId={orgId} uid={uid} fit={fitProf} fitW={profile.fitW} trainDays={prog?.days?.length || 3} onBody={() => setBodyOpen(true)} />
        </div>
        {bodySheet}
      </main>
    );
  }

  // Program listesi ilk kez okunuyor ve takvimde fitness antrenmanı yok: tanıtım mı program mı belli değil,
  // ikisinden birini çizip sonra değiştirmek yerine aynı yerde sakin bir iskelet (zıplama olmasın)
  if (!list && !all.length) {
    return (
      <main className={darkMain}>
        {darkTop(false)}
        <div aria-hidden="true" className="relative mt-4 grid gap-3">
          <div className="ck-shim h-36 rounded-2xl" />
          <div className="ck-shim h-20 rounded-2xl" />
          <div className="ck-shim h-14 rounded-2xl" />
        </div>
      </main>
    );
  }

  // Hiç programı, fitness antrenmanı ve program verilecek sporcusu yoksa: tek ekran tanıtım, "Programımı hazırla" (hedef ve hafta pencerede sorulur)
  if (mine && !mine.length && !all.length && !rows.length && !athletes.length) {
    return (
      <main className={darkMain}>
        {darkTop(false)}
        <div className="relative">
        <FitIntro
          name={profile.name}
          onStart={(g) => {
            setNewGoal(g);
            setNewOpen(true);
          }}
        />
          <button type="button" onClick={() => setHazirOpen(true)} data-press className="btn btn-secondary mt-3 w-full">
            Hazır programlar
          </button>
        </div>
        <HazirProgramlar open={hazirOpen} onClose={() => setHazirOpen(false)} onPick={pickHazir} orgId={orgId} mine={list || []} />
        <NewProgram key={newOpen ? `o${newTpl}` : "n"} goal={newGoal} startTpl={newTpl} athletes={athletes} open={newOpen} onClose={closeNew} profile={fitProf} onAsk={ask} onBlank={blank} onImport={importProg} onTemplate={template} busy={busy === "ask" || busy === "import"} error={askErr} />
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
      <HazirProgramlar open={hazirOpen} onClose={() => setHazirOpen(false)} onPick={pickHazir} orgId={orgId} mine={list || []} />
      <VeloraHareketler open={veloraOpen} onClose={() => setVeloraOpen(false)} mineCount={libCount.n} onMine={() => (setVeloraOpen(false), setLibOpen(true))} />
      <NewProgram key={newOpen ? `o${forUid}${newTpl}` : "n"} forUid={forUid} startTpl={newTpl} athletes={athletes} open={newOpen} onClose={closeNew} profile={fitProf} onAsk={ask} onBlank={blank} onImport={importProg} onTemplate={template} busy={busy === "ask" || busy === "import"} error={askErr} />
      <ProfileSheet key={profOpen ? "po" : "pc"} open={profOpen} onClose={() => setProfOpen(false)} value={fitProf} onSave={async (f) => setFitProf(await saveProfile(uid, f))} />
    </>
  );

  // Sporcunun haftalık değerlendirmesi (sporcu sayfasındaki Değerlendirme): tam sayfa, geri ile sporcu sayfasına
  if (ath && revOpen && (selRow || selAth)) {
    return (
      <main className={`fs ${liveHead.variable} mx-auto min-h-dvh max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)] md:max-w-[40rem]`}>
        <FitReview orgId={orgId} uid={ath} name={selAth?.name || selRow?.name || ""} meta={athMeta(selAth, selRow?.prog, today)} prog={selRow?.prog} plans={selRow?.plans || []} today={today} onBack={() => setRevOpen(false)} />
      </main>
    );
  }

  // Sporcu sayfası (Sporcular listesinden): tam sayfa, geri ile listeye
  if (ath && (selRow || selAth)) {
    return (
      <main className={`fs ${liveHead.variable} mx-auto min-h-dvh max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)] md:max-w-[40rem]`}>
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
  // Benim (yeni tasarım, 2026-11-03; sporcunun Fitness sayfası gibi): bugünün antrenmanı büyük, bu hafta çubuğu ve Pzt–Paz kutuları, tek ana düğme;
  // altta bugünkü hareketler, sıradaki antrenmanlar, Program (Programım · Gelişim · Geçmiş pencereleri)
  const plan = todays[0];
  const st = plan && statusOf(plan, today);
  const moves = (plan?.fit?.items || []).filter((it) => !["warmup", "stretch"].includes(it.ex));
  const started = plan?.fit?.res?.ex?.some((e) => e.sets?.some((x) => x.ok));
  const nexts = [...todays.slice(1), ...all.filter((p) => p.date > today).slice(0, 5)];
  const sub = !plan
    ? null
    : st === "done"
      ? [["Yaptın", "text-[#d4ff3a]"], plan.fit?.res?.min && [`${plan.fit.res.min} dk`], resLine(plan.fit) && [resLine(plan.fit)]]
      : st === "skip"
        ? [["Atladın"]]
        : [[`${moves.length} hareket`], [`${moves.reduce((t, it) => t + (+it.sets || 1), 0)} set`]];

  const menuSheet = (
    <>
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Fitness">
        {tab === "ath" && <MenuRow icon="cal" title="Gün gün" sub="Sporcuların günlük antrenmanı" onClick={() => (setMenuOpen(false), setDayDate(today), setDayOpen(true))} />}
        <MenuRow icon="dumbbell" title="Hazır programlar" sub="Velora'nın hazırladığı programlar" onClick={() => (setMenuOpen(false), setHazirOpen(true))} />
        <MenuRow icon="video" title="Hareketler" sub={ortak.velora ? (libCount.n ? `${libCount.n} hareket · ${libCount.v} videolu` : "Fotoğraf ve videolar") : "Velora hareketleri ve seninkiler"} onClick={() => (setMenuOpen(false), ortak.velora ? setLibOpen(true) : setVeloraOpen(true))} />
        <MenuRow icon="user" title="Profilim" sub="Boy, kilo, seviye" onClick={() => (setMenuOpen(false), setProfOpen(true))} />
        {(list?.length > 0 || all.length > 0 || fitOthers.length > 0) && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => {
              setMenuOpen(false);
              reset();
            }}
            data-press className="btn btn-danger mt-3 w-full"
          >
            {busy === "reset" ? "Sıfırlanıyor…" : "Fitness'ı sıfırla"}
          </button>
        )}
      </Sheet>

      <DaySheet open={dayOpen} onClose={() => setDayOpen(false)} date={dayDate} setDate={setDayDate} today={today} rows={dayRows(fitOthers, athletes, dayDate, today)} onOpen={(p) => (setDayOpen(false), open(p))} />
    </>
  );

  // Sporcular (Seyhun 2026-11-25 "B · Kokpit", örnek fitness-sade/ornek.html): açık sayfa, üstte lacivert kokpit (bugün kaç sporcu, durum çubuğu),
  // altta sporcular duruma göre gruplu: Yapmadı (Hatırlat) · Bekliyor · Yaptı · Atladı · Bugün yok · Programı yok
  if (tab === "ath") {
    return (
      <main className={darkMain}>
        <ScrollBar title="Fitness">
          <button type="button" onClick={() => newFor("")} aria-label="Program hazırla" data-press className="fs-rb fs-add size-9">
            <Icon name="plus" className="size-5" />
          </button>
        </ScrollBar>
        <AthTab
          today={today}
          todayRows={todayRows}
          rows={rows}
          rest={rest}
          orgId={orgId}
          top={darkTop(true)}
          onAth={(uid) => (setRevOpen(false), setAth(uid))}
          onNew={newFor}
        />
        {menuSheet}
        {sheets}
      </main>
    );
  }

  return (
    <main className={darkMain}>
      {darkTop(true)}

      {list && !prog && !todays.length && !all.length ? (
        <section className="relative mt-4">
          <h2 className="fs-c text-[2.75rem]">Kendi programın yok</h2>
          <Button full onClick={() => newFor("")} className="mt-4">
            Programımı hazırla
          </Button>
        </section>
      ) : (
        <div className="relative">
          {/* Bugünün antrenmanı: ana sayfadaki turuncu fitness kartı (Sahne) */}
          <section className="fs-hero p-4">
            <span className="fs-k text-[#ff7a1a]">{`Bugün · ${shortDay(today)}${plan?.time ? ` · ${plan.time}` : ""}`}</span>
            <h2 className="fs-c mt-1.5 text-[2.9rem] [overflow-wrap:anywhere]">{plan ? plan.fit?.name || plan.title : "Dinlenme günü"}</h2>
            {plan && st !== "done" && st !== "skip" && moves.length > 0 && (
              <div className="mt-2.5 flex gap-5 text-[0.8125rem] text-[#d4d4d8]">
                <span><b className="num block text-[1.25rem] font-bold text-white">{moves.length}</b>hareket</span>
                <span><b className="num block text-[1.25rem] font-bold text-white">{moves.reduce((t, it) => t + (+it.sets || 1), 0)}</b>set</span>
                {plan.durationMin > 0 && <span><b className="num block text-[1.25rem] font-bold text-white">{`~${plan.durationMin}`}</b>dakika</span>}
              </div>
            )}
            {sub && (st === "done" || st === "skip") && (
              <p className="mt-1.5 truncate text-[0.9375rem] text-[#d4d4d8]">
                {sub.filter(Boolean).map(([t, cl], i) => (
                  <span key={t} className={cl}>
                    {i ? " · " : ""}
                    {t}
                  </span>
                ))}
              </p>
            )}
            {plan && (
              <button type="button" onClick={() => open(plan)} data-press className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[#d4ff3a] text-[1.0625rem] font-extrabold text-[#111]">
                {st === "done" || st === "skip" ? "Sonucu aç" : started ? "Devam et" : "Antrenmana başla"}
              </button>
            )}
          </section>

          <section className="mt-6">
            <div className="mx-1 mb-2 flex items-baseline justify-between">
              <h3 className="fs-c text-[1.375rem]">Bu hafta</h3>
              {week.planned > 0 && <span className="num text-[1rem] font-semibold text-mut">{`${week.done}/${week.planned}`}</span>}
            </div>
            <WeekBoxes days={week.days} today={today} onOpen={open} />
          </section>

          {plan && st !== "done" && st !== "skip" && moves.length > 0 && (
            <section className="mt-7">
              <ListHead title="Bugünkü hareketler" count={moves.length} />
              <RowList>
                {moves.map((it, i) => (
                  <Row
                    key={i}
                    lead={<span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[.08] text-[0.75rem] font-bold tabular-nums">{i + 1}</span>}
                    title={it.name}
                    right={<span className="text-[0.8125rem] font-semibold text-mut">{itemLine(it)}</span>}
                  />
                ))}
              </RowList>
            </section>
          )}

          {nexts.length > 0 && (
            <section className="mt-7">
              <ListHead title="Sıradaki" count={nexts.length} />
              <RowList>
                {nexts.map((p) => (
                  <Row key={p.id} onClick={() => open(p)} title={p.fit?.name || p.title} sub={[p.date === today ? STATUS[statusOf(p, today)] : shortDay(p.date), p.time].filter(Boolean).join(" · ")} />
                ))}
              </RowList>
            </section>
          )}

          <section className="mt-7">
            <ListHead title="Program" />
            <RowList>
              {prog ? <Row onClick={() => setProgOpen(true)} title={prog.title || "Programım"} sub={progSub(prog, today, onCal)} /> : <Row onClick={() => newFor("")} title="Programımı hazırla" />}
              {(recs.length > 0 || week.planned > 0 || month.done > 0) && <Row onClick={() => setGrowOpen(true)} title="Gelişim" />}
              {history.length > 0 && <Row onClick={() => setHistOpen(true)} title="Geçmiş" right={<span className="text-[0.8125rem] font-semibold text-mut">{history.length}</span>} />}
            </RowList>
          </section>
        </div>
      )}

      {menuSheet}

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

// Sporcular | Benim | Beslenme (adres: /fitness, ?tab=me, ?tab=food; sporcusu yoksa Sporcular yok). Sahne: koyu kapsül, seçili beyaz
function Tabs({ tab, setTab, withAth }) {
  const tabs = [withAth && ["ath", "Sporcular"], ["me", "Benim"], ["food", "Beslenme"]].filter(Boolean);
  return (
    <div className={`mb-4 grid gap-1 rounded-full border border-[#26262b] bg-[#17171a] p-1 ${tabs.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {tabs.map(([k, n]) => (
        <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={`h-10 rounded-full text-[0.9375rem] font-bold transition-colors ${tab === k ? "bg-white text-[#111]" : "text-[#a1a1aa]"}`}>
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
const shortDay = (d) => new Date(`${d}T12:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");

// Sporcular sekmesi ("B · Kokpit", 2026-11-25): lacivert üstte bugünün dev rakamı ve durum çubuğu; altta sporcular duruma göre gruplu.
// Yapmayan en üstte, "Hatırlat" ile sporcuya tek bildirim (antrenman başına bir kez). Satıra dokununca sporcunun sayfası açılır.
const ST_COL = { done: "#d4ff3a", wait: "#fff", missed: "#ff6b6b", skip: "#3f3f46" };
function AthTab({ today, todayRows, rows, rest, orgId, top, onAth, onNew }) {
  const toast = useToast();
  const [sent, setSent] = useState({});
  const grp = (k) => todayRows.filter((r) => (k === "wait" ? r.st === "today" || r.st === "next" : r.st === k));
  const by = { missed: grp("missed"), wait: grp("wait"), done: grp("done"), skip: grp("skip") };
  const off = rows.filter((r) => !todayRows.some((t) => t.uid === r.uid));
  const wkOf = (uid) => rows.find((r) => r.uid === uid)?.week;
  const count = (uid, cls) => {
    const w = wkOf(uid);
    return w?.planned ? <span className={`num shrink-0 text-[1rem] font-semibold ${cls}`}>{`${w.done}/${w.planned}`}</span> : null;
  };
  const nameOf = (r) => r.plan?.fit?.name || r.plan?.title || "Antrenman";
  const nudge = async (r) => {
    setSent((x) => ({ ...x, [r.plan.id]: 1 }));
    const n = await nudgeFit(orgId, r.plan.id);
    if (!n) setSent((x) => ({ ...x, [r.plan.id]: 0 }));
    toast(n ? `${r.name.split(" ")[0]} için hatırlatma gitti` : n === 0 ? "Telefonuna bildirim gitmedi" : "Gönderilemedi");
  };
  const parts = [
    ["done", "yaptı"],
    ["wait", "bekliyor"],
    ["missed", "yapmadı"],
    ["skip", "atladı"],
  ].filter(([k]) => by[k].length);
  const date = new Date(`${today}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <>
      {top}
      <section>
        <span className="fs-k">{`Bugün · ${date}`}</span>
        {todayRows.length ? (
          <>
            <h2 className="fs-c mt-1 text-[3.4rem]">
              <span className="num text-[#d4ff3a]">{todayRows.length}</span> sporcu
              <br />
              antrenmanda
            </h2>
            <div className="mt-4 flex h-2.5 gap-1">
              {parts.map(([k]) => (
                <i key={k} className="rounded-[3px]" style={{ flex: by[k].length, background: ST_COL[k] }} />
              ))}
            </div>
            <div className="mt-2.5 flex justify-between gap-3 text-[0.9375rem] text-[#d4d4d8]">
              {parts.map(([k, t]) => (
                <span key={k}>
                  <b className="num mr-1 text-[1.15rem] font-bold text-white">{by[k].length}</b>
                  {t}
                </span>
              ))}
            </div>
          </>
        ) : (
          <h2 className="fs-c mt-1 text-[2.75rem]">Bugün antrenman yok</h2>
        )}
      </section>

      <div className="mt-6 space-y-5">
        <Group title="Yapmadı" n={by.missed.length} tone="text-[#ff6b6b]">
          {by.missed.map((r) => (
            <AthRow key={r.uid} name={r.name} sub={nameOf(r)} onClick={() => onAth(r.uid)}>
              {r.plan.fitNudgeAt || sent[r.plan.id] ? (
                <span className="shrink-0 text-[0.9375rem] font-semibold text-mut">Gönderildi</span>
              ) : (
                <button type="button" onClick={() => nudge(r)} data-press className="fs-pill">
                  Hatırlat
                </button>
              )}
            </AthRow>
          ))}
        </Group>
        <Group title="Bekliyor" n={by.wait.length}>
          {by.wait.map((r) => (
            <AthRow key={r.uid} name={r.name} sub={[nameOf(r), r.plan.time].filter(Boolean).join(" · ")} onClick={() => onAth(r.uid)}>
              {count(r.uid, "text-white")}
            </AthRow>
          ))}
        </Group>
        <Group title="Yaptı" n={by.done.length} tone="text-[#d4ff3a]">
          {by.done.map((r) => (
            <AthRow key={r.uid} name={r.name} sub={[nameOf(r), r.plan.fit?.res?.min && `${r.plan.fit.res.min} dk`].filter(Boolean).join(" · ")} onClick={() => onAth(r.uid)}>
              {count(r.uid, "text-ok")}
            </AthRow>
          ))}
        </Group>
        <Group title="Atladı" n={by.skip.length}>
          {by.skip.map((r) => (
            <AthRow key={r.uid} name={r.name} sub={nameOf(r)} onClick={() => onAth(r.uid)}>
              {count(r.uid, "text-mut")}
            </AthRow>
          ))}
        </Group>
        <Group title={todayRows.length ? "Bugün antrenmanı yok" : "Sporcular"} n={off.length}>
          {off.map((r) => (
            <AthRow key={r.uid} name={r.name} sub={r.next ? `Sıradaki ${shortDay(r.next.date)}` : "Bu hafta antrenman yok"} onClick={() => onAth(r.uid)}>
              {count(r.uid, "text-mut")}
            </AthRow>
          ))}
        </Group>
        <Group title="Programı yok" n={rest.length}>
          {rest.map((a) => (
            <AthRow key={a.uid} name={a.name}>
              <button type="button" onClick={() => onNew(a.uid)} data-press className="fs-pill fs-g">
                + Program
              </button>
            </AthRow>
          ))}
        </Group>
      </div>
    </>
  );
}

function Group({ title, n, tone = "", children }) {
  if (!n) return null;
  return (
    <section>
      <div className="mx-1 mb-2 flex items-baseline justify-between">
        <h3 className={`fs-c text-[1.375rem] ${tone}`}>{title}</h3>
        <span className="num text-[1rem] font-semibold text-mut">{n}</span>
      </div>
      <div className="fs-list">{children}</div>
    </section>
  );
}

// Sporcu satırı: büyük ad ve tek alt satır; sağda tek şey (haftalık sayı ya da düğme). Ada dokununca sporcu sayfası
function AthRow({ name, sub, onClick, children }) {
  const body = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1f1f22] text-[0.9375rem] font-extrabold text-[#e4e4e7]">{initialsOf(name)}</span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[1.0625rem] font-bold">{name}</b>
        {sub && <small className="block truncate text-[0.9375rem] text-mut">{sub}</small>}
      </span>
    </>
  );
  return (
    <div className="flex min-h-[4.125rem] items-center gap-3 border-t border-[#26262b] px-4 py-2.5 first:border-t-0">
      {onClick ? (
        <button type="button" onClick={onClick} data-press="row" className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {body}
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
      )}
      {children}
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
  const [weeks, setWeeks] = useState(1);
  const { list, more: later } = upcomingList(row?.plans || [], today, weeks);
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
      <FsHead label="Fitness · Sporcu" onBack={onBack} onMore={() => (setSure(false), setMore(true))} />
      <section className="fs-hero p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 text-[1rem] font-bold">{initialsOf(name)}</span>
          <span className="min-w-0 flex-1">
            <b className="fs-c block truncate text-[2rem]">{name}</b>
            {meta && <small className="mt-1 block truncate text-[0.9375rem] text-[#d4d4d8]">{meta}</small>}
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
                  ? "bg-[#d4ff3a] text-[#111]"
                  : d.st === "missed"
                    ? "bg-[#3a1416] text-[#ff6b6b]"
                    : d.st === "skip"
                      ? "bg-white/15 text-white/70"
                      : "border border-white/50 text-white";
              return (
                <button key={date} type="button" disabled={!plan} onClick={() => plan && onOpen(plan)} className="flex flex-col items-center gap-1">
                  <small className={`text-[0.6875rem] ${date === today ? "font-bold text-white" : "text-white/60"}`}>{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][i]}</small>
                  <span className={`grid h-9 w-full place-items-center rounded-xl text-[0.8125rem] font-bold ${look} ${date === today && d ? "ring-2 ring-[#d4ff3a]" : ""}`}>
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
              <button type="button" onClick={copy} data-press className="btn btn-primary mt-2 w-full">
                <Icon name={copied ? "check" : "copy"} className="size-4" />
                {copied ? "Kopyalandı" : "Kopyala"}
              </button>
              <button type="button" onClick={() => setListOpen(false)} data-press className="btn btn-text btn-sm mt-1 w-full text-mut">
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
                    <button type="button" onClick={() => onOpen(p)} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <span className="w-[4.5rem] shrink-0 text-[0.8125rem] text-mut">{dayText(p.date)}</span>
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{p.fit?.name || p.title}</span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${c}`}>{t}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-[0.8125rem] text-mut">Bu hafta antrenman yok.</p>
          )}
          {later && (
            <button type="button" onClick={() => setWeeks((w) => w + 1)} data-press className="btn btn-text btn-sm mt-1.5 w-full text-acc">
              Daha fazla
            </button>
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
            data-press className="btn btn-danger mt-3 w-full"
          >
            {sure ? "Emin misin? Silmek için yeniden dokun" : "Programı sil"}
          </button>
        )}
        <button type="button" onClick={() => setMore(false)} data-press className="btn btn-text btn-sm mt-1 w-full text-mut">
          Vazgeç
        </button>
      </Sheet>
      {prog && <ContinueSheet key={cont ? "co" : "cc"} open={cont} onClose={() => setCont(false)} prog={prog} today={today} onGo={(n, start, weeks) => (setCont(false), onContinue(prog, n, start, weeks))} />}
      {prog && <GiveSheet key={give ? "go" : "gc"} open={give} onClose={() => setGive(false)} others={others} today={today} onGo={(a, start) => (setGive(false), onGive(prog, a, start))} />}
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
            <button type="button" aria-label="Azalt" onClick={() => setWeeks((w) => Math.max(1, w - 1))} data-press className="btn btn-icon size-10"><Icon name="minus" className="size-4" /></button>
            <b className="text-[1rem] tabular-nums">{weeks}</b>
            <button type="button" aria-label="Artır" onClick={() => setWeeks((w) => Math.min(26, w + 1))} data-press className="btn btn-icon size-10"><Icon name="plus" className="size-4" /></button>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <Button disabled={!start} onClick={() => onGo(n, start, weeks)}>Hazırla</Button>
      </div>
      <button type="button" onClick={onClose} data-press className="btn btn-text btn-sm mt-1 w-full text-mut">Vazgeç</button>
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
            <button type="button" disabled={!start} onClick={() => onGo(a, start)} data-press="row" className="flex w-full items-center gap-3 py-3 text-left">
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
      <button type="button" onClick={onClose} data-press className="btn btn-text btn-sm mt-1 w-full text-mut">Vazgeç</button>
    </Sheet>
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
        <button type="button" aria-label="Önceki gün" onClick={() => setDate(addDays(date, -1))} data-press className="btn btn-round">
          <Icon name="chev" className="size-4 rotate-180" />
        </button>
        <b className="min-w-0 flex-1 truncate text-center text-[1rem] font-semibold">{title}</b>
        <button type="button" aria-label="Sonraki gün" onClick={() => setDate(addDays(date, 1))} data-press className="btn btn-round">
          <Icon name="chev" className="size-4" />
        </button>
      </div>
      {rows.length ? (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((r) => {
            const [t, c] = pill(r.st, r.plan);
            return (
              <li key={r.plan.id}>
                <button type="button" onClick={() => onOpen(r.plan)} data-press="row" className="flex w-full items-center gap-3 py-3 text-left">
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
