"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { loadAthletes, isActive } from "@/features/athletes/data";
import { loadRace } from "@/features/athletes/races";
import { raceDays } from "@/features/athletes/raceWeather";
import { loadLive, resetLive, saveDays, saveStarts } from "@/features/athletes/raceLiveStore";
import { beginRace, cleanLive, dayNames, dayOf, liveDays, pickTimer, resetPatch, upSec, withToday, zeroRace } from "@/lib/raceLive";
import { mmss } from "@/lib/raceScore";
import { mineHere, readTimer, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { todayStr } from "@/lib/utils/format";
import { WeatherTab } from "./WeatherTab";
import { VoidSheet, useRaceFlow } from "./useRaceFlow";
import { TimerTab } from "./TimerTab";
import { ResultsTab } from "./ResultsTab";
import { MediaTab } from "./MediaTab";
import { DaySummarySheet } from "./DaySummarySheet";
import { DaySheet } from "./DaySheet";
import { ResetSheet } from "./ResetSheet";
import { useLiveSync } from "./useLiveSync";

// Yarış günü sayfası (Seyhun 2026-10-18; onaylı örnek /mnt/project-files/yaris-tasarim/multimedya/sayfa.png):
// Hava: yarış yerinin saatlik tahmini (hava sayfasındaki grafik) + elle yazılan rüzgâr noktaları; Süre: start sayacı (5 dk dizisi)
// ve günün yarışları; Sonuçlar: sonuç PDF'inden Genel ve Bizimkiler; Medya: fotoğraf/video, yarışa göre gruplu.
// Kayıt raceLive belgesinde (raceLiveStore.js); çok günlü yarışta üstte gün seçilir. ?tab=sure (asistan sayacı başlatınca).
// Start sayacı başka sekmede ve sayfada da öter (Countdown.jsx TimerSound); sayfanın diğer sekmelerinde küçük süre satırı görünür (dokununca Süre).
// Sağ üstte "Özet": seçili günün kartı (rüzgâr, yarışlar, bizimkiler) veliye/Instagram'a paylaşılır (DaySummarySheet).
// Sıra yarış gününün işine göre (Seyhun 2026-10-18 onayı): Süre · Medya · Hava · Sonuçlar; yarış günü Süre'yle, başka gün Hava'yla açılır
const TABS = [["sure", "Süre"], ["media", "Medya"], ["wx", "Hava"], ["res", "Sonuçlar"]];
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

export function RaceMedia({ orgId, id }) {
  const toast = useToast();
  const q = useSearchParams();
  const [tabPick, setTab] = useState(TABS.some(([k]) => k === q.get("tab")) ? q.get("tab") : "");
  const [cam, setCam] = useState(null); // Süre'den açılan kamera: { kind, back }
  const [race, setRace] = useState(null);
  const [missing, setMissing] = useState(false);
  const [live, setLive] = useState(() => cleanLive({}));
  const [athletes, setAthletes] = useState([]);
  const today = todayStr();
  const [day, setDay] = useState("");
  const [sum, setSum] = useState(false);
  const [addDay, setAddDay] = useState(false);
  const [reset, setReset] = useState(false);
  const rdays = useMemo(() => (race ? raceDays(race) : null), [race]);
  // Açılışta bugün seçili (Seyhun 2026-10-19: "açtığım zaman bugün gösterilmesi lazım"). Telefon uygulamayı arkada açık tutar:
  // ana ekrandan ya da başka uygulamadan geri dönünce (30 sn.den uzun ara ya da gün değişti) elle seçilen gün bırakılır, yeniden bugün görünür.
  useEffect(() => {
    let away = 0;
    let was = todayStr();
    const on = () => {
      if (document.hidden) return void (away = Date.now());
      if (away && (Date.now() - away > 30e3 || todayStr() !== was)) setDay("");
      away = 0;
      was = todayStr();
    };
    document.addEventListener("visibilitychange", on);
    window.addEventListener("pageshow", on);
    return () => {
      document.removeEventListener("visibilitychange", on);
      window.removeEventListener("pageshow", on);
    };
  }, []);
  // Seçili gün şeritte görünsün (gün çoksa bugün sağda kalıp gözden kaçmasın)
  const strip = useRef(null);
  const shown = useRef("");
  useEffect(() => {
    const el = strip.current?.querySelector('[aria-pressed="true"]');
    if (!el || shown.current === el.dataset.day) return;
    shown.current = el.dataset.day;
    const box = strip.current;
    box.scrollLeft = Math.max(0, el.offsetLeft - box.offsetLeft - (box.clientWidth - el.offsetWidth) / 2);
  });

  useEffect(() => {
    let on = true;
    loadRace(orgId, id).then(
      (r) => on && (r ? setRace(r) : setMissing(true)),
      () => on && setMissing(true),
    );
    loadLive(orgId, id).then(
      (l) => on && setLive(l),
      () => {},
    );
    loadAthletes()
      .then((d) => on && setAthletes(d.athletes || []))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [orgId, id]);

  // Asistanla yazılan rüzgâr (isler/yarisMedya.js) açık sayfada hemen görünür
  useEffect(() => {
    const on = (e) => e.detail?.id === id && setLive((l) => cleanLive({ ...l, wind: [...l.wind, e.detail.wind] }));
    window.addEventListener("sa-race-live", on);
    return () => window.removeEventListener("sa-race-live", on);
  }, [id]);

  // Bu sayfada yapılan değişiklik hemen görünür; kayıt arkada gider (hata olursa söylenir)
  const change = useCallback(
    (patch, job) => {
      setLive((l) => cleanLive({ ...l, ...(typeof patch === "function" ? patch(l) : patch) }));
      Promise.resolve(job?.()).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
    },
    [toast],
  );

  // Sayaç 0 olunca günün sıradaki yarışı start saati ve son elle yazılan rüzgârla yazılır
  const onZero = useCallback(
    (end, t) => {
      if (Date.now() - end > 20 * 60e3) return; // çok önce bitmiş sayaç (ör. antrenmanda kalmış) yarış startı sayılmaz
      if (t?.mode !== "start") return;
      change((l) => {
        const next = zeroRace(l.starts, t.rid, end, l.wind, rdays);
        if (next === l.starts) return {};
        saveStarts(orgId, id, next).catch(() => {});
        return { starts: next };
      });
    },
    [change, orgId, id, rdays],
  );
  const timer = useTimerRun({ onZero });
  useLiveSync({ orgId, raceId: id, setLive });
  const rf = useRaceFlow({ orgId, raceId: id, live, onChange: change, rdays, today });
  // Sayaç asistanla ("5 dakikalık sayacı başlat") başlatıldıysa yarışa bağlı değildir: yarış satırı burada açılır (fotoğraflar ona düşsün)
  const tEnd = timer.t.end;
  const tFree = timer.t.mode === "start" && tEnd != null && !timer.t.rid;
  useEffect(() => {
    if (!race || !tFree) return;
    const id2 = setTimeout(() => {
      const t = readTimer();
      if (t.rid || t.end == null || t.end < Date.now() || !mineHere(t)) return;
      change((l) => {
        const got = beginRace(l.starts, Date.now(), t.end, rdays);
        writeTimer({ ...t, rid: got.id });
        saveStarts(orgId, id, got.starts).catch(() => {});
        return { starts: got.starts };
      });
    }, 0);
    return () => clearTimeout(id2);
  }, [race, tFree, tEnd, change, orgId, id, rdays]);

  if (missing) return <Shell title="Yarış"><p className="mt-6 text-center text-[0.875rem] text-mut">Yarış bulunamadı.</p></Shell>;
  if (!race) return <Shell title="Yarış"><Loading label="Yarış yükleniyor" /></Shell>;

  const days = withToday(liveDays(rdays, live), rdays, today);
  const names = dayNames(rdays, days);
  const cur = day || (days.includes(today) ? today : !days.length || today < days[0] ? days[0] || today : days[days.length - 1]);
  const sub = [race.district || race.city, names[cur] && names[cur] !== "Yarış" ? names[cur] : "", dayLabel(cur)].filter(Boolean).join(" · ");
  const ours = athletes.filter((a) => race.athleteIds.includes(a.id));
  const tab = tabPick || (days.includes(today) ? "sure" : "wx");
  const openCam = (kind) => (setCam({ kind, back: tab }), setTab("media"));

  return (
    <Shell
      title={race.name || "Yarış"}
      sub={sub}
      back={`/athletes/races/${id}`}
      action={
        <button type="button" onClick={() => setSum(true)} data-press className="btn btn-secondary btn-sm">
          Özet
        </button>
      }
    >
      {timer.running && tab !== "sure" && (
        <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-[5] mt-2">
          <button type="button" onClick={() => setTab("sure")} className={`flex h-11 w-full items-center justify-between rounded-xl px-4 text-white active:translate-y-px ${!timer.up && timer.rem <= 10 ? "bg-rec" : "bg-deep"}`}>
            <span className="text-[0.875rem]">{timer.up ? "Startan beri" : "Start sayacı"}</span>
            <b className="text-[1.25rem] font-semibold tabular-nums">{mmss(timer.up ? upSec(timer.t.end, timer.now) : Math.max(0, timer.rem))}</b>
          </button>
        </div>
      )}
      {/* Günler küçük kare: üstte gün, altta "Ant" ya da "1. gün" (Seyhun 2026-10-19: "daha az yazıyla") */}
      <div ref={strip} className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
        {days.map((d) => (
          <button
            key={d}
            data-day={d}
            type="button"
            onClick={() => setDay(d)}
            aria-pressed={d === cur}
            aria-label={`${names[d]} · ${dayLabel(d)}`}
            className={`flex h-[3.25rem] min-w-[3rem] shrink-0 flex-col items-center justify-center rounded-[0.875rem] px-1.5 active:scale-95 ${d === cur ? "bg-deep text-white" : "bg-card ring-1 ring-line"}`}
          >
            <b className="text-[1.0625rem] font-semibold leading-none tabular-nums">{+d.slice(8)}</b>
            <small className={`mt-1 text-[0.6875rem] leading-none ${d === cur ? "text-white/75" : "text-mut"}`}>{names[d].replace("Antrenman ", "Ant ")}</small>
          </button>
        ))}
        <button type="button" onClick={() => setAddDay(true)} aria-label="Gün ekle" className="grid h-[3.25rem] w-12 shrink-0 place-items-center rounded-[0.875rem] border border-dashed border-line text-[1.375rem] text-acc active:scale-95">
          +
        </button>
      </div>
      {tab === "wx" && <WeatherTab orgId={orgId} race={race} day={cur} live={live} onChange={change} onRace={setRace} />}
      {tab === "sure" && <TimerTab orgId={orgId} race={race} day={cur} live={live} onChange={change} rf={rf} onCam={openCam} onReset={() => setReset(true)} />}
      {tab === "res" && <ResultsTab orgId={orgId} race={race} ours={ours} club={athletes.filter(isActive)} onRace={setRace} />}
      {tab === "media" && (
        <MediaTab
          orgId={orgId}
          race={race}
          day={cur}
          live={live}
          ours={ours}
          onChange={change}
          rf={rf}
          cam0={cam?.kind || ""}
          onCamClose={() => cam && (setTab(cam.back), setCam(null))}
        />
      )}
      <VoidSheet ask={rf.ask} onChoose={rf.choose} />
      <DaySheet
        open={addDay}
        onClose={() => setAddDay(false)}
        days={days}
        today={today}
        cur={live.days.includes(cur) && !rdays.includes(cur) ? { day: cur, name: names[cur], empty: !live.media.some((m) => dayOf(m.at) === cur) && !live.starts.some((x) => x.day === cur) } : null}
        onAdd={(d) => {
          setAddDay(false);
          setDay(d);
          change((l) => ({ days: [...l.days, d] }), () => saveDays(orgId, id, [...live.days, d]));
        }}
        onDrop={(d) => {
          setAddDay(false);
          setDay("");
          const next = live.days.filter((x) => x !== d);
          change({ days: next }, () => saveDays(orgId, id, next));
        }}
      />
      <TabDock value={tab} onChange={setTab} />
      <ResetSheet
        open={reset}
        onClose={() => setReset(false)}
        live={live}
        onReset={async (media) => {
          const patch = resetPatch(media, Date.now());
          try {
            await resetLive(orgId, id, patch, live.media);
          } catch {
            return toast("Sıfırlanamadı. İnterneti kontrol et.");
          }
          // Bu yarışın start sayacı da durur (diğer cihazlara useLiveSync ile gider)
          const t = readTimer();
          if (t.mode === "start" && t.end != null && mineHere(t)) writeTimer({ ...pickTimer({}), zero: t.zero });
          setDay("");
          setLive((l) => cleanLive({ ...l, ...patch }));
          setReset(false);
          toast("Denemeler sıfırlandı");
        }}
      />
      <DaySummarySheet open={sum} onClose={() => setSum(false)} race={race} day={cur} live={live} ours={ours} />
    </Shell>
  );
}

// Sekmeler en altta (Seyhun 2026-10-19: "alttan yönetelim"); sekmenin düğme şeridi (Countdown Bar) bunun üstünde durur (--bar-b)
const TAB_ICON = { sure: "clock", media: "image", wx: "wind", res: "flag" };
export function TabDock({ value, onChange }) {
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--bar-b", "calc(env(safe-area-inset-bottom) + 4.75rem)");
    return () => r.removeProperty("--bar-b");
  }, []);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[30rem] px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <div className="grid grid-cols-4 rounded-[1.25rem] border border-line bg-card p-1.5 shadow-[0_2px_12px_rgba(38,40,44,.06)]">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={value === k} className={`flex flex-col items-center gap-0.5 rounded-[0.875rem] py-1.5 text-[0.71875rem] ${value === k ? "bg-accbg font-semibold text-deep" : "text-mut"}`}>
            <Icon name={TAB_ICON[k]} className="size-[1.375rem]" />
            {l}
          </button>
        ))}
      </div>
    </nav>
  );
}

function Shell({ title, sub, back = "/athletes/races", action, children }) {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(env(safe-area-inset-bottom)+11rem)]">
      <PageHeader title={title} sub={sub} back={back}>
        {action}
      </PageHeader>
      {children}
    </main>
  );
}
