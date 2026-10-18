"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { Seg } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { loadAthletes, isActive } from "@/features/athletes/data";
import { loadRace } from "@/features/athletes/races";
import { raceDays } from "@/features/athletes/raceWeather";
import { loadLive, saveStarts } from "@/features/athletes/raceLiveStore";
import { beginRace, cleanLive, zeroRace } from "@/lib/raceLive";
import { mmss } from "@/lib/raceScore";
import { readTimer, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { todayStr } from "@/lib/utils/format";
import { WeatherTab } from "./WeatherTab";
import { TimerTab } from "./TimerTab";
import { ResultsTab } from "./ResultsTab";
import { MediaTab } from "./MediaTab";
import { DaySummarySheet } from "./DaySummarySheet";

// Yarış günü sayfası (Seyhun 2026-10-18; onaylı örnek /mnt/project-files/yaris-tasarim/multimedya/sayfa.png):
// Hava: yarış yerinin saatlik tahmini (hava sayfasındaki grafik) + elle yazılan rüzgâr noktaları; Süre: start sayacı (5 dk dizisi)
// ve günün yarışları; Sonuçlar: sonuç PDF'inden Genel ve Bizimkiler; Medya: fotoğraf/video, yarışa göre gruplu.
// Kayıt raceLive belgesinde (raceLiveStore.js); çok günlü yarışta üstte gün seçilir. ?tab=sure (asistan sayacı başlatınca).
// Start sayacı başka sekmede ve sayfada da öter (Countdown.jsx TimerSound); sayfanın diğer sekmelerinde küçük süre satırı görünür (dokununca Süre).
// Sağ üstte "Özet": seçili günün kartı (rüzgâr, yarışlar, bizimkiler) veliye/Instagram'a paylaşılır (DaySummarySheet).
const TABS = [["wx", "Hava"], ["sure", "Süre"], ["res", "Sonuçlar"], ["media", "Medya"]];
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

export function RaceMedia({ orgId, id }) {
  const toast = useToast();
  const q = useSearchParams();
  const [tab, setTab] = useState(TABS.some(([k]) => k === q.get("tab")) ? q.get("tab") : "wx");
  const [race, setRace] = useState(null);
  const [missing, setMissing] = useState(false);
  const [live, setLive] = useState(() => cleanLive({}));
  const [athletes, setAthletes] = useState([]);
  const today = todayStr();
  const [day, setDay] = useState("");
  const [sum, setSum] = useState(false);

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
        const next = zeroRace(l.starts, t.rid, end, l.wind);
        if (next === l.starts) return {};
        saveStarts(orgId, id, next).catch(() => {});
        return { starts: next };
      });
    },
    [change, orgId, id],
  );
  const timer = useTimerRun({ onZero });
  // Sayaç asistanla ("5 dakikalık sayacı başlat") başlatıldıysa yarışa bağlı değildir: yarış satırı burada açılır (fotoğraflar ona düşsün)
  const tEnd = timer.t.end;
  const tFree = timer.t.mode === "start" && tEnd != null && !timer.t.rid;
  useEffect(() => {
    if (!race || !tFree) return;
    const id2 = setTimeout(() => {
      const t = readTimer();
      if (t.rid || t.end == null || t.end < Date.now()) return;
      change((l) => {
        const got = beginRace(l.starts, Date.now(), t.end);
        writeTimer({ ...t, rid: got.id });
        saveStarts(orgId, id, got.starts).catch(() => {});
        return { starts: got.starts };
      });
    }, 0);
    return () => clearTimeout(id2);
  }, [race, tFree, tEnd, change, orgId, id]);

  if (missing) return <Shell title="Yarış"><p className="mt-6 text-center text-[0.875rem] text-mut">Yarış bulunamadı.</p></Shell>;
  if (!race) return <Shell title="Yarış"><Loading label="Yarış yükleniyor" /></Shell>;

  const days = raceDays(race);
  const cur = day || (days.includes(today) ? today : !days.length || today < days[0] ? days[0] || today : days[days.length - 1]);
  const n = days.indexOf(cur) + 1;
  const sub = [race.district || race.city, n > 0 && days.length > 1 ? `${n}. gün` : "", dayLabel(cur)].filter(Boolean).join(" · ");
  const ours = athletes.filter((a) => race.athleteIds.includes(a.id));

  return (
    <Shell
      title={race.name || "Yarış"}
      sub={sub}
      back={`/athletes/races/${id}`}
      action={
        <button type="button" onClick={() => setSum(true)} className="h-9 rounded-full bg-card px-3.5 text-[0.875rem] font-semibold ring-1 ring-line active:scale-95">
          Özet
        </button>
      }
    >
      <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-[5] mt-2">
        <Seg value={tab} onChange={setTab} options={TABS} />
        {timer.running && tab !== "sure" && (
          <button type="button" onClick={() => setTab("sure")} className={`mt-2 flex h-11 w-full items-center justify-between rounded-xl px-4 text-white active:translate-y-px ${!timer.up && timer.rem <= 10 ? "bg-rec" : "bg-deep"}`}>
            <span className="text-[0.875rem]">{timer.up ? "Startan beri" : "Start sayacı"}</span>
            <b className="text-[1.25rem] font-semibold tabular-nums">{mmss(timer.up ? Math.floor((timer.now - timer.t.end) / 1000) : Math.max(0, timer.rem))}</b>
          </button>
        )}
      </div>
      {days.length > 1 && (
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {days.map((d, i) => (
            <button key={d} type="button" onClick={() => setDay(d)} aria-pressed={d === cur} className={`h-9 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-semibold active:scale-95 ${d === cur ? "bg-deep text-white" : "bg-card ring-1 ring-line"}`}>
              {i + 1}. gün · {dayLabel(d)}
            </button>
          ))}
        </div>
      )}
      {tab === "wx" && <WeatherTab orgId={orgId} race={race} day={cur} live={live} onChange={change} />}
      {tab === "sure" && <TimerTab orgId={orgId} race={race} day={cur} live={live} onChange={change} />}
      {tab === "res" && <ResultsTab orgId={orgId} race={race} ours={ours} club={athletes.filter(isActive)} onRace={setRace} />}
      {tab === "media" && <MediaTab orgId={orgId} race={race} day={cur} live={live} ours={ours} onChange={change} />}
      <DaySummarySheet open={sum} onClose={() => setSum(false)} race={race} day={cur} live={live} ours={ours} />
    </Shell>
  );
}

function Shell({ title, sub, back = "/athletes/races", action, children }) {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+6rem)]">
      <PageHeader title={title} sub={sub} back={back}>
        {action}
      </PageHeader>
      {children}
    </main>
  );
}
