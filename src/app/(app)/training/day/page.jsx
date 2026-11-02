"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { isActive, loadAthletes } from "@/features/athletes/data";
import { loadLive } from "@/features/athletes/raceLiveStore";
import { RollPanel } from "@/features/athletes/RollPanel";
import { TrainingLog } from "@/features/add/TrainingLog";
import { Countdown, raceFinish, readTimer, useTimerRun } from "@/features/training/Countdown";
import { useTrainingFlow } from "@/features/training/useTrainingFlow";
import { FinishTap, useTrainList } from "@/features/training/TrainFlow";
import { RecPick } from "@/features/raceMedia/RecPick";
import { Marks } from "@/features/raceMedia/TimerTab";
import { MediaSettingsButton, MediaTab } from "@/features/raceMedia/MediaTab";
import { AskButton, TabDock } from "@/features/raceMedia/RaceMedia";
import { useLiveSync } from "@/features/raceMedia/useLiveSync";
import { Races } from "@/features/training/Races";
import { aliasesOf, useNameIndex } from "@/features/athletes/names";
import { useSpeech } from "@/hooks/useSpeech";
import { voiceResult, voiceText } from "@/lib/raceVoice";
import { canLog, isTraining, pickPlan } from "@/lib/trainingLog";
import { cleanRaces, entrantsOf, mmss, newRace, standings } from "@/lib/raceScore";
import { BUOYS, cleanBuoys, cleanLive, upSec } from "@/lib/raceLive";
import { todayStr } from "@/lib/utils/format";
import { useTabInUrl } from "@/hooks/useTabInUrl";

// Antrenman sayfası (kulüp antrenmanı günü), yarış multimedya sayfasının düzeninde (Seyhun 2026-10-20 onayı,
// /mnt/project-files/antrenman-sayfasi/medya-ornek.png): altta Süre · Medya · Hava · Sonuçlar.
// Süre: multimedyanın sayacı (Countdown compact + Marks, useTrainingFlow; her start bir yarış açar) ve Yoklama, Yarışlar, Günlük satırları.
// Medya: multimedyanın MediaTab'ı; fotoğraf/video bu antrenmana bağlı (raceLive/ant-<planId>, Storage raceMedia), antrenman yarışlarına göre gruplu.
// Hava: multimedyanın WeatherTab'ı; yer planın `spot`u, yoksa Dikili. Sonuçlar: günün yarışları ve puan durumu (Races).
// Süre'de alt şeritte "Sonucu söyle" ve ana düğme (Başlat…; Seyhun 2026-10-22: "Başlat'ı ve Sonucu söyle'yi aşağı al, Rüzgâr'ı kaldır"): yarış sıralaması sesle ("1 Ali, 2 Ayşe", yalnız adlar da, karışık da), onaysız yazılır, 8 sn Geri al (lib/raceVoice.js voiceResult).
// Yeni tasarım (Seyhun 2026-10-21 onayı, /mnt/project-files/antrenman-sayfasi/yeni-tasarim/ornek.png): üstte lacivert kokpit (geri, ad, gün;
// Süre'de sayaç da orada). Yeni akış (Seyhun 2026-11-01, TrainFlow): altında Yoklama · Günlük düğmeleri, yarışta Bitiren kim? kareleri,
// günün yarışları (sıralama + videolar satırda, biten son yarış açık). Alt çubuk Yarış · Videolar; Video Başlat'ın yanında.
// Açılış: ?id=<antrenman planı> (plan penceresinden, gün penceresinden) ya da bugünün antrenmanı; ?tab=media|wx|res. Sesle: "antrenman sayfasını aç".
const stamp = () => Date.now();
const dayText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
const TABS = ["sure", "media"];
// Yeni akış (Seyhun 2026-11-01): Sonuçlar ve Hava sekmeleri kalktı; sonuç Yarış ekranında (TrainFlow), Kayıt yerine Başlat'ın yanında Video
const DOCK = [["sure", "Yarış"], ["media", "Videolar"]];
const iso = (ms) => new Date(ms).toISOString();

// Antrenman yarışları → multimedyanın start satırları (medyanın yarışı ve anı bunlara göre bulunur)
const startsOf = (races, day) =>
  (races || [])
    .map((r, i) => ({ r, n: i + 1 }))
    .filter(({ r }) => Number.isFinite(r.startAt))
    .map(({ r, n }) => ({ id: r.id, day, n, name: r.name, at: iso(r.startAt), cd: "", fin: r.fin != null ? iso(r.startAt + r.fin * 1000) : "", marks: {} }));

export default function TrainingDayPage() {
  return (
    <Suspense>
      <Day />
    </Suspense>
  );
}

function Day() {
  const q = useSearchParams();
  const id = q.get("id") || "";
  const { plans, updateRecord, saveDrafts, isLocked } = useData();
  const { profile } = useAuth();
  const toast = useToast();
  const racer = canSeeAthletes(profile?.email);
  const today = todayStr();
  const plan = (id && plans.find((p) => p.id === id)) || (!id ? pickPlan(plans, today) : null);
  const date = plan?.date || today;
  const by = { name: profile?.name ?? "Kullanıcı" }; // plan penceresindeki gibi (updatedBy)
  const [athletes, setAthletes] = useState([]);
  const [att, setAtt] = useState({}); // bu sayfada değişen yoklama: { "gün|id": durum | null }
  const [sheet, setSheet] = useState(""); // roll | races | log
  const [raceKey, setRaceKey] = useState({ k: 0, rid: null }); // Sonuçlar'dan açılan yarış
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState(TABS.includes(q.get("tab")) ? q.get("tab") : "sure");
  useTabInUrl(tab);
  const [shot, setShot] = useState(null); // alttaki Kayıt ile iPhone kamerasında çekilen dosya (Medya işler)
  const orgId = profile?.orgId || "";
  const liveId = plan && racer && orgId ? `ant-${plan.id}` : "";
  const [live, setLive] = useState(() => cleanLive({}));

  useEffect(() => {
    if (!racer) return;
    let on = true;
    loadAthletes()
      .then((d) => on && setAthletes((d.athletes || []).filter(isActive)))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [racer]);
  useEffect(() => {
    if (!liveId) return;
    let on = true;
    loadLive(orgId, liveId).then(
      (l) => on && setLive(l),
      () => {},
    );
    return () => {
      on = false;
    };
  }, [orgId, liveId]);
  useLiveSync({ orgId, raceId: liveId, setLive });
  // Bu sayfada yapılan değişiklik hemen görünür; kayıt arkada gider (multimedyadaki gibi)
  const change = useCallback(
    (patch, job) => {
      setLive((l) => cleanLive({ ...l, ...(typeof patch === "function" ? patch(l) : patch) }));
      Promise.resolve(job?.()).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
    },
    [toast],
  );

  const stateOf = (a) => (`${date}|${a.id}` in att ? att[`${date}|${a.id}`] : a.att?.[date.slice(0, 4)]?.[date.slice(5)] || null);
  const byName = (a, b) => a.name.localeCompare(b.name, "tr");
  const present = athletes.filter((a) => stateOf(a) === "present").map((a) => ({ id: a.id, name: a.studentName })).sort(byName);
  const others = athletes.filter((a) => stateOf(a) !== "present").map((a) => ({ id: a.id, name: a.studentName })).sort(byName);
  const races = plan?.races || [];
  const table = standings(races, present);
  const locked = plan && isLocked?.("plan", plan.id);
  // Sayaç yarış multimedyadakiyle aynı (sayaca dokununca başlar, start dizisi bipleri); planı olan günde her start bir yarış açar
  const saveRaces = (list) => updateRecord("plan", plan.id, { races: cleanRaces(list) }, by);
  const { flow, undo } = useTrainingFlow({ races, save: saveRaces });
  const tr = useTimerRun();
  const withRaces = plan && racer && !locked;
  const cur = withRaces && (tr.running || tr.t.left != null) ? races.find((r) => r.id === tr.t.rid) : null;
  const buoys = plan?.buoys ? cleanBuoys(plan.buoys) : BUOYS;
  const mark = (b) => {
    if (!cur || tr.t.end == null) return;
    const sec = upSec(tr.t.end, stamp());
    saveRaces(races.map((r) => (r.id === cur.id ? { ...r, marks: { ...r.marks, [b]: sec } } : r)));
    undo(`${b} · ${mmss(sec)}`, races);
  };
  const title = plan && plan.title !== "Antrenman" ? plan.title : "Antrenman";
  const spotKey = plan?.spot ? `${plan.spot.lat},${plan.spot.lon},${plan.spot.name}` : "";
  // Hava sekmesine verilen yer (aynı nesne kalsın: değişince hava yeniden alınır)
  const place = useMemo(() => ({ id: liveId, name: title, district: "Dikili", city: "İzmir", spot: spotKey ? plan.spot : null }), [liveId, title, spotKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const ours = present.length ? athletes.filter((a) => stateOf(a) === "present") : athletes;
  // Sonucu söyle: dokun konuş, bitince dokun; adlar sporculara eşlenir, yarışa hemen yazılır
  const { idx: nameIdx } = useNameIndex();
  const [said, setSaid] = useState("");
  const sayResult = (text) => {
    const r = voiceResult(text, {
      races,
      athletes,
      present: present.map((a) => a.id),
      aliases: Object.fromEntries(athletes.map((a) => [a.id, aliasesOf(nameIdx, a.id)])),
      runningId: tr.t.rid || "",
      force: true,
    });
    if (r.error) return setSaid(`“${text}” · ${r.error}`);
    saveRaces(r.list);
    setSaid(voiceText(r));
    undo(`${r.race.name} sonucu yazıldı`, races);
  };
  const sp = useSpeech({ names: athletes.map((a) => a.studentName), noLevel: true, onFinal: sayResult, onFail: (m) => toast(m) });

  async function addPlan() {
    setAdding(true);
    const r = await saveDrafts([{ type: "plan", title: "Antrenman", cat: "Antrenman", date: today, time: "", place: "", assignees: [] }], { source: "manual", by: profile?.uid });
    setAdding(false);
    if (r.error) toast("Kaydedilemedi, tekrar dene.");
  }
  const openRace = (rid) => (setRaceKey((x) => ({ k: x.k + 1, rid })), setSheet("races"));
  const addRace = () => {
    const r = newRace(races);
    saveRaces([...races, r]);
    openRace(r.id);
  };

  const sub = plan ? [date === today ? "Bugün" : "", dayText(date), plan.time, plan.place].filter(Boolean).join(" · ") : `Bugün · ${dayText(today)}`;
  const tabs = !!liveId && !locked;
  const shown = tabs ? tab : "sure";
  // Bitiren kim? kareleri: yoklamada gelenler, yoklama yoksa bütün sporcular, onlar da yoksa bugünkü yarışlara girenler
  const people = present.length ? present : athletes.length ? athletes.map((a) => ({ id: a.id, name: a.studentName })).sort(byName) : entrantsOf([], races);
  // Herkes bitince yarış biter: sıralama ve süre tek kayıtta, sayaç durur (8 sn Geri al)
  const finishAll = (x) => {
    const t = readTimer();
    const fin = upSec(x.startAt ?? t.end, stamp());
    saveRaces(races.map((o) => (o.id === x.id ? { ...x, fin } : o)));
    if (t.rid === x.id) raceFinish(null);
    undo(`${x.name} bitti · ${mmss(fin)}`, races, t);
  };
  const lastR = races.at(-1);
  const list = useTrainList({ races, date, tr, open: !cur && lastR?.finishes.length ? lastR.id : null, table, onOpen: openRace, onAdd: addRace });
  const voiceBtn = withRaces && (
    <button
      type="button"
      onClick={() => (sp.status === "listening" ? sp.stop() : sp.status === "idle" && (setSaid(""), sp.start({ autoStop: 0 })))}
      disabled={sp.status === "transcribing"}
      className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[0.875rem] px-2 text-[0.9375rem] font-semibold active:translate-y-px active:shadow-none disabled:opacity-60 ${sp.status === "listening" ? "bg-rec text-white" : "border border-line bg-card shadow-[0_2px_0_var(--line)]"}`}
    >
      <Icon name={sp.status === "listening" ? "stop" : "mic"} className="size-5 shrink-0" />
      <span className="truncate">{sp.status === "listening" ? "Bitince dokun" : sp.status === "transcribing" ? "Yazıya çevriliyor" : "Sesle söyle"}</span>
    </button>
  );
  const pill = "h-9 rounded-full border border-line bg-card px-3.5 text-[0.875rem] font-semibold text-fg2 active:translate-y-px";

  return (
    <main className={`mx-auto max-w-[30rem] px-5 ${tabs ? "pb-[calc(env(safe-area-inset-bottom)+11rem)]" : "pb-[calc(var(--dome-h,var(--stage-h,6rem))+6rem)]"}`}>
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label={title}>
        <header className="flex items-center gap-2.5">
          <BackButton href="/training" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{title}</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{sub}</p>
          </div>
          {shown === "media" && <MediaSettingsButton dark />}
        </header>
        {shown === "sure" && (
          <Countdown
            dark
            mode="start"
            race={withRaces ? flow : null}
            title={cur ? cur.name : ""}
            where={title}
            beforeStart={!plan && racer ? addPlan : undefined}
            bottom={tabs}
            rec={
              tabs && (
                <RecPick onFile={setShot} aria-label="Video" className="flex h-14 shrink-0 touch-manipulation items-center gap-2 rounded-2xl border border-line bg-card px-4 text-[1.0625rem] font-semibold shadow-[0_3px_0_var(--line)] active:translate-y-0.5 active:shadow-none">
                  <span className="size-5 rounded-full bg-rec" />
                  Video
                </RecPick>
              )
            }
          />
        )}
      </section>
      <div className="relative -mx-5 -mt-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
      {tabs && tr.running && shown !== "sure" && (
        <div className="sticky top-[calc(0.5rem+env(safe-area-inset-top))] z-[5] mb-3">
          <button type="button" onClick={() => setTab("sure")} className={`flex h-11 w-full items-center justify-between rounded-xl px-4 text-white active:translate-y-px ${!tr.up && tr.rem <= 10 ? "bg-rec" : "bg-deep"}`}>
            <span className="text-[0.875rem]">{tr.up ? "Startan beri" : "Start sayacı"}</span>
            <b className="text-[1.25rem] font-semibold tabular-nums">{mmss(tr.up ? upSec(tr.t.end, tr.now) : Math.max(0, tr.rem))}</b>
          </button>
        </div>
      )}

      {shown === "sure" && (
        <>
          {plan && (racer || canLog(plan, today)) && (
            <div className="flex gap-2">
              {racer && (
                <button type="button" onClick={() => setSheet("roll")} className={pill}>
                  {athletes.length ? (present.length ? `${present.length} kişi geldi` : "Yoklama") : "Yoklama"} ›
                </button>
              )}
              {canLog(plan, today) && !locked && (
                <button type="button" onClick={() => setSheet("log")} className={pill}>
                  {plan.log ? "Günlük" : "Günlük yazılmadı"} ›
                </button>
              )}
            </div>
          )}
          {withRaces && !!cur && tr.up && (
            <>
              <FinishTap race={cur} people={people} onSave={(x) => saveRaces(races.map((o) => (o.id === x.id ? x : o)))} onAll={finishAll} voice={voiceBtn} />
              <Marks buoys={buoys} s={cur} on onMark={mark} onBuoys={(next) => updateRecord("plan", plan.id, { buoys: next }, by)} />
            </>
          )}
          {withRaces && said && <p className="mt-3 px-1 text-[0.875rem] leading-snug text-fg2">{said}</p>}

          {!plan ? (
            <section>
              <ListHead title="Plan" />
              <RowList>
                <Row onClick={adding ? undefined : addPlan} title="Bugün antrenman planı yok" right={<span className="text-acc">Ekle</span>} chev={false} />
              </RowList>
            </section>
          ) : (
            tabs && <MediaTab orgId={orgId} race={place} day={date} live={{ ...live, starts: startsOf(races, date) }} ours={ours} onChange={change} file0={shot} onFileDone={() => setShot(null)} list={list} />
          )}
        </>
      )}
      {tabs && shown === "media" && (
        <MediaTab
          orgId={orgId}
          race={place}
          day={date}
          live={{ ...live, starts: startsOf(races, date) }}
          ours={ours}
          onChange={change}
          file0={shot}
          onFileDone={() => setShot(null)}
        />
      )}

      </div>

      {racer && (
        <Sheet open={sheet === "roll"} onClose={() => setSheet("")} title="Yoklama">
          {sheet === "roll" && <RollPanel inSheet day={date} onSaved={(d, ch) => setAtt((x) => ({ ...x, ...Object.fromEntries(Object.entries(ch).map(([k, v]) => [`${d}|${k}`, v])) }))} />}
        </Sheet>
      )}
      {plan && racer && (
        <Races key={raceKey.k} rid0={raceKey.rid} open={sheet === "races"} onClose={() => setSheet("")} races={races} present={present} others={others} onSave={saveRaces} buoys={buoys} />
      )}
      {plan && isTraining(plan) && (
        <Sheet open={sheet === "log"} onClose={() => setSheet("")} title="Günlük">
          {sheet === "log" && <TrainingLog rec={plan} by={by} startOpen onDone={() => setSheet("")} />}
        </Sheet>
      )}
      {tabs && (
        <>
          <TabDock tabs={DOCK} value={shown} onChange={setTab} extra={<AskButton examples={ASK_EX} />} />
        </>
      )}
    </main>
  );
}

// Asistan düğmesi (Seyhun 2026-10-23: antrenman sayfasında da kullanılsın): her yerdeki gibi bas-konuş (2026-10-25): basılı
// tut konuş, bırak gönder; kısa dokunuşta asistan açık ve boşta kalır, dışarı kaydırıp bırakınca iptal
const ASK_EX = ["2 dakika başlat", "Yarışı bitir, 1 Ali 2 Ayşe 3 Mehmet", "Bugünkü antrenman çok iyi geçti, start çalıştık"];
