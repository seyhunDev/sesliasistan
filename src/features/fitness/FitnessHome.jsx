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
  GOALS, SPORTS, STATUS, addDays, ageFrom, athleteRows, cleanItem, cleanProgram, dowOf, fitPlans, labelOf, monthStats, programText, progWeek, records, statusOf, weekStats,
} from "@/lib/fitness/model";
import { libList } from "@/lib/fitness/library";
import { useFitLib } from "./useFitLib";
import { kindOf } from "@/lib/kinds";
import { FIT_PREVIEW, FIT_SAVED, activeOf, adoptProgram, spreadLib, askFitness, deleteProgram, loadPrograms, resetFitness, notifyProgram, removePlans, saveProfile, saveProgram, syncPlans, takeProgram, peekProgram, peekPrograms } from "./fitnessData";
import { NewProgram, ProfileFields } from "./NewProgram";
import { ProgramEditor } from "./ProgramEditor";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { BodyStep, FitIntro } from "./FitIntro";
import { HistoryCard, MonthCard, ProgramCard, ProgressCard, RowButton, TodayCard, WeekCard, WeekStrip, progSub } from "./FitDashboard";
import { FoodView } from "./FoodView";
import { useRouter, useSearchParams } from "next/navigation";

// Fitness sayfası (yalnız ana hesap), sade: bugünkü antrenman (Başla), bu hafta (7 gün), "Programım" satırı (pencerede günler, düzenle,
// planlara ekle, profil) ve kapalı "Gelişim ve geçmiş" (halka, seri, gelişim, bu ay, geçmiş; parçalar FitDashboard.jsx). Takip planlardan hesaplanır (ek okuma yok); programlar tek sorgu.
// Program yapay zekayla hazırlanır (Program hazırla: günler, saat, hafta, süre, profil) ya da asistana söylenir; önizlemede açılır.
// İlk antrenman: başlangıçtan sonraki ilk seçili gün (yeni programda başlangıç geçmişteyse bugün)
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
  const [more, setMore] = useState(false);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [fitProf, setFitProf] = useState(profile.fit || {});
  const [forUid, setForUid] = useState(""); // Program hazırla bir sporcu için açıldıysa
  const [athOpen, setAthOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [ath, setAth] = useState(""); // Sporcular penceresinde açık sporcu
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
  const tab = sp.get("tab") === "food" ? "food" : "train";
  const athQ = sp.get("sporcular");
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
    const show = () => (setAth(""), setAthOpen(true));
    if (athQ) show();
    // Asistan ("sporcular bugün antrenman yaptı mı") Fitness sayfası açıkken
    window.addEventListener("sa-fit-athletes", show);
    return () => window.removeEventListener("sa-fit-athletes", show);
  }, [athQ]);

  const mine = list ? list.filter((p) => !p.for) : null;
  const prog = activeOf(mine);
  const rows = athleteRows(list || [], fitOthers, athletes, today);
  const plansFor = (p) => (p?.for ? fitOthers : plans);
  const newFor = (id) => {
    setForUid(id);
    setNewGoal("");
    setAskErr("");
    setAthOpen(false);
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

  async function save(p, withPlans) {
    setBusy(withPlans ? "plans" : "save");
    try {
      // Takvimde bu programın gelecek planları varsa onlar da her kayıtta yenilenir (video, hareket değişikliği sporcuya gitsin)
      const onPlans = (plansFor(p) || []).some((x) => p.id && x.fit?.prog === p.id && x.date >= todayStr() && !x.fit?.res?.st);
      if (onPlans) withPlans = true;
      // Hareketler kütüphaneye girer (yenilere numara), fotoğraf/video kütüphanedekiyle aynı olur
      p = await adoptProgram(orgId, p).catch(() => p);
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
        <Tabs tab={tab} setTab={setTab} />
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
        <Tabs tab={tab} setTab={setTab} />
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
        <Tabs tab={tab} setTab={setTab} />
        <FitIntro
          name={profile.name}
          onStart={(g) => {
            setNewGoal(g);
            setNewOpen(true);
          }}
        />
        <NewProgram key={newOpen ? "o" : "c"} goal={newGoal} athletes={athletes} open={newOpen} onClose={() => setNewOpen(false)} profile={fitProf} onAsk={ask} onBlank={blank} busy={busy === "ask"} error={askErr} />
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
  const showMore = week.planned > 0 || recs.length > 0 || history.length > 0;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <PageHeader title="Fitness" sub="Antrenman programın ve takibin">
        <button type="button" onClick={() => newFor("")} aria-label="Program hazırla" className="grid size-10 place-items-center rounded-full bg-acc text-white shadow-[0_6px_14px_-8px_rgba(47,125,107,.9)] active:scale-90">
          <Icon name="plus" className="size-5" />
        </button>
      </PageHeader>
      <Tabs tab={tab} setTab={setTab} />

      {bodySheet}

      {rows.length > 0 && <AthletesSummary rows={rows} />}

      {athletes.length > 0 && (
        <>
          <Head title="SPORCULAR" action="+ Program" onAction={() => newFor("")} />
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {rows.map((r) => (
              <li key={r.uid} className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setAth(r.uid);
                    setAthOpen(true);
                  }}
                  className="flex w-full items-center gap-3 text-left"
                >
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
            {(rest.length > 0 || !rows.length) && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setAth("");
                    setAthOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] text-mut">{rows.length ? `Programı yok: ${rest.map((a) => a.name.split(" ")[0]).join(", ")}` : "Henüz hiçbir sporcunun programı yok"}</span>
                  <span className="shrink-0 text-[0.875rem] font-semibold text-acc">Tümü ›</span>
                </button>
              </li>
            )}
          </ul>
        </>
      )}

      <Head title="BENİM" />
      {list && !prog && !todays.length ? (
        <div className={`${card} flex items-center gap-3 px-4 py-3`}>
          <Icon name="dumbbell" className="size-5 shrink-0 text-mut" />
          <span className="min-w-0 flex-1 text-[0.9375rem] text-mut">Kendi programın yok</span>
          <button type="button" onClick={() => newFor("")} className="h-9 shrink-0 rounded-full bg-acc/10 px-3.5 text-[0.875rem] font-semibold text-acc">
            + Hazırla
          </button>
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
          {prog && <RowButton icon="cal" title={prog.title || "Programım"} sub={progSub(prog, today, onCal)} onClick={() => setProgOpen(true)} />}
        </>
      )}

      {(prog || rows.length > 0 || all.length > 0 || libCount.n > 0) && (
        <>
          <Head title="ARAÇLAR" />
          <div className="grid grid-cols-2 gap-2.5">
            <Tile icon="video" title="Hareketler" sub={libCount.n ? `${libCount.n} hareket · ${libCount.v} videolu` : "Fotoğraf ve videolar"} wide={!showMore} onClick={() => setLibOpen(true)} />
            {showMore && <Tile icon="trend" title="Gelişim" sub="Seri, en iyiler, bu ay" on={more} onClick={() => setMore(!more)} />}
          </div>
        </>
      )}
      <ExerciseLibrary
        open={libOpen}
        orgId={orgId}
        progs={list || []}
        onClose={() => {
          setLibOpen(false);
          spreadLib(orgId, [...plans, ...fitOthers]).then((x) => x.progs && reload(false)).catch(() => {});
        }}
      />
      {more && (
        <>
          <WeekCard week={week} strip={strip} today={today} onOpen={open} />
          <ProgressCard recs={recs} plans={plans} />
          <MonthCard month={month} today={today} />
          <HistoryCard list={history} today={today} onOpen={open} />
        </>
      )}
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
              setEdit({ prog, fresh: false, k: Date.now() });
            }}
            onPlan={() => save(prog, true)}
            onUnplan={unplan}
            onDrop={async () => {
              await drop();
              setProgOpen(false);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setProgOpen(false);
              setProfOpen(true);
            }}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-bg text-[0.875rem] font-semibold"
          >
            <Icon name="user" className="size-4" />
            Profilim (boy, kilo, seviye)
          </button>
        </Sheet>
      )}

      <AthletesSheet
        open={athOpen}
        onClose={() => setAthOpen(false)}
        athletes={athletes}
        rows={rows}
        plans={fitOthers}
        sel={ath}
        setSel={setAth}
        today={today}
        busy={!!busy}
        onNew={newFor}
        onOpen={open}
        onEdit={(pg) => {
          setAthOpen(false);
          setEdit({ prog: pg, fresh: false, k: Date.now() });
        }}
        onPlan={(pg) => save(pg, true)}
        onUnplan={unplan}
        onDrop={async (pg) => {
          if ((await drop(pg)) !== false) setAth("");
        }}
      />
      {(prog || rows.length > 0 || all.length > 0) && (
        <button type="button" disabled={!!busy} onClick={reset} className="mt-6 h-10 w-full text-[0.8125rem] font-semibold text-rec">
          {busy === "reset" ? "Sıfırlanıyor…" : "Fitness'ı sıfırla"}
        </button>
      )}
      <NewProgram key={newOpen ? `o${forUid}` : "c"} forUid={forUid} athletes={athletes} open={newOpen} onClose={() => setNewOpen(false)} profile={fitProf} onAsk={ask} onBlank={blank} busy={busy === "ask"} error={askErr} />
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

// Sporcular penceresi: her sporcu bir satır (program, bu hafta yapılan/planlanan, son antrenman);
// dokununca programı (düzenle, planlara ekle, sil) ve son antrenmanları. Programı olmayan sporcuya "Program hazırla".
function AthletesSheet({ open, onClose, athletes, rows, plans = [], sel, setSel, today, busy, onNew, onOpen, onEdit, onPlan, onUnplan, onDrop }) {
  const row = rows.find((r) => r.uid === sel);
  const name = athletes.find((a) => a.uid === sel)?.name || row?.name || "";
  const rest = athletes.filter((a) => !rows.some((r) => r.uid === a.uid));
  return (
    <Sheet open={open} onClose={onClose} title={sel ? name : "Sporcular"}>
      {!sel && (
        <>
          {rows.length > 0 && (
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.uid} className="py-3">
                  <button type="button" onClick={() => setSel(r.uid)} className="flex w-full items-start gap-3 text-left">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.875rem] font-bold text-acc">{initialsOf(r.name)}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{r.name}</b>
                      <small className={`block truncate text-[0.8125rem] ${/yapmadı/.test(nowLine(r, today)) ? "text-rec" : "text-mut"}`}>{nowLine(r, today)}</small>
                    </span>
                    {r.week.planned > 0 && <b className={`shrink-0 text-[0.875rem] font-bold tabular-nums ${r.week.missed ? "text-rec" : "text-acc"}`}>{`${r.week.done}/${r.week.planned}`}</b>}
                  </button>
                  <WeekDots row={r} today={today} onOpen={(p) => (onClose(), onOpen(p))} />
                </li>
              ))}
            </ul>
          )}
          {rest.length > 0 && (
            <>
              <small className="mt-4 block text-[0.75rem] font-bold tracking-[.06em] text-mut">PROGRAMI YOK</small>
              <ul className="mt-1 divide-y divide-line">
                {rest.map((a) => (
                  <li key={a.uid} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{a.name}</span>
                    <button type="button" onClick={() => onNew(a.uid)} className="h-9 shrink-0 px-1 text-[0.875rem] font-semibold text-acc">
                      + Program
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {sel && (
        <AthleteDetail
          name={name}
          row={row}
          athlete={athletes.find((a) => a.uid === sel)}
          today={today}
          busy={busy}
          onBack={() => setSel("")}
          onNew={() => onNew(sel)}
          onOpen={(p) => (onClose(), onOpen(p))}
          onEdit={onEdit}
          onPlan={onPlan}
          onUnplan={onUnplan}
          onDrop={onDrop}
        />
      )}
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

// Sporcu ayrıntısı: koyu kart (ad, yaş · spor · hedef, bu hafta 7 gün, programın kaçıncı haftası), üç işlem
// (Düzenle, Liste olarak al, Yeni program), geçen ve gelecek haftanın antrenmanları, en altta Programı sil.
function AthleteDetail({ name, row, athlete, today, busy, onBack, onNew, onOpen, onEdit, onPlan, onUnplan, onDrop }) {
  const [listOpen, setListOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sure, setSure] = useState(false);
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
      <button type="button" onClick={onBack} className="mb-2 flex h-9 items-center gap-1 text-[0.875rem] font-semibold text-acc">
        <Icon name="chev" className="size-4 rotate-180" />
        Sporcular
      </button>
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
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["edit", "Düzenle", () => onEdit(prog), false],
              ["copy", "Liste olarak al", () => setListOpen(!listOpen), listOpen],
              ["spark", "Yeni program", onNew, false],
            ].map(([icon, label, fn, on]) => (
              <button key={label} type="button" onClick={fn} className={`flex h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl text-[0.8125rem] font-semibold ${on ? "bg-acc text-white" : "bg-card text-fg shadow-[0_1px_0_rgba(0,0,0,.04)] ring-1 ring-line"}`}>
                <Icon name={icon} className={`size-5 ${on ? "" : "text-acc"}`} />
                {label}
              </button>
            ))}
          </div>
          {listOpen && (
            <div className={`${card} mt-2 p-3`}>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-[0.8125rem] leading-snug">{text}</pre>
              <button type="button" onClick={copy} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white">
                <Icon name={copied ? "check" : "copy"} className="size-4" />
                {copied ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => (onCal > 0 ? onUnplan(prog) : onPlan(prog))}
            className="mt-2 h-10 w-full rounded-xl text-[0.875rem] font-semibold text-acc disabled:opacity-50"
          >
            {onCal > 0 ? `Takvimden kaldır (${onCal} antrenman)` : "Planlara ekle"}
          </button>
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

      {prog && (
        <button
          type="button"
          disabled={busy}
          onClick={() => (sure ? onDrop(prog) : setSure(true))}
          className="mt-5 h-11 w-full rounded-xl text-[0.875rem] font-semibold text-rec disabled:opacity-50"
        >
          {sure ? "Emin misin? Silmek için yeniden dokun" : "Programı sil"}
        </button>
      )}
    </>
  );
}

// Fitness ana sayfasının üstü: bütün sporcuların bu haftası tek kartta (halka, yapılan, yapılmayan)
function AthletesSummary({ rows }) {
  const done = rows.reduce((n, r) => n + r.week.done, 0);
  const planned = rows.reduce((n, r) => n + r.week.planned, 0);
  const missed = rows.reduce((n, r) => n + r.week.missed, 0);
  const pct = planned ? done / planned : 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <section className="mt-3 flex items-center gap-4 rounded-[1.625rem] bg-deep p-5 text-white">
      <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
        <circle cx="32" cy="32" r={R} fill="none" stroke="#bfe8d6" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} />
        <text x="32" y="32" transform="rotate(90 32 32)" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="15" fontWeight="700">{`${done}/${planned}`}</text>
      </svg>
      <span className="min-w-0 flex-1">
        <small className="block text-[0.75rem] font-bold tracking-[.06em] text-white/60">SPORCULAR BU HAFTA</small>
        <b className="mt-0.5 block text-[1rem] font-semibold">{`${rows.length} sporcu · ${done} antrenman yapıldı`}</b>
        {missed > 0 ? <small className="block text-[0.8125rem] text-[#f3a39a]">{`${missed} antrenman yapılmadı`}</small> : <small className="block text-[0.8125rem] text-white/60">{planned ? "Kaçırılan yok" : "Bu hafta antrenman yok"}</small>}
      </span>
    </section>
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

// Araç kutusu (Hareketler, Gelişim)
function Tile({ icon, title, sub, wide, on, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`${card} flex items-center gap-3 px-4 py-3.5 text-left ${wide ? "col-span-2" : ""} ${on ? "ring-2 ring-acc" : ""}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold">{title}</b>
        <small className="block truncate text-[0.75rem] text-mut">{sub}</small>
      </span>
    </button>
  );
}
