"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { isActive, loadAthletes } from "@/features/athletes/data";
import { loadLive, addWind } from "@/features/athletes/raceLiveStore";
import { RollPanel } from "@/features/athletes/RollPanel";
import { TrainingLog } from "@/features/add/TrainingLog";
import { Bar, Countdown, useTimerRun } from "@/features/training/Countdown";
import { useTrainingFlow } from "@/features/training/useTrainingFlow";
import { Marks } from "@/features/raceMedia/TimerTab";
import { MediaTab } from "@/features/raceMedia/MediaTab";
import { WeatherTab, WindSheet } from "@/features/raceMedia/WeatherTab";
import { TabDock } from "@/features/raceMedia/RaceMedia";
import { useLiveSync } from "@/features/raceMedia/useLiveSync";
import { RaceList, Races } from "@/features/training/Races";
import { canLog, isTraining, pickPlan } from "@/lib/trainingLog";
import { cleanRaces, mmss, newRace, standings } from "@/lib/raceScore";
import { BUOYS, cleanBuoys, cleanLive, upSec, windOn } from "@/lib/raceLive";
import { todayStr } from "@/lib/utils/format";

// Antrenman sayfası (kulüp antrenmanı günü), yarış multimedya sayfasının düzeninde (Seyhun 2026-10-20 onayı,
// /mnt/project-files/antrenman-sayfasi/medya-ornek.png): altta Süre · Medya · Hava · Sonuçlar.
// Süre: multimedyanın sayacı (Countdown compact + Marks, useTrainingFlow; her start bir yarış açar) ve Yoklama, Yarışlar, Günlük satırları.
// Medya: multimedyanın MediaTab'ı; fotoğraf/video bu antrenmana bağlı (raceLive/ant-<planId>, Storage raceMedia), antrenman yarışlarına göre gruplu.
// Hava: multimedyanın WeatherTab'ı; yer planın `spot`u, yoksa Dikili. Sonuçlar: günün yarışları ve puan durumu (Races).
// Açılış: ?id=<antrenman planı> (plan penceresinden, gün penceresinden) ya da bugünün antrenmanı; ?tab=media|wx|res. Sesle: "antrenman sayfasını aç".
const stamp = () => Date.now();
const dayText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
const TABS = ["sure", "media", "wx", "res"];
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
  const [cam, setCam] = useState(null); // Süre'den açılan kamera: { kind }
  const [wind, setWind] = useState(false);
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
  const blank = athletes.filter((a) => !stateOf(a)).length;
  const races = plan?.races || [];
  const table = standings(races, present);
  const locked = plan && isLocked?.("plan", plan.id);
  // Sayaç yarış multimedyadakiyle aynı (sayaca dokununca başlar, start dizisi bipleri); planı olan günde her start bir yarış açar
  const saveRaces = (list) => updateRecord("plan", plan.id, { races: cleanRaces(list) }, by);
  const { flow, undo } = useTrainingFlow({ races, save: saveRaces });
  const tr = useTimerRun();
  const withRaces = plan && racer && !locked;
  const cur = withRaces && tr.running ? races.find((r) => r.id === tr.t.rid) : null;
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
  const planId = plan?.id;
  const saveSpot = useCallback((sp) => updateRecord("plan", planId, { spot: sp }, by), [planId]); // eslint-disable-line react-hooks/exhaustive-deps
  const ours = present.length ? athletes.filter((a) => stateOf(a) === "present") : athletes;
  const rf = { flow, ask: null, choose: () => {} };

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
  const row = "flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-bg";
  const leader = table.races.length ? table.rows[0]?.name.split(" ")[0] : "";
  const icon = "grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-sm active:translate-y-px";
  const tabs = !!liveId && !locked;
  const shown = tabs ? tab : "sure";
  const lastWind = windOn(live.wind, date).at(-1);

  return (
    <main className={`mx-auto max-w-[30rem] px-5 ${tabs ? "pb-[calc(env(safe-area-inset-bottom)+11rem)]" : "pb-[calc(var(--dome-h,var(--stage-h,6rem))+6rem)]"}`}>
      <PageHeader title={title} sub={sub} back="/training" />
      {tabs && tr.running && shown !== "sure" && (
        <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-[5] mt-2">
          <button type="button" onClick={() => setTab("sure")} className={`flex h-11 w-full items-center justify-between rounded-xl px-4 text-white active:translate-y-px ${!tr.up && tr.rem <= 10 ? "bg-rec" : "bg-deep"}`}>
            <span className="text-[0.875rem]">{tr.up ? "Startan beri" : "Start sayacı"}</span>
            <b className="text-[1.25rem] font-semibold tabular-nums">{mmss(tr.up ? upSec(tr.t.end, tr.now) : Math.max(0, tr.rem))}</b>
          </button>
        </div>
      )}

      {shown === "sure" && (
        <>
          <Countdown
            mode="start"
            presets={[60, 120, 300]}
            compact
            race={withRaces ? flow : null}
            title={withRaces ? (cur ? cur.name : flow.label) : ""}
            lead={
              tabs && (
                <>
                  <button type="button" onClick={() => (setCam({ kind: "photo" }), setTab("media"))} aria-label="Fotoğraf" className={`${icon} bg-acc`}>
                    <Icon name="camera" className="size-6" />
                  </button>
                  <button type="button" onClick={() => (setCam({ kind: "video" }), setTab("media"))} aria-label="Video" className={`${icon} bg-rec`}>
                    <Icon name="video" className="size-6" />
                  </button>
                </>
              )
            }
            tail={
              tabs && (
                <button type="button" onClick={() => setWind(true)} aria-label="Rüzgâr yaz" className={`${icon} bg-deep`}>
                  <Icon name="plus" className="size-6" />
                </button>
              )
            }
          />
          {withRaces && <Marks buoys={buoys} s={cur} on={!!cur && tr.up} onMark={mark} onBuoys={(next) => updateRecord("plan", plan.id, { buoys: next }, by)} />}

          {!plan ? (
            <button onClick={addPlan} disabled={adding} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-line bg-card px-4 py-3.5 text-left disabled:opacity-50">
              <span className="text-[0.9375rem] text-fg2">Bugün antrenman planı yok</span>
              <span className="text-[0.9375rem] font-semibold text-acc">Ekle</span>
            </button>
          ) : (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {racer && (
                <li>
                  <button onClick={() => setSheet("roll")} className={row}>
                    <span className="flex-1 text-[1rem] font-medium">Yoklama</span>
                    <span className={`text-[0.9375rem] ${present.length && !blank ? "font-semibold text-acc" : "text-mut"}`}>
                      {athletes.length ? [present.length ? `${present.length} geldi` : "", blank ? `${blank} boş` : ""].filter(Boolean).join(" · ") : "Aç"}
                    </span>
                  </button>
                </li>
              )}
              {racer && !locked && (
                <li>
                  <button onClick={() => openRace(null)} className={row}>
                    <span className="flex-1 text-[1rem] font-medium">Yarışlar</span>
                    <span className="text-[0.9375rem] text-mut">{races.length ? `${races.length} yarış${leader ? ` · ${leader} önde` : ""}` : "Yok"}</span>
                  </button>
                </li>
              )}
              {canLog(plan, today) && !locked && (
                <li>
                  <button onClick={() => setSheet("log")} className={row}>
                    <span className="flex-1 text-[1rem] font-medium">Günlük</span>
                    <span className={`text-[0.9375rem] ${plan.log ? "font-semibold text-acc" : "text-mut"}`}>{plan.log ? "Yazıldı" : "Yazılmadı"}</span>
                  </button>
                </li>
              )}
            </ul>
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
          rf={rf}
          cam0={cam?.kind || ""}
          onCamClose={() => cam && (setTab("sure"), setCam(null))}
        />
      )}
      {tabs && shown === "wx" && <WeatherTab orgId={orgId} race={place} day={date} live={live} onChange={change} saveSpot={saveSpot} />}
      {tabs && shown === "res" && (
        <>
          <div className="mt-3">
            {races.length ? <RaceList races={races} present={present} onOpen={openRace} /> : <p className="rounded-2xl border border-line bg-card px-4 py-6 text-center text-[0.875rem] text-mut">Bugün yarış yok.</p>}
          </div>
          <Bar>
            <button type="button" onClick={addRace} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px">
              Yeni yarış
            </button>
          </Bar>
        </>
      )}

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
          <WindSheet
            open={wind}
            onClose={() => setWind(false)}
            day={date}
            last={lastWind}
            onSave={(w) => {
              setWind(false);
              change((l) => ({ wind: [...l.wind, w] }), () => addWind(orgId, liveId, w));
            }}
          />
          <TabDock value={shown} onChange={setTab} />
        </>
      )}
    </main>
  );
}
