"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  STATUS, addDays, athleteRows, cleanItem, cleanProgram, dowOf, fitPlans, monthStats, progWeek, records, statusOf, weekStats,
} from "@/lib/fitness/model";
import { kindOf } from "@/lib/kinds";
import { FIT_PREVIEW, FIT_SAVED, activeOf, askFitness, deleteProgram, loadPrograms, notifyProgram, removePlans, saveProfile, saveProgram, syncPlans, takeProgram, peekProgram, peekPrograms } from "./fitnessData";
import { NewProgram, ProfileFields } from "./NewProgram";
import { ProgramEditor } from "./ProgramEditor";
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
  const [newOpen, setNewOpen] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [profOpen, setProfOpen] = useState(false);
  const [progOpen, setProgOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [fitProf, setFitProf] = useState(profile.fit || {});
  const [forUid, setForUid] = useState(""); // Program hazırla bir sporcu için açıldıysa
  const [athOpen, setAthOpen] = useState(false);
  const [ath, setAth] = useState(""); // Sporcular penceresinde açık sporcu
  // Program verilebilecek sporcular: uygulamada hesabı olan sporcu ve öğrenciler
  const athletes = useMemo(
    () =>
      members
        .filter((m) => m.account !== false && (kindOf(m) === "athlete" || kindOf(m) === "student"))
        .map((m) => ({ uid: m.uid, name: m.name || "Sporcu" }))
        .sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [members],
  );
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

  const mine = list ? list.filter((p) => !p.for) : null;
  const prog = activeOf(mine);
  const rows = athleteRows(list || [], fitOthers, athletes, today);
  const plansFor = (p) => (p?.for ? fitOthers : plans);
  const newFor = (id) => {
    setForUid(id);
    setNewGoal("");
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

  async function save(p, withPlans) {
    setBusy(withPlans ? "plans" : "save");
    try {
      const saved = await saveProgram(orgId, uid, { ...p, active: true });
      let r = null;
      if (withPlans) r = await syncPlans(orgId, uid, saved, plansFor(saved), { name: profile.name });
      // Sporcuya tek bildirim: "Yeni fitness programın hazır" (sunucu bir kez gönderir)
      if (saved.for && (withPlans || saved.plansAt)) notifyProgram(saved.id);
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
    try {
      // Sporcu için: senin profiline yazılmaz, sporcunun adı yapay zekaya gitmez
      const pf = pre.for ? f : await saveProfile(uid, f).catch(() => f);
      if (!pre.for) setFitProf(pf);
      const r = await askFitness({ text, profile: pf });
      if (!r.program) throw new Error(r.message || "Program hazırlanamadı");
      // Seçilenler kesin: gün ve saatler formdakiyle aynı olsun
      const days = r.program.days.map((d) => ({ ...d, time: d.time || pre.time, min: d.min || pre.min }));
      setNewOpen(false);
      const who = pre.for ? { for: pre.for, forName: pre.forName } : {};
      setEdit({ prog: fixStart({ ...r.program, ...who, days, weeks: pre.weeks, start: pre.start, note: r.program.note || r.message }), fresh: true, simple: true, k: Date.now() });
    } catch (e) {
      toast(e.message || "Program hazırlanamadı");
    } finally {
      setBusy("");
    }
  }

  function blank(pre, f) {
    if (!pre.for) saveProfile(uid, f).then(setFitProf).catch(() => {});
    setNewOpen(false);
    const days = pre.days.map((dow) => ({ dow, time: pre.time, min: pre.min, name: "Antrenman", items: [cleanItem({ ex: "warmup", min: 5 }), cleanItem({ ex: "stretch", min: 5 })] }));
    const who = pre.for ? { for: pre.for, forName: pre.forName } : {};
    setEdit({ prog: { ...cleanProgram({ title: pre.for ? `${pre.forName} · fitness` : "Fitness programım", weeks: pre.weeks, start: pre.start, days }), ...who }, fresh: true, k: Date.now() });
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
    if (!window.confirm("Program silinsin mi? Takvimdeki gelecek antrenmanları da kaldırılır; yapılanlar kalır.")) return false;
    setBusy("drop");
    try {
      await removePlans(orgId, pg, plansFor(pg));
      await deleteProgram(orgId, pg.id);
      toast("Program silindi");
    } finally {
      setBusy("");
    }
  }

  if (edit) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
        <PageHeader title={edit.prog.for ? `${edit.prog.forName} için program` : edit.simple ? "Programın hazır" : edit.fresh ? "Yeni program" : "Programı düzenle"} back="/fitness" />
        <ProgramEditor key={edit.k} prog={edit.prog} fresh={edit.fresh} simple={edit.simple} busy={busy} onSave={save} onCancel={() => setEdit(null)} />
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

  // Hiç programı ve fitness antrenmanı yoksa: tek ekran tanıtım, "Programımı hazırla" (hedef ve hafta pencerede sorulur)
  if (mine && !mine.length && !all.length && !rows.length) {
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
        <NewProgram key={newOpen ? "o" : "c"} goal={newGoal} athletes={athletes} open={newOpen} onClose={() => setNewOpen(false)} profile={fitProf} onAsk={ask} onBlank={blank} busy={busy === "ask"} />
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
      <PageHeader title="Fitness" sub="Antrenman programın ve takibin">
        <button type="button" onClick={() => newFor("")} aria-label="Program hazırla" className="grid size-10 place-items-center rounded-full bg-acc text-white shadow-[0_6px_14px_-8px_rgba(47,125,107,.9)] active:scale-90">
          <Icon name="plus" className="size-5" />
        </button>
      </PageHeader>
      <Tabs tab={tab} setTab={setTab} />

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
          <Button className="mt-3" onClick={() => newFor("")}>
            <Icon name="spark" className="size-5" />
            Program hazırla
          </Button>
        </div>
      )}

      <WeekStrip week={week} strip={strip} today={today} onOpen={open} />
      {prog && <RowButton icon="cal" title={prog.title || "Programım"} sub={progSub(prog, today, onCal)} onClick={() => setProgOpen(true)} />}
      {athletes.length > 0 && (
        <RowButton
          icon="users"
          title="Sporcular"
          sub={rows.length ? `${rows.length} sporcunun programı var · bu hafta ${rows.reduce((t, r) => t + r.week.done, 0)}/${rows.reduce((t, r) => t + r.week.planned, 0)} yapıldı` : "Sporcuya program hazırla"}
          onClick={() => {
            setAth("");
            setAthOpen(true);
          }}
        />
      )}
      {(week.planned > 0 || recs.length > 0 || history.length > 0) && <RowButton icon="trend" title="Gelişim ve geçmiş" sub="Seri, en iyi değerler, bu ay" open={more} onClick={() => setMore(!more)} />}
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
      <NewProgram key={newOpen ? `o${forUid}` : "c"} forUid={forUid} athletes={athletes} open={newOpen} onClose={() => setNewOpen(false)} profile={fitProf} onAsk={ask} onBlank={blank} busy={busy === "ask"} />
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
function AthletesSheet({ open, onClose, athletes, rows, sel, setSel, today, busy, onNew, onOpen, onEdit, onPlan, onUnplan, onDrop }) {
  const row = rows.find((r) => r.uid === sel);
  const name = athletes.find((a) => a.uid === sel)?.name || row?.name || "";
  const rest = athletes.filter((a) => !rows.some((r) => r.uid === a.uid));
  const dayText = (d) => new Date(`${d}T12:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
  const recent = row ? row.plans.filter((p) => p.date <= today || p.fit?.res?.st).slice(-5).reverse() : [];
  return (
    <Sheet open={open} onClose={onClose} title={sel ? name : "Sporcular"}>
      {!sel && (
        <>
          <p className="text-[0.8125rem] leading-snug text-mut">Programı sen hazırlarsın; sporcu kendi Fitness sayfasında görür ve antrenmanı işaretler. Antrenmanları senin takviminde görünmez.</p>
          {rows.length > 0 && (
            <ul className="mt-3 divide-y divide-line">
              {rows.map((r) => (
                <li key={r.uid}>
                  <button type="button" onClick={() => setSel(r.uid)} className="flex w-full items-center gap-3 py-3 text-left">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.875rem] font-bold text-acc">{r.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{r.name}</b>
                      <small className="block truncate text-[0.8125rem] text-mut">
                        {[r.prog?.title || "Program yok", r.week.planned ? `bu hafta ${r.week.done}/${r.week.planned}` : "", r.last ? `son ${dayText(r.last.date)}` : ""].filter(Boolean).join(" · ")}
                      </small>
                    </span>
                    <Icon name="chev" className="size-4 shrink-0 text-mut" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {rest.length > 0 && (
            <>
              <small className="mt-4 block text-[0.75rem] font-bold tracking-[.06em] text-mut">PROGRAMI OLMAYANLAR</small>
              <ul className="mt-1 divide-y divide-line">
                {rest.map((a) => (
                  <li key={a.uid} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{a.name}</span>
                    <button type="button" onClick={() => onNew(a.uid)} className="h-9 shrink-0 rounded-full bg-acc px-3.5 text-[0.8125rem] font-semibold text-white">
                      Program hazırla
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {sel && (
        <>
          <button type="button" onClick={() => setSel("")} className="mb-2 flex h-9 items-center gap-1 text-[0.875rem] font-semibold text-acc">
            <Icon name="chev" className="size-4 rotate-180" />
            Sporcular
          </button>
          {row?.prog ? (
            <ProgramCard
              bare
              prog={row.prog}
              today={today}
              onCal={row.plans.filter((p) => p.fit?.prog === row.prog.id && p.date >= today).length}
              busy={busy}
              onEdit={() => onEdit(row.prog)}
              onPlan={() => onPlan(row.prog)}
              onUnplan={() => onUnplan(row.prog)}
              onDrop={() => onDrop(row.prog)}
            />
          ) : (
            <Button onClick={() => onNew(sel)}>
              <Icon name="spark" className="size-5" />
              Program hazırla
            </Button>
          )}
          {row?.prog && (
            <button type="button" onClick={() => onNew(sel)} className="mt-2 h-10 w-full text-[0.875rem] font-semibold text-acc">
              Yeni program hazırla
            </button>
          )}
          {row && (
            <>
              <small className="mt-4 block text-[0.75rem] font-bold tracking-[.06em] text-mut">{`BU HAFTA ${row.week.done}/${row.week.planned} · SON ANTRENMANLAR`}</small>
              {recent.length ? (
                <ul className="mt-1 divide-y divide-line">
                  {recent.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => (onClose(), onOpen(p))} className="flex w-full items-center gap-3 py-2.5 text-left">
                        <span className="w-20 shrink-0 text-[0.8125rem] text-mut">{dayText(p.date)}</span>
                        <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{p.fit?.name || p.title}</span>
                        <span className={`shrink-0 text-[0.8125rem] font-semibold ${p.fit?.res?.st === "done" ? "text-acc" : "text-mut"}`}>{STATUS[statusOf(p, today)]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[0.8125rem] text-mut">Henüz antrenman günü gelmedi.</p>
              )}
              {row.next && <p className="mt-2 text-[0.8125rem] text-mut">Sıradaki: {dayText(row.next.date)}{row.next.time ? ` ${row.next.time}` : ""} · {row.next.fit?.name || row.next.title}</p>}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
