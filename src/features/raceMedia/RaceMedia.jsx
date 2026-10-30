"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { loadAthletes, isActive } from "@/features/athletes/data";
import { loadRace } from "@/features/athletes/races";
import { raceDays } from "@/features/athletes/raceWeather";
import { loadLive, resetLive, saveDays, saveStarts, saveWind } from "@/features/athletes/raceLiveStore";
import { canShare, loadSharedWind, shareWind } from "@/features/athletes/sharedRaces";
import { cleanLive, dayNames, dayOf, liveDays, ownedBy, pickTimer, resetPatch, upSec, withToday, zeroRace } from "@/lib/raceLive";
import { mmss } from "@/lib/raceScore";
import { mineHere, ownHere, readTimer, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { todayStr } from "@/lib/utils/format";
import { VoidSheet, useRaceFlow } from "./useRaceFlow";
import { TimerHead, TimerTab } from "./TimerTab";
import { ResultsTab } from "./ResultsTab";
import { MediaTab, openMediaSettings } from "./MediaTab";
import { Sheet } from "@/components/ui/Sheet";
import { card } from "@/components/ui/Page";
import { buttonClass } from "@/components/ui/buttonClass";
import { RecPick } from "./RecPick";
import { DaySummarySheet } from "./DaySummarySheet";
import { DayPick, DaySheet } from "./DaySheet";
import { ResetSheet } from "./ResetSheet";
import { useLiveSync } from "./useLiveSync";
import { takeShot } from "./handoff";
import { useTabInUrl } from "@/hooks/useTabInUrl";
import { CourseTab } from "./CourseTab";
import { MEDIA_MENU, RACE_SECS } from "@/lib/raceMenu";
import { VoiceLight } from "@/features/home/TabBar";
import { useAssistant } from "@/features/assistant/AssistantProvider";

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
// Saha = Parkur + yarışın havası + sesle yazılan rüzgâr (Seyhun 2026-10-30, yaris-yapi); Yarış'ın hemen yanında
const RACE_TABS = [["course", "Saha"], TABS[0], TABS[1], TABS[2]];
// Yarış sayfası ve multimedya tek sayfa gibi (Seyhun 2026-10-29 "detay, multimedya aynı sayfa farklı sekmeler olsun"): alt çubukta
// ilk sekme Yarış (yarış sayfası /athletes/races/<id>), diğerleri multimedya (/media?tab=…); geçiş replace ile, geri tuşu listeye
export const RACE_DOCK = [["race", "Yarış"], ...RACE_TABS];
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

// ⋯ menüsünün multimedya işleri (lib/raceMenu.js MEDIA_MENU): menüden ya da yarış sayfasının ⋯ menüsünden (?do=)
function menuAct(k, { setSum, setTab, setAddDay, setReset }) {
  if (k === "sum") setSum(true);
  else if (k === "shot") (setTab("media"), setTimeout(openMediaSettings, 150));
  else if (k === "day") setAddDay(true);
  else if (k === "reset") setReset(true);
}

export function RaceMedia({ orgId, id }) {
  const toast = useToast();
  const q = useSearchParams();
  const router = useRouter();
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
  const [menu, setMenu] = useState(false); // sağ üstteki tek ⋯ (yarış sayfasındakiyle aynı liste, lib/raceMenu.js)
  const [addDay, setAddDay] = useState(false);
  const [pickDay, setPickDay] = useState(false);
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
  // Yarış sayfasının ⋯ menüsünden gelen iş (?do=sum|shot|day|reset) yarış yüklenince bir kez açılır
  const todo = useRef(q.get("do") || "");
  const ready = !!race;
  const sets = { setSum, setTab, setAddDay, setReset };
  const run = (k) => menuAct(k, sets);
  useEffect(() => {
    const k = todo.current;
    if (!ready || !k) return;
    const t = setTimeout(() => ((todo.current = ""), menuAct(k, { setSum, setTab, setAddDay, setReset })), 0);
    return () => clearTimeout(t);
  }, [ready]);

  if (missing) return <Shell title="Yarış"><p className="mt-6 text-center text-[0.875rem] text-mut">Yarış bulunamadı.</p></Shell>;
  if (!race) return <Shell title="Yarış"><Loading label="Yarış yükleniyor" /></Shell>;

  const days = withToday(liveDays(rdays, live), rdays, today);
  const names = dayNames(rdays, days);
  const cur = day || (days.includes(today) ? today : !days.length || today < days[0] ? days[0] || today : days[days.length - 1]);
  const sub = [race.district || race.city, names[cur] && names[cur] !== "Yarış" && !/^\d+\. gün$/.test(names[cur]) ? names[cur] : ""].filter(Boolean).join(" · "); // tarih gün düğmesinde; "4. gün" yazılmaz (2026-10-29)
  const ours = athletes.filter((a) => race.athleteIds.includes(a.id));
  const tab = tabPick || (days.includes(today) ? "sure" : "media");

  return (
    <Shell
      full={tab === "course"}
      title={race.name || "Yarış"}
      sub={sub}
      back="/athletes/races"
      action={
        <>
          <button type="button" data-cur={cur} onClick={() => setPickDay(true)} aria-label={`Gün: ${names[cur]} · ${dayLabel(cur)}`} data-press className="raised flex h-10 shrink-0 items-center gap-1 rounded-full border px-3.5 text-[0.875rem] font-semibold tabular-nums">
            {cur === today ? "Bugün" : dayLabel(cur)}
            <span aria-hidden="true" className="text-[0.75rem] opacity-70">▾</span>
          </button>
          {/* Tek ⋯ (Seyhun 2026-10-30): yarışın bölümleri, multimedya işleri, düzenle, sil; yarış sayfasındakiyle aynı */}
          <button type="button" onClick={() => setMenu(true)} aria-label="Yarış ayarları" data-press className={buttonClass({ variant: "back" })}>
            <Icon name="more" className="size-5" />
          </button>
        </>
      }
      top={
        <>
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
      {tab === "sure" && <TimerTab orgId={orgId} race={race} day={cur} live={live} onChange={change} rf={rf} />}
      {tab === "course" && (
        <CourseTab
          orgId={orgId}
          race={race}
          day={cur}
          wind={live.wind}
          onDropWind={(at) => {
            const next = live.wind.filter((w) => w.at !== at);
            change({ wind: next }, () => saveWind(orgId, id, next));
          }}
        />
      )}
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
      <DayPick
        open={pickDay}
        onClose={() => setPickDay(false)}
        days={days}
        names={names}
        cur={cur}
        today={today}
        label={dayLabel}
        onPick={(d) => (setDay(d), setPickDay(false))}
      />
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
      <TabDock tabs={RACE_DOCK} value={tab} onChange={(k) => (k === "race" ? router.replace(`/athletes/races/${id}`) : setTab(k))} onRec={(f) => (setShot(f), setTab("media"))} extra={<AskButton examples={tab === "course" ? COURSE_EX : RACE_EX} />} />
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
      <Sheet open={menu} onClose={() => setMenu(false)} title={race.name || "Yarış"}>
        {[
          RACE_SECS.map(([k, l]) => [k, l, () => router.replace(`/athletes/races/${id}?sec=${k}`)]),
          MEDIA_MENU.map(([k, l]) => [k, l, () => run(k)]),
          [["edit", "Bilgileri düzenle", () => router.replace(`/athletes/races/${id}?sec=edit`)]],
          [["del", "Yarışı sil", () => router.replace(`/athletes/races/${id}?sec=del`), true]],
        ].map((group, i) => (
          <ul key={i} className={`${card} mb-3 divide-y divide-line overflow-hidden`}>
            {group.map(([k, l, fn, red]) => (
              <li key={k}>
                <button type="button" data-press="row" data-menu={k} onClick={() => (setMenu(false), fn())} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <b className={`min-w-0 flex-1 text-[1rem] font-medium ${red ? "text-rec" : ""}`}>{l}</b>
                  {!red && <Icon name="chev" className="size-4 shrink-0 text-mut/60" />}
                </button>
              </li>
            ))}
          </ul>
        ))}
      </Sheet>
      <DaySummarySheet open={sum} onClose={() => setSum(false)} race={race} day={cur} live={live} ours={ours} />
    </Shell>
  );
}

// Sekmeler en altta (Seyhun 2026-10-19: "alttan yönetelim"); sekmenin düğme şeridi (Countdown Bar) bunun üstünde durur (--bar-b).
// Yanında tek Kayıt düğmesi (Seyhun 2026-10-22: ayrı Fotoğraf/Video düğmeleri kalktı): her sekmeden iPhone kamerasını açar (RecPick), çekilen Medya'da
const TAB_ICON = { race: "cal", sure: "clock", media: "image", res: "flag", course: "wind" };
// extra: sağa eklenen düğme (antrenman sayfasında asistan, Seyhun 2026-10-23)
export function TabDock({ tabs = TABS, value, onChange, onRec, extra = null }) {
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--bar-b", "calc(env(safe-area-inset-bottom) + 5rem)");
    return () => r.removeProperty("--bar-b");
  }, []);
  // Uygulamanın alt sekme çubuğuyla aynı (Seyhun 2026-10-29 "uygulamayla uyumlu"): kenardan kenara bulanık çubuk, seçili sekme camgöbeği,
  // Kayıt sağ uçta asistan küresinin yerinde yukarı taşan yuvarlak düğme
  return (
    <nav aria-label="Multimedya sekmeleri" className="atabbar fixed inset-x-0 bottom-0 z-[31] pb-[max(0.25rem,calc(env(safe-area-inset-bottom)-0.5rem))]">
      <div className="mx-auto flex h-14 max-w-[34rem] items-stretch">
        <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map(([k, l]) => (
            <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={value === k} className={`flex h-full min-w-0 touch-manipulation flex-col items-center justify-center gap-1 transition active:scale-95 ${value === k ? "text-acc" : "text-mut"}`}>
              <Icon name={TAB_ICON[k]} className="size-6" />
              <span className={`text-[0.6875rem] ${value === k ? "font-bold" : "font-medium"}`}>{l}</span>
            </button>
          ))}
        </div>
        {onRec && (
          <div className="relative w-[3.75rem] shrink-0">
            <span className="acenter absolute -top-4 left-1/2 -translate-x-1/2 rounded-full p-[3px]">
              <RecPick onFile={onRec} onTaken={() => onChange("media")} aria-label="Kayıt" className="grid size-[3.25rem] touch-manipulation place-items-center rounded-full border-[3px] border-rec transition active:scale-90">
                <span className="size-[2.125rem] rounded-full bg-rec" />
              </RecPick>
            </span>
          </div>
        )}
        {extra && <div className="relative w-[4rem] shrink-0">{extra}</div>}
      </div>
    </nav>
  );
}

// Asistan (Seyhun 2026-10-29 "ses asistanı butonunu da koyalım parkura"): basılı tut konuş, bırak gönder; örnekler sekmeye göre
const RACE_EX = ["Rüzgar 12 knot kuzeybatı", "5 dakikalık sayacı başlat"];
const COURSE_EX = ["Parkur ekseni 320", "Pinden komite 110", "Rüzgar 330 derece 12 knot"];
export function AskButton({ examples = RACE_EX }) {
  const { openAssistant, act } = useAssistant();
  const release = ({ short, away }) => (short ? (act.current.release || act.current.cancel)?.() : away ? act.current.cancel?.() : (act.current.release || act.current.stop)?.());
  return (
    <span className="acenter absolute -top-4 left-1/2 -translate-x-1/2 rounded-full p-[3px]">
      <VoiceLight state="idle" size="size-[3.25rem]" compact onPress={() => openAssistant({ listen: true, dock: true, examples })} onRelease={release} />
    </span>
  );
}

// Lacivert üst (yeni tasarım, Seyhun 2026-10-28 "1" önerisi): geri, yarış adı, Çekim · Özet, gün çipleri ve Süre'de büyük sayaç lacivertte;
// altındaki açık alan yuvarlak köşeyle başlar (antrenman günü sayfası gibi)
function Shell({ title, sub, back = "/athletes/races", action, top = null, full = false, children }) {
  // full: bütün sayfa lacivert (Parkur, Seyhun 2026-10-29 "arka planı uygulamayla uyumlu"); alt açık bölüm yok
  return (
    <main className={`mx-auto max-w-[30rem] px-5 ${full ? "" : "pb-[calc(env(safe-area-inset-bottom)+11rem)]"}`}>
      <section className={`ck -mx-5 px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] ${full ? "min-h-dvh pb-[calc(env(safe-area-inset-bottom)+11rem)]" : "pb-9"}`} aria-label={title}>
        <header className="flex items-center gap-2.5">
          <BackButton href={back} />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{title}</h1>
            {sub && <p className="truncate text-[0.8125rem] text-white/65">{sub}</p>}
          </div>
          {action}
        </header>
        {top}
        {full && children}
      </section>
      {!full && <div className="relative -mx-5 -mt-6 rounded-t-[1.75rem] bg-bg px-5 pb-1 pt-1">{children}</div>}
    </main>
  );
}
