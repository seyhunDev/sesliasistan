"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { isActive, loadAthletes } from "@/features/athletes/data";
import { loadStream, saveStream } from "@/features/athletes/raceLiveStore";
import { RollPanel } from "@/features/athletes/RollPanel";
import { RaceWx } from "@/features/athletes/RaceWx";
import { TrainingLog } from "@/features/add/TrainingLog";
import { chooseDur, raceCancel, raceFinish, raceStart, readTimer, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { countPref, setCountPref, useTrainingFlow } from "@/features/training/useTrainingFlow";
import { AskButton } from "@/features/raceMedia/RaceMedia";
import { CourseTab } from "@/features/raceMedia/CourseTab";
import { LiveVideos } from "@/features/liveScreen/LiveVideos";
import { MediaViewer } from "@/features/raceMedia/MediaViewer";
import { Races } from "@/features/training/Races";
import { TrainWind } from "@/features/training/TrainWind";
import { useWide } from "@/hooks/useWide";
import { aliasesOf, useNameIndex } from "@/features/athletes/names";
import { useSpeech } from "@/hooks/useSpeech";
import { voiceResult, voiceText } from "@/lib/raceVoice";
import { canLog, isTraining, pickPlan } from "@/lib/trainingLog";
import { addFinish, cleanRaces, entrantsOf, mmss, places, removeFinish, setCode, standings } from "@/lib/raceScore";
import { BUOYS, cleanBuoys, upSec } from "@/lib/raceLive";
import { addSource, cleanStream, streamSources, ytEmbed, ytSrc } from "@/lib/raceRounds";
import { dayPlaces, monthName, monthRank } from "@/lib/trainRank";
import { todayStr } from "@/lib/utils/format";
import "@/features/liveScreen/sahne.css";
import "@/features/training/trainLive.css";

// Antrenman ekranı (Seyhun 2026-11-05 "antrenmanın multimedya sayfasını canlı yayın sayfası gibi yapalım"; örnek
// /mnt/project-files/antrenman-canli/ornek.png onaylandı): /canli'nin düzeni. Arkada görüntü (Kamera'da seçilen kaynak, Video'da oynatılan
// video, yoksa deniz), üstte süre kartı (geri, antrenman / yarış, büyük sayaç; sağda Yoklama ve Günlük), altta tek sıra Kamera · Parkur ·
// Rüzgâr · Sıralama · Video · Start ve asistan küresi. Dokunulan panel çubuktan yukarı açılır, aynı düğme kapatır.
// Start: 5·4·2·1 dk, kimler (yoklamada gelenler), parkur, "Yarış olarak say" (race.cnt → genel sıralama), Start ver. Geri sayımda −1/+1 dk, İptal;
// startan sonra Bitiren kim? kareleri (sırayla dokun, tekrar dokununca çıkar; DNF), Sesle söyle, Yarışı bitir.
// Sıralama: Bugün (günün puan durumu, hangi startın yarış sayıldığı) · Genel (ayın yarış sayılan startları, lib/trainRank.js).
// Video: canlı ekranın Video paneli (LiveVideos; yalnız bu telefonda, start start galeri, Düzenle, YouTube'a ekle → Kamera kaynakları).
// Parkur: yarış multimedyasının parkur kartı (CourseTab; ILCA · Trapez, ölçümler, Büyük göster). Rüzgâr: ortak hava tablosu (RaceWx).
// Kayıtlar: yarışlar planın `races` alanında, parkur/kaynaklar raceLive/ant-<planId>. Açılış: ?id=<plan> ya da bugünün antrenmanı; ?tab=<panel>.
const dayText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const PANELS = ["cam", "course", "wind", "rank", "vid", "start"];
const PRESETS = [300, 240, 120, 60];
const iso = (ms) => new Date(ms).toISOString();
const first = (n) => String(n || "").split(" ")[0];
const stamp = () => Date.now();

// Antrenman yarışları → canlı ekranın start satırları (videonun yarışı bunlara göre bulunur)
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
  const wide = useWide(); // iPad ve Mac (≥48rem): üç sütun
  const today = todayStr();
  const plan = (id && plans.find((p) => p.id === id)) || (!id ? pickPlan(plans, today) : null);
  const date = plan?.date || today;
  const by = { name: profile?.name ?? "Kullanıcı" };
  const [athletes, setAthletes] = useState([]);
  const [att, setAtt] = useState({}); // bu sayfada değişen yoklama: { "gün|id": durum | null }
  const [sheet, setSheet] = useState(""); // roll | races | log
  const [open, setOpen] = useState(() => (q.get("tab") === "media" ? "vid" : PANELS.includes(q.get("tab")) ? q.get("tab") : "")); // eski ?tab=media (Medya sayfası) Video
  const [adding, setAdding] = useState(false);
  const [cnt, setCnt] = useState(countPref);
  const [dur, setDur] = useState(0);
  const orgId = profile?.orgId || "";
  const liveId = plan && racer && orgId ? `ant-${plan.id}` : "";
  const [stream, setStream] = useState(null);
  const [cam, setCam] = useState(""); // arkadaki kaynak (id)
  const [vid, setVid] = useState({ id: "", url: "" }); // arkada oynatılan kendi videon
  const [link, setLink] = useState("");
  const [ptab, setPtab] = useState(() => (q.get("tab") === "rank" || q.get("tab") === "wind" ? q.get("tab") : "ath")); // telefonda alt bölüm: ath | rank | wind
  const [menu, setMenu] = useState(false); // telefonda ⋯

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
    loadStream(orgId, liveId).then(
      (s) => on && setStream(s),
      () => {},
    );
    return () => {
      on = false;
    };
  }, [orgId, liveId]);
  useEffect(() => () => vid.url && URL.revokeObjectURL(vid.url), [vid.url]);

  const stateOf = (a) => (`${date}|${a.id}` in att ? att[`${date}|${a.id}`] : a.att?.[date.slice(0, 4)]?.[date.slice(5)] || null);
  const byName = (a, b) => a.name.localeCompare(b.name, "tr");
  const present = athletes.filter((a) => stateOf(a) === "present").map((a) => ({ id: a.id, name: a.studentName })).sort(byName);
  const others = athletes.filter((a) => stateOf(a) !== "present").map((a) => ({ id: a.id, name: a.studentName })).sort(byName);
  const races = plan?.races || [];
  const locked = plan && isLocked?.("plan", plan.id);
  const saveRaces = (list) => updateRecord("plan", plan.id, { races: cleanRaces(list) }, by);
  const { flow, undo } = useTrainingFlow({ races, save: saveRaces });
  const tr = useTimerRun();
  const withRaces = !!plan && racer && !locked;
  const cur = withRaces && (tr.running || tr.t.left != null) ? races.find((r) => r.id === tr.t.rid) : null;
  const title = plan && plan.title !== "Antrenman" ? plan.title : "Antrenman";
  const people = present.length ? present : athletes.length ? athletes.map((a) => ({ id: a.id, name: a.studentName })).sort(byName) : entrantsOf([], races);
  const table = standings(races, present);
  const month = date.slice(0, 7);
  const gen = useMemo(() => monthRank(plans, month), [plans, month]); // eslint-disable-line react-hooks/preserve-manual-memoization
  // Rüzgâr ve Parkur'a verilen yer (aynı nesne kalsın: değişince hava yeniden alınır)
  const spotKey = plan?.spot ? `${plan.spot.lat},${plan.spot.lon},${plan.spot.name}` : "";
  const wxRace = useMemo(() => ({ id: liveId || "ant", name: title, startDate: date, endDate: date, district: "Dikili", city: "İzmir", spot: spotKey ? plan.spot : null }), [liveId, title, date, spotKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Sayaç (telefondaki tek sayaç): süre seçimi, start, kaydırma, iptal, bitir
  const t = tr.t;
  const counting = t.end != null && !tr.up;
  const paused = t.end == null && t.left != null;
  const sec = dur || t.dur || 300;
  const start = () => {
    chooseDur(sec);
    raceStart(withRaces ? flow : null, "start", title);
    setOpen("");
  };
  const shift = (d) => {
    const x = readTimer();
    if (x.end == null) return;
    const end = x.end + d * 1000;
    if (end <= Date.now()) return;
    writeTimer({ ...x, end });
    if (withRaces && x.rid) flow.onShift(end, x.rid);
  };
  const finishAll = (x) => {
    const prev = readTimer();
    const fin = upSec(x.startAt ?? prev.end, stamp());
    saveRaces(races.map((o) => (o.id === x.id ? { ...x, fin } : o)));
    if (prev.rid === x.id) raceFinish(null);
    undo(`${x.name} bitti · ${mmss(fin)}`, races, prev);
  };
  const saveRace = (x) => saveRaces(races.map((o) => (o.id === x.id ? x : o)));
  const [dnf, setDnf] = useState(false); // DNF: sıradaki dokunuş DNF yazar

  // Görüntü: kendi videon > seçilen kaynak > deniz
  const sources = streamSources(stream).filter((x) => x.url);
  const src = sources.find((x) => x.id === cam);
  const addLink = async () => {
    const u = link.trim();
    if (!ytEmbed(u)) return toast("YouTube linki tanınmadı");
    const base = streamSources(stream).filter((x) => x.url);
    const l = addSource(base, "camera");
    if (l.length === base.length) return toast("Kaynak listesi dolu (en çok 8)");
    const next = { ...cleanStream(stream), sources: l.map((y, i, a) => (i === a.length - 1 ? { ...y, url: u } : y)) };
    try {
      await saveStream(orgId, liveId, next);
      setStream(cleanStream(next));
      setLink("");
      setCam(l.at(-1).id);
    } catch {
      toast("Kaydedilemedi. İnterneti kontrol et.");
    }
  };

  const tap = (k) => setOpen((o) => (o === k ? "" : k));
  const big = counting || paused ? `−${mmss(Math.max(0, counting ? tr.rem : t.left))}` : tr.up && t.end != null ? `+${mmss(upSec(t.end, tr.now))}` : !plan ? "Plan yok" : withRaces ? `Yarış ${races.length + 1}` : "Start";
  const bigCls = counting ? (tr.rem <= 10 ? "red" : "cd") : paused ? "cd" : "";
  const fins = cur ? cur.finishes.length : 0;

  const btns = [
    ["cam", "Kamera"],
    ["course", "Parkur"],
    ["wind", "Rüzgâr"],
    ["rank", "Sıralama"],
    ["vid", "Video"],
    ["start", "Start"],
  ].filter(([k]) => (k === "cam" || k === "course" || k === "vid" ? !!liveId : k === "rank" ? withRaces : true));

  // Bitiren kim? kareleri ve altındaki düğmeler (telefonda Start panelinde; iPad'de kareler ortada, düğmeler solda)
  const finishing = !!(cur && tr.up && t.end != null);
  const finishParts = (full = false) => {
    const pl = places(cur);
    const fin = Object.fromEntries(cur.finishes.map((f) => [f.id, f]));
    const all = [...people, ...cur.finishes.filter((f) => !people.some((p) => p.id === f.id))];
    const hit = (p) => {
      let next = fin[p.id] ? removeFinish(cur, p.id) : addFinish(cur, p);
      if (!fin[p.id] && dnf) (next = setCode(next, p.id, "DNF")), setDnf(false);
      if (!fin[p.id] && all.every((x) => next.finishes.some((f) => f.id === x.id))) return finishAll(next);
      saveRace(next);
    };
    return {
      tiles: (
          <div className="tl-tiles">
            {all.map((p) => {
              const f = fin[p.id];
              return (
                <button key={p.id} type="button" className={f ? "on" : ""} aria-pressed={!!f} onClick={() => hit(p)}>
                  {f ? <i>{f.code || pl[p.id]}</i> : null}
                  <span>{full ? p.name : first(p.name)}</span>
                  {f?.t != null ? <small>{mmss(f.t)}</small> : null}
                </button>
              );
            })}
          </div>
      ),
      foot: (
        <>
          <div className="tl-foot">
            <button type="button" data-press className={`btn ${sp.status === "listening" ? "btn-danger" : "btn-secondary"}`} disabled={sp.status === "transcribing"} onClick={() => (sp.status === "listening" ? sp.stop() : sp.status === "idle" && (setSaid(""), sp.start({ autoStop: 0 })))}>
              {sp.status === "listening" ? "Bitince dokun" : sp.status === "transcribing" ? "Yazılıyor" : "Sesle söyle"}
            </button>
            <button type="button" data-press className={`btn ${dnf ? "btn-primary" : "btn-secondary"}`} aria-pressed={dnf} onClick={() => setDnf(!dnf)}>
              DNF
            </button>
            <button type="button" data-press className="btn btn-primary" onClick={() => finishAll(cur)}>
              Yarışı bitir
            </button>
          </div>
          {said ? <p className="tl-msg">{said}</p> : null}
        </>
      ),
    };
  };

  const startPanel = () => {
    if (!plan)
      return (
        <>
          <div className="tl-hd">
            <h3>Start</h3>
          </div>
          <p className="tl-no">Bugün antrenman planı yok</p>
          <button type="button" data-press className="btn btn-primary tl-go" disabled={adding || !racer} onClick={addPlan}>
            Antrenman ekle
          </button>
        </>
      );
    if (finishing) {
      const f = finishParts();
      return (
        <>
          <div className="tl-hd">
            <h3>Bitiren kim?</h3>
            <small>{dnf ? "DNF olanı seç" : "Sırayla dokun"}</small>
          </div>
          {f.tiles}
          {f.foot}
        </>
      );
    }
    if (counting || paused)
      return (
        <>
          <div className="tl-hd">
            <h3>Start</h3>
            <small>{cur ? cur.name : title}</small>
          </div>
          <div className="tl-foot">
            <button type="button" data-press className="btn btn-secondary" disabled={!counting} onClick={() => shift(-60)}>
              −1 dk
            </button>
            <button type="button" data-press className="btn btn-secondary" disabled={!counting} onClick={() => shift(60)}>
              +1 dk
            </button>
            <button type="button" data-press className="btn btn-danger" onClick={() => raceCancel(withRaces ? flow : null)}>
              İptal
            </button>
          </div>
        </>
      );
    return (
      <>
        <div className="tl-hd">
          <h3>Start</h3>
          <small>{withRaces ? `Bugün · Yarış ${races.length + 1}` : title}</small>
        </div>
        <div className="tl-lb">Süre</div>
        <div className="tl-chips">
          {PRESETS.map((s) => (
            <button key={s} type="button" className={sec === s ? "on" : ""} aria-pressed={sec === s} onClick={() => setDur(s)}>
              {s / 60}
              <small>dk</small>
            </button>
          ))}
        </div>
        {withRaces && (
          <>
            <div className="tl-lb">Start</div>
            <div className="tl-box">
              <button type="button" className="tl-row" onClick={() => setSheet("roll")}>
                <b>KİMLER</b>
                <span>
                  {people.length} sporcu
                  <small>{present.length ? "Yoklamada gelenler" : "Yoklama alınmadı, herkes"}</small>
                </span>
                <i>Yoklama</i>
              </button>
              <button type="button" className="tl-row" onClick={() => setOpen("course")}>
                <b>PARKUR</b>
                <span>Parkur kartı</span>
                <i>Aç</i>
              </button>
              <button type="button" className="tl-row" aria-pressed={cnt} onClick={() => (setCnt(!cnt), setCountPref(!cnt))}>
                <b>YARIŞ</b>
                <span>
                  Yarış olarak say
                  <small>Genel sıralamaya girer</small>
                </span>
                <em className={`tl-sw${cnt ? " on" : ""}`} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
        <button type="button" data-press className="btn btn-primary tl-go" onClick={start}>
          Start ver<small>{sec / 60} dk</small>
        </button>
      </>
    );
  };

  const [rk, setRk] = useState("day");
  const rankPanel = () => {
    const dayRows = table.rows;
    const rows = rk === "day" ? dayRows : gen.rows;
    return (
      <>
        <div className="tl-tabs">
          <button type="button" className={rk === "day" ? "on" : ""} onClick={() => setRk("day")}>
            Bugün
          </button>
          <button type="button" className={rk === "gen" ? "on" : ""} onClick={() => setRk("gen")}>
            Genel
          </button>
          <button type="button" className="r" onClick={() => setSheet("races")}>
            Düzelt
          </button>
        </div>
        {rk === "day" ? (
          races.length ? (
            <div className="tl-cnt" role="group" aria-label="Yarış sayılan startlar">
              {races.map((r) => (
                <button key={r.id} type="button" className={r.cnt ? "on" : ""} aria-pressed={!!r.cnt} onClick={() => saveRace({ ...r, cnt: !r.cnt })}>
                  {r.name}
                </button>
              ))}
            </div>
          ) : null
        ) : (
          <p className="tl-sub">
            {monthName(month)} · {gen.races.length} yarış · düşük puan önde{gen.discard ? " · en kötü sonuç atılır" : ""}
          </p>
        )}
        {rows.length ? (
          <table className="tl-tb">
            <thead>
              <tr>
                <th>#</th>
                <th>SPORCU</th>
                {rk === "gen" ? <th className="c">YARIŞ</th> : null}
                <th>PUAN</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="n">{r.rank}</td>
                  <td>
                    {r.name}
                    <small>{rk === "day" ? r.cells.map((c) => c.code || c.place).join(" · ") : dayPlaces(races, r.id) ? `Bugün ${dayPlaces(races, r.id)}` : ""}</small>
                  </td>
                  {rk === "gen" ? <td className="c">{r.n}</td> : null}
                  <td>{r.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="tl-no">{rk === "day" ? "Bugün sonuç yok" : "Bu ay yarış sayılan start yok"}</p>
        )}
      </>
    );
  };

  const camPanel = () => (
    <>
      <div className="tl-hd">
        <h3>Kamera</h3>
      </div>
      <div className="tl-src">
        <button type="button" className={!cam ? "on" : ""} aria-pressed={!cam} onClick={() => setCam("")}>
          Yok
        </button>
        {sources.map((x) => (
          <button key={x.id} type="button" className={cam === x.id ? "on" : ""} aria-pressed={cam === x.id} onClick={() => (setCam(cam === x.id ? "" : x.id), setVid({ id: "", url: "" }))}>
            {x.name}
          </button>
        ))}
      </div>
      <div className="tl-ln">
        <input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="YouTube linki" />
        <button type="button" data-press className="btn btn-primary" disabled={!link.trim()} onClick={addLink}>
          Ekle
        </button>
      </div>
    </>
  );

  const body =
    open === "start" ? (
      startPanel()
    ) : open === "rank" ? (
      rankPanel()
    ) : open === "cam" ? (
      camPanel()
    ) : open === "wind" ? (
      <>
        <div className="tl-hd">
          <h3>Rüzgâr</h3>
        </div>
        <RaceWx r={wxRace} />
      </>
    ) : open === "course" ? (
      <>
        <div className="tl-hd">
          <h3>Parkur</h3>
        </div>
        <CourseTab orgId={orgId} race={wxRace} day={date} wx={false} types big />
      </>
    ) : open === "vid" ? (
      <LiveVideos
        orgId={orgId}
        raceId={liveId}
        race={{ name: title }}
        starts={startsOf(races, date)}
        stream={stream}
        playing={vid.id}
        onPlay={(vId, blob, x) => setVid((v) => (v.url && URL.revokeObjectURL(v.url), vId && blob ? { id: vId, url: URL.createObjectURL(blob), list: x?.list || [], open: x?.open } : { id: "", url: "" }))}
      />
    ) : null;

  const sheets = (
    <>
      {racer && (
        <Sheet open={sheet === "roll"} onClose={() => setSheet("")} title="Yoklama">
          {sheet === "roll" && <RollPanel inSheet day={date} onSaved={(d, ch) => setAtt((x) => ({ ...x, ...Object.fromEntries(Object.entries(ch).map(([k, v]) => [`${d}|${k}`, v])) }))} />}
        </Sheet>
      )}
      {plan && racer && <Races open={sheet === "races"} onClose={() => setSheet("")} races={races} present={present} others={others} onSave={saveRaces} buoys={plan.buoys ? cleanBuoys(plan.buoys) : BUOYS} />}
      {plan && isTraining(plan) && (
        <Sheet open={sheet === "log"} onClose={() => setSheet("")} title="Günlük">
          {sheet === "log" && <TrainingLog rec={plan} by={by} startOpen onDone={() => setSheet("")} />}
        </Sheet>
      )}
    </>
  );
  // Seçilen video tam ekran (Seyhun 2026-11-12 "videoları tam ekran izleyebilmeliyim"): ortak MediaViewer; X, oynat/durdur, süre çubuğu, ses.
  // Sağa sola kaydırınca Video listesindeki önceki/sonraki video açılır (dosyası o an okunur, LiveVideos open)
  const vids = vid.url ? (vid.list?.length ? vid.list : [{ id: vid.id }]) : [];
  const pickVid = async (id) => {
    const x = vid.list?.find((y) => y.id === id);
    const blob = x && vid.open ? await vid.open(id).catch(() => null) : null;
    if (blob) setVid((v) => (v.url && URL.revokeObjectURL(v.url), { ...v, id, url: URL.createObjectURL(blob) }));
  };
  const full = (
    <MediaViewer
      items={vids.map((x) => ({ id: x.id, kind: "video", url: x.id === vid.id ? vid.url : "", local: x.id === vid.id ? vid.url : "", thumb: x.th || "", at: x.at || new Date().toISOString(), dur: x.dur }))}
      id={vid.url ? vid.id : ""}
      onPick={pickVid}
      onClose={() => setVid({ id: "", url: "" })}
      label={(m) => vids.find((x) => x.id === m.id)?.name || title}
    />
  );

  // iPad (Seyhun 2026-11-11 "A · Üç sütun", örnek antrenman-ipad/ornekler.html): her şey aynı anda görünür. Solda Start (büyük süre, süre seçimi,
  // Start ver; startan sonra Sesle söyle · DNF · Yarışı bitir) ve antrenman saatinin rüzgârı, ortada sporcular (startan sonra Bitiren kim? kareleri),
  // sağda Sıralama (Bugün · Genel). Parkur, Video, Kamera üstte düğme, ortada pencere açar; Rüzgâr eğrisine dokununca ortak hava tablosu.
  // Sporcu kareleri (iPad ve telefon ortak): startan sonra Bitiren kim?, önce gelenler puanıyla, gelmeyenler soluk; adlar tam
  const absent = present.length ? others : [];
  const athTiles = () => {
    if (finishing) return finishParts(true).tiles;
    const pts = Object.fromEntries(table.rows.map((r) => [r.id, r.net]));
    return (
      <div className="tw-tiles">
        {people.map((p) => (
          <div key={p.id} className="tw-tile">
            <b>{p.name}</b>
            {pts[p.id] != null ? <small className="num">{pts[p.id]} p</small> : null}
          </div>
        ))}
        {absent.map((p) => (
          <div key={p.id} className="tw-tile off">
            <b>{p.name}</b>
            <small>gelmedi</small>
          </div>
        ))}
      </div>
    );
  };

  if (wide) {
    const f = finishing ? finishParts(true) : null;
    const sub = !plan ? "" : finishing ? `${cur.name} · ${fins} / ${people.length} bitti` : counting || paused ? `${cur ? cur.name : title} · ${people.length} sporcu` : `${sec / 60} dk${withRaces ? ` · ${people.length} sporcu` : ""}`;
    const pop = ["cam", "course", "vid", "wind"].includes(open) ? body : null;
    const media = open === "cam" && src;
    return (
      <main className="tw navy" aria-label={title}>
        <header className="tw-hd">
          <BackButton href="/training" />
          <h1>
            <b>{title}</b>
            <small>
              {dayText(date)}
              {plan?.time ? ` · ${plan.time}${plan.endTime ? `–${plan.endTime}` : ""}` : ""}
            </small>
          </h1>
          {btns
            .filter(([k]) => k === "course" || k === "vid" || k === "cam")
            .map(([k, l]) => (
              <button key={k} type="button" data-press className="btn btn-secondary tw-hb" aria-pressed={open === k} onClick={() => tap(k)}>
                {l}
              </button>
            ))}
          {racer && plan ? (
            <button type="button" data-press className="btn btn-secondary tw-hb" onClick={() => setSheet("roll")}>
              Yoklama <b className="num">{present.length || "Al"}</b>
            </button>
          ) : null}
          {plan && canLog(plan, today) && !locked ? (
            <button type="button" data-press className="btn btn-primary tw-hb" onClick={() => setSheet("log")}>
              {plan.log ? "Günlük" : "Günlük yaz"}
            </button>
          ) : null}
        </header>

        <div className={`tw-grid${withRaces ? "" : " solo"}`}>
          <div className="tw-left">
            <section className="tw-pn tw-start" aria-label="Start">
              <span className="tw-pt">
                {cur?.cnt ? "Yarış" : "Start"}
                <span className="flex-1" />
                {withRaces && races.length ? <em>Bugün {races.length} start</em> : null}
              </span>
              <div className={`tw-big num ${bigCls}`}>{big}</div>
              {sub ? <p className="tw-sub">{sub}</p> : null}
              <div className="tw-ctl">{finishing ? f.foot : startPanel()}</div>
            </section>
            {plan ? <TrainWind plan={plan} date={date} onOpen={() => tap("wind")} /> : null}
          </div>
          {withRaces && (
            <section className="tw-pn tw-ath" aria-label={finishing ? "Bitiren kim?" : "Sporcular"}>
              <span className="tw-pt">
                {finishing ? "Bitiren kim?" : "Sporcular"}
                <span className="flex-1" />
                <em>{finishing ? (dnf ? "DNF olanı seç" : "sırayla dokun") : present.length ? `${present.length} geldi${absent.length ? ` · ${absent.length} gelmedi` : ""}` : "Yoklama alınmadı"}</em>
              </span>
              {athTiles()}
            </section>
          )}
          {withRaces && (
            <section className="tw-pn tw-rank" aria-label="Sıralama">
              <span className="tw-pt">Sıralama</span>
              {rankPanel()}
            </section>
          )}
        </div>

        <span className="tw-ask">
          <AskButton examples={ASK_EX} />
        </span>

        {pop ? (
          <div className="tw-pop" onClick={() => setOpen("")}>
            <section className="tw-sheet" aria-label={btns.find(([k]) => k === open)?.[1] || "Rüzgâr"} onClick={(e) => e.stopPropagation()}>
              <button type="button" data-press className="btn btn-round btn-sm tw-x" aria-label="Kapat" onClick={() => setOpen("")}>
                <Icon name="x" className="size-4" />
              </button>
              {media ? (
                <div className="tw-media">
                  <iframe title="Kamera" src={ytSrc(src.url)} allow="autoplay; encrypted-media; picture-in-picture" />
                </div>
              ) : null}
              <div className="tl-in ck navy">{pop}</div>
            </section>
          </div>
        ) : null}
        {sheets}
        {full}
      </main>
    );
  }

  // Telefon (Seyhun 2026-11-12 "A · Alt düğme", örnek antrenman-ipad/telefon-ornekler.html): iPad'in dili. Üstte geri, ad, ⋯ (Parkur, Video,
  // Kamera); sabit boylu Start kutusu (sağ üstte Yoklama · Günlük, büyük süre, süre seçimi + Yarış olarak say; geri sayımda −1/+1, startan
  // sonra Sesle söyle · DNF); altında Sporcular (startan sonra Bitiren kim?) · Sıralama · Rüzgâr sekmeleri; en altta sabit şeritte ana düğme
  // (Start ver → İptal → Yarışı bitir, hep aynı yerde) ve asistan küresi. Kutuların boyu durumdan duruma değişmez.
  const ptabs = [withRaces && ["ath", finishing ? "Bitiren kim" : "Sporcular"], withRaces && ["rank", "Sıralama"], ["wind", "Rüzgâr"]].filter(Boolean);
  const ptNow = finishing && ptab !== "rank" && ptab !== "wind" ? "ath" : ptabs.some(([k]) => k === ptab) ? ptab : ptabs[0][0];
  const pop = ["cam", "course", "vid"].includes(open) ? body : null;
  const media = open === "cam" && src;
  const more = btns.filter(([k]) => k === "course" || k === "vid" || k === "cam");
  const mainBtn = !plan ? (
    <button type="button" data-press className="btn btn-primary tp-go" disabled={adding || !racer} onClick={addPlan}>
      Antrenman ekle
    </button>
  ) : finishing ? (
    <button type="button" data-press className="btn btn-primary tp-go" onClick={() => finishAll(cur)}>
      Yarışı bitir
    </button>
  ) : counting || paused ? (
    <button type="button" data-press className="btn btn-danger tp-go" onClick={() => raceCancel(withRaces ? flow : null)}>
      İptal
    </button>
  ) : (
    <button type="button" data-press className="btn btn-primary tp-go" onClick={start}>
      Start ver <small className="num">{sec / 60} dk</small>
    </button>
  );
  return (
    <main className="tw tp navy" aria-label={title}>
      <header className="tw-hd">
        <BackButton href="/training" />
        <h1>
          <b>{title}</b>
          <small>{dayText(date)}</small>
        </h1>
        {more.length ? (
          <span className="relative">
            <button type="button" data-press className="btn btn-round" aria-label="Diğer" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              ⋯
            </button>
            {menu ? (
              <span className="tp-menu" role="menu">
                {more.map(([k, l]) => (
                  <button key={k} type="button" role="menuitem" data-press="row" onClick={() => (setMenu(false), tap(k))}>
                    {l}
                  </button>
                ))}
              </span>
            ) : null}
          </span>
        ) : null}
      </header>

      <section className="tw-pn tp-start" aria-label="Start">
        <span className="tw-pt">
          {cur?.cnt ? "Yarış" : "Start"}
          <span className="flex-1" />
          {racer && plan ? (
            <button type="button" data-press className="btn btn-secondary btn-sm tw-hb tp-mini" onClick={() => setSheet("roll")}>
              Yoklama <b className="num">{present.length || "Al"}</b>
            </button>
          ) : null}
          {plan && canLog(plan, today) && !locked ? (
            <button type="button" data-press className="btn btn-primary btn-sm tw-hb tp-mini" onClick={() => setSheet("log")}>
              {plan.log ? "Günlük" : "Günlük yaz"}
            </button>
          ) : null}
        </span>
        <div className={`tw-big num ${bigCls}`}>{big}</div>
        <p className="tw-sub">{!plan ? "Bugün antrenman planı yok" : finishing ? `${cur.name} · ${fins} / ${people.length} bitti` : counting || paused ? `${cur ? cur.name : title} · ${people.length} sporcu` : `${sec / 60} dk${withRaces ? ` · ${people.length} sporcu` : ""}`}</p>
        {!plan ? null : finishing ? (
          <div className="tp-two">
            <button type="button" data-press className={`btn ${sp.status === "listening" ? "btn-danger" : "btn-secondary"}`} disabled={sp.status === "transcribing"} onClick={() => (sp.status === "listening" ? sp.stop() : sp.status === "idle" && (setSaid(""), sp.start({ autoStop: 0 })))}>
              {sp.status === "listening" ? "Bitince dokun" : sp.status === "transcribing" ? "Yazılıyor" : "Sesle söyle"}
            </button>
            <button type="button" data-press className={`btn ${dnf ? "btn-primary" : "btn-secondary"}`} aria-pressed={dnf} onClick={() => setDnf(!dnf)}>
              DNF
            </button>
          </div>
        ) : counting || paused ? (
          <div className="tp-two">
            <button type="button" data-press className="btn btn-secondary" disabled={!counting} onClick={() => shift(-60)}>
              −1 dk
            </button>
            <button type="button" data-press className="btn btn-secondary" disabled={!counting} onClick={() => shift(60)}>
              +1 dk
            </button>
          </div>
        ) : (
          <>
            <div className="tl-chips tp-chips">
              {PRESETS.map((x) => (
                <button key={x} type="button" className={sec === x ? "on" : ""} aria-pressed={sec === x} onClick={() => setDur(x)}>
                  {x / 60}
                  <small>dk</small>
                </button>
              ))}
            </div>
            {withRaces ? (
              <button type="button" className="tp-cnt" aria-pressed={cnt} onClick={() => (setCnt(!cnt), setCountPref(!cnt))}>
                <span>
                  Yarış olarak say
                  <small>Genel sıralamaya girer</small>
                </span>
                <em className={`tl-sw${cnt ? " on" : ""}`} aria-hidden="true" />
              </button>
            ) : null}
          </>
        )}
        {said && finishing ? <p className="tl-msg">{said}</p> : null}
      </section>

      {ptabs.length > 1 ? (
        <nav className="tp-seg" aria-label="Bölümler">
          {ptabs.map(([k, l]) => (
            <button key={k} type="button" className={ptNow === k ? "on" : ""} aria-pressed={ptNow === k} onClick={() => setPtab(k)}>
              {l}
            </button>
          ))}
        </nav>
      ) : null}

      <div className={`tp-body${ptNow === "rank" ? " tp-rank" : ""}`}>
        {ptNow === "ath" ? athTiles() : ptNow === "rank" ? rankPanel() : <div className="ck navy">
          <RaceWx r={wxRace} />
        </div>}
      </div>

      <nav className="tp-dock" aria-label="Start">
        {mainBtn}
        <span className="tp-ask">
          <AskButton examples={ASK_EX} />
        </span>
      </nav>

      {pop ? (
        <div className="tw-pop" onClick={() => setOpen("")}>
          <section className="tw-sheet" aria-label={btns.find(([k]) => k === open)?.[1]} onClick={(e) => e.stopPropagation()}>
            <button type="button" data-press className="btn btn-round btn-sm tw-x" aria-label="Kapat" onClick={() => setOpen("")}>
              <Icon name="x" className="size-4" />
            </button>
            {media ? (
              <div className="tw-media">
                <iframe title="Kamera" src={ytSrc(src.url)} allow="autoplay; encrypted-media; picture-in-picture" />
              </div>
            ) : null}
            <div className="tl-in ck navy">{pop}</div>
          </section>
        </div>
      ) : null}
      {sheets}
      {full}
    </main>
  );
}

// Asistan küresi (her yerdeki gibi bas-konuş): antrenmanı sesle başlat, bitir, sonuç
const ASK_EX = ["2 dakika başlat", "Yarışı bitir, 1 Ali 2 Ayşe 3 Mehmet", "Bugünkü antrenman çok iyi geçti, start çalıştık"];
