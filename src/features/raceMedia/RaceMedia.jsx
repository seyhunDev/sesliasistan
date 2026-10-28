"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { loadAthletes, isActive } from "@/features/athletes/data";
import { loadRace } from "@/features/athletes/races";
import { raceDays } from "@/features/athletes/raceWeather";
import { loadLive, resetLive, saveDays, saveStarts } from "@/features/athletes/raceLiveStore";
import { canShare, loadSharedWind, shareWind } from "@/features/athletes/sharedRaces";
import { cleanLive, dayNames, dayOf, liveDays, ownedBy, pickTimer, resetPatch, upSec, withToday, zeroRace } from "@/lib/raceLive";
import { mmss } from "@/lib/raceScore";
import { mineHere, ownHere, readTimer, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { todayStr } from "@/lib/utils/format";
import { VoidSheet, useRaceFlow } from "./useRaceFlow";
import { TimerHead, TimerTab } from "./TimerTab";
import { ResultsTab } from "./ResultsTab";
import { MediaSettingsButton, MediaTab } from "./MediaTab";
import { RecPick } from "./RecPick";
import { DaySummarySheet } from "./DaySummarySheet";
import { DaySheet } from "./DaySheet";
import { ResetSheet } from "./ResetSheet";
import { useLiveSync } from "./useLiveSync";
import { takeShot } from "./handoff";
import { useTabInUrl } from "@/hooks/useTabInUrl";
import { CourseTab } from "./CourseTab";

// Yarış günü sayfası (Seyhun 2026-10-18; onaylı örnek /mnt/project-files/yaris-tasarim/multimedya/sayfa.png):
// Süre: start sayacı (5 dk dizisi)
// ve günün yarışları; Sonuçlar: sonuç PDF'inden Genel ve Bizimkiler; Medya: fotoğraf/video, yarışa göre gruplu.
// Kayıt raceLive belgesinde (raceLiveStore.js); çok günlü yarışta üstte gün seçilir. ?tab=sure (asistan sayacı başlatınca).
// Start sayacı başka sekmede ve sayfada da öter (Countdown.jsx TimerSound); sayfanın diğer sekmelerinde küçük süre satırı görünür (dokununca Süre).
// Sağ üstte "Özet": seçili günün kartı (rüzgâr, yarışlar, bizimkiler) veliye/Instagram'a paylaşılır (DaySummarySheet).
// Sıra yarış gününün işine göre (Seyhun 2026-10-18 onayı): Süre · Medya · Sonuçlar; yarış günü Süre'yle, başka gün Medya'yla açılır.
// Hava sekmesi kalktı (Seyhun 2026-10-26: "multimedyada artık gerek yok, hava durumuna zaten birçok yerde bakıyoruz"); yarışın havası
// yarış sayfasının üstünde (RaceWx.jsx).
const TABS = [["sure", "Süre"], ["media", "Medya"], ["res", "Sonuçlar"]];
// Parkur yalnız yarışta (Seyhun 2026-10-28 "Parkur analizi"); antrenman günü sayfası TABS'ı kullanır
const RACE_TABS = [TABS[0], TABS[1], ["course", "Parkur"], TABS[2]]; // örnekteki sıra: Süre · Medya · Parkur · Sonuçlar
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

export function RaceMedia({ orgId, id }) {
  const toast = useToast();
  const q = useSearchParams();
  const [tabPick, setTab] = useState(RACE_TABS.some(([k]) => k === q.get("tab")) ? q.get("tab") : "");
  useTabInUrl(tabPick);
  const [shot, setShot] = useState(() => takeShot(id)); // alttaki Kayıt (ya da ana sayfadaki yarış şeridi) ile iPhone kamerasında çekilen dosya (Medya işler)
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
      (l) => on && ((liveIn.current = true), setLive(l)),
      () => {},
    );
    loadAthletes()
      .then((d) => on && setAthletes(d.athletes || []))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [orgId, id]);

  // Ortak yarış (race.shared, Seyhun 2026-10-28): ekleyen kulüp ölçülen rüzgârı ortağa da yazar (sharedRaces/{id}/live/wind);
  // başka kulüpte kendi rüzgâr kaydı boşsa ortaktaki gösterilir
  const liveIn = useRef(false);
  const windSent = useRef(null);
  const sid = race?.shared || "";
  useEffect(() => {
    if (!sid || !liveIn.current) return;
    const k = JSON.stringify(live.wind);
    if (windSent.current === k) return;
    const first = windSent.current === null;
    windSent.current = k;
    if (first && !live.wind.length) {
      loadSharedWind(sid).then((w) => w.length && setLive((l) => (l.wind.length ? l : ((windSent.current = JSON.stringify(cleanLive({ ...l, wind: w }).wind)), cleanLive({ ...l, wind: w })))));
      return;
    }
    const list = live.wind;
    canShare(sid).then((ok) => ok && shareWind(sid, list), () => {});
  }, [sid, live.wind]);

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
      if (t?.mode !== "start" || !t.rid || !ownedBy(t.own, ownHere())) return; // düz start yarış açmaz ("+ Yarış yap" ile); başka sayfanın sayacı bu yarışa yazılmaz
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

  if (missing) return <Shell title="Yarış"><p className="mt-6 text-center text-[0.875rem] text-mut">Yarış bulunamadı.</p></Shell>;
  if (!race) return <Shell title="Yarış"><Loading label="Yarış yükleniyor" /></Shell>;

  const days = withToday(liveDays(rdays, live), rdays, today);
  const names = dayNames(rdays, days);
  const cur = day || (days.includes(today) ? today : !days.length || today < days[0] ? days[0] || today : days[days.length - 1]);
  const sub = [race.district || race.city, names[cur] && names[cur] !== "Yarış" ? names[cur] : "", dayLabel(cur)].filter(Boolean).join(" · ");
  const ours = athletes.filter((a) => race.athleteIds.includes(a.id));
  const tab = tabPick || (days.includes(today) ? "sure" : "media");

  return (
    <Shell
      title={race.name || "Yarış"}
      sub={sub}
      back={`/athletes/races/${id}`}
      action={
        <>
          {tab === "media" && <MediaSettingsButton dark />}
          <button type="button" onClick={() => setSum(true)} data-press className="raised h-10 shrink-0 rounded-full border px-3.5 text-[0.875rem] font-semibold">
            Özet
          </button>
        </>
      }
      top={
        <>
          {/* Günler küçük kare: üstte gün, altta "Ant" ya da "1. gün" (Seyhun 2026-10-19: "daha az yazıyla") */}
          <div ref={strip} className="-mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
            {days.map((d) => (
              <button
                key={d}
                data-day={d}
                type="button"
                onClick={() => setDay(d)}
                aria-pressed={d === cur}
                aria-label={`${names[d]} · ${dayLabel(d)}`}
                className={`raised flex h-[3.25rem] min-w-[3rem] shrink-0 flex-col items-center justify-center rounded-[0.875rem] border px-1.5 ${d === cur ? "ck-sel" : ""}`}
              >
                <b className="text-[1.0625rem] font-semibold leading-none tabular-nums">{+d.slice(8)}</b>
                <small className="mt-1 text-[0.6875rem] leading-none text-white/75">{names[d].replace("Antrenman ", "Ant ")}</small>
              </button>
            ))}
            <button type="button" onClick={() => setAddDay(true)} aria-label="Gün ekle" className="grid h-[3.25rem] w-12 shrink-0 place-items-center rounded-[0.875rem] border border-dashed border-white/30 text-[1.375rem] text-[#67e8f9] active:scale-95">
              +
            </button>
          </div>
          {tab === "sure" && <TimerHead race={race} live={live} rf={rf} />}
        </>
      }
    >
      {timer.running && tab !== "sure" && (
        <div className="sticky top-[calc(0.5rem+env(safe-area-inset-top))] z-[5] mt-4">
          <button type="button" onClick={() => setTab("sure")} className={`flex h-11 w-full items-center justify-between rounded-xl px-4 text-white active:translate-y-px ${!timer.up && timer.rem <= 10 ? "bg-rec" : "bg-deep"}`}>
            <span className="text-[0.875rem]">{timer.up ? "Startan beri" : "Start sayacı"}</span>
            <b className="text-[1.25rem] font-semibold tabular-nums">{mmss(timer.up ? upSec(timer.t.end, timer.now) : Math.max(0, timer.rem))}</b>
          </button>
        </div>
      )}
      {tab === "sure" && <TimerTab orgId={orgId} race={race} day={cur} live={live} onChange={change} rf={rf} onReset={() => setReset(true)} />}
      {tab === "course" && <CourseTab orgId={orgId} race={race} day={cur} />}
      {tab === "res" && <ResultsTab orgId={orgId} race={race} ours={ours} club={athletes.filter(isActive)} onRace={setRace} />}
      {tab === "media" && (
        <MediaTab
          orgId={orgId}
          race={race}
          day={cur}
          live={live}
          ours={ours}
          onChange={change}
          file0={shot}
          onFileDone={() => setShot(null)}
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
      <TabDock tabs={RACE_TABS} value={tab} onChange={setTab} onRec={(f) => (setShot(f), setTab("media"))} />
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

// Sekmeler en altta (Seyhun 2026-10-19: "alttan yönetelim"); sekmenin düğme şeridi (Countdown Bar) bunun üstünde durur (--bar-b).
// Yanında tek Kayıt düğmesi (Seyhun 2026-10-22: ayrı Fotoğraf/Video düğmeleri kalktı): her sekmeden iPhone kamerasını açar (RecPick), çekilen Medya'da
const TAB_ICON = { sure: "clock", media: "image", res: "flag", course: "map" };
// extra: sağa eklenen düğme (antrenman sayfasında asistan, Seyhun 2026-10-23)
export function TabDock({ tabs = TABS, value, onChange, onRec, extra = null }) {
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--bar-b", "calc(env(safe-area-inset-bottom) + 4.75rem)");
    return () => r.removeProperty("--bar-b");
  }, []);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[31] mx-auto w-full max-w-[30rem] px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <div className="flex gap-2">
        <div className="grid flex-1 grid-cols-4 rounded-[1.25rem] border border-line bg-card p-1.5 shadow-[0_2px_12px_rgba(38,40,44,.06)]">
          {tabs.map(([k, l]) => (
            <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={value === k} className={`flex flex-col items-center gap-0.5 rounded-[0.875rem] py-1.5 text-[0.71875rem] ${value === k ? "bg-accbg font-semibold text-deep" : "text-mut"}`}>
              <Icon name={TAB_ICON[k]} className="size-[1.375rem]" />
              {l}
            </button>
          ))}
        </div>
        {onRec && (
          <RecPick onFile={onRec} onTaken={() => onChange("media")} aria-label="Kayıt" className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-[1.25rem] border border-line bg-card text-[0.71875rem] font-semibold shadow-[0_2px_12px_rgba(38,40,44,.06)]">
            <span className="grid size-[1.375rem] place-items-center rounded-full border-2 border-rec">
              <span className="size-2.5 rounded-full bg-rec" />
            </span>
            Kayıt
          </RecPick>
        )}
        {extra}
      </div>
    </nav>
  );
}

// Lacivert üst (yeni tasarım, Seyhun 2026-10-28 "1" önerisi): geri, yarış adı, Çekim · Özet, gün çipleri ve Süre'de büyük sayaç lacivertte;
// altındaki açık alan yuvarlak köşeyle başlar (antrenman günü sayfası gibi)
function Shell({ title, sub, back = "/athletes/races", action, top = null, children }) {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(env(safe-area-inset-bottom)+11rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label={title}>
        <header className="flex items-center gap-2.5">
          <BackButton href={back} />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{title}</h1>
            {sub && <p className="truncate text-[0.8125rem] text-white/65">{sub}</p>}
          </div>
          {action}
        </header>
        {top}
      </section>
      <div className="relative -mx-5 -mt-6 rounded-t-[1.75rem] bg-bg px-5 pb-1 pt-1">{children}</div>
    </main>
  );
}
