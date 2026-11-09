"use client";

// /canli Start penceresi (Seyhun 2026-11-05 "canlı yayın sayfasından da start verebilmeliyim; sade, minimal, yarım sayfa"; örnek
// /mnt/project-files/canli-tv/canli-start-ornek.png onaylandı): ana hesapla girilince alt panelde Start. Grup seç, bayrak ve parkur seçili
// kalır ("Değiştir" ile açılır), Start ver. Start verilince pencere sıradaki grubu seçer. Süren geri sayımda Ertele (+1 dk) ve İptal.
// Kurallar ve yazmalar Yayın › Süre ile aynı (broadcast/startFlow, raceMedia/useRaceFlow, training/Countdown); sayacın sahibi Yayın sayfası.
// Bu dosya yalnız telefonda daha önce uygulamaya girilmişse yüklenir (LiveScreen dinamik import); izleyiciye Firebase yüklenmez.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/clientApp";
import { loadRace } from "@/features/athletes/races";
import { raceDays } from "@/features/athletes/raceWeather";
import { addCourseMany, addCourseObs, loadCourse, saveCourse, loadRoundsOf, saveCards, savePlanKeys, saveRounds, saveTimer, watchRounds } from "@/features/athletes/raceLiveStore";
import { loadEntryDoc, readEntryFile, saveEntries, saveGroups } from "@/features/rounds/roundsStore";
import { mergeEntries } from "@/lib/roundSay";
import { colorOf } from "@/lib/siteDocs";
import { useLiveSync } from "@/features/raceMedia/useLiveSync";
import { VoidSheet, useRaceFlow } from "@/features/raceMedia/useRaceFlow";
import { audio, raceCancel, raceFinish, raceStart, readTimer, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { finishSteps, orderWithout, startBlock, startedRow, yayinPath, zeroStarts } from "@/features/broadcast/startFlow";
import { cleanLive, cleanPlan, finishRace, moveWin, nextRaceNo, openWin, raceName, rollPlan, winLeft } from "@/lib/raceLive";
import { CARD_TYPES, cardFor, cardKey, cleanCourse, cleanObs, withRaceCards } from "@/lib/raceCourse";
import { AddSheet } from "@/features/raceMedia/CourseTab";
import { CourseTalk } from "@/features/broadcast/CourseTalk";
import { writeCourseVoice } from "@/features/broadcast/courseWrite";
import { PREP_PICK, prepName } from "@/lib/raceRounds";
import { flagSvg } from "@/lib/raceSignals";
import { GROUP_PICK, dayGroups, groupColor, groupMap, groupOf, groupsOn } from "@/lib/roundScore";
import { todayStr } from "@/lib/utils/format";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LiveVideos } from "./LiveVideos";
import { LiveMasa } from "./LiveMasa";
import { showOnScreen } from "./liveActions";

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function LiveStart(p) {
  return (
    <ToastProvider>
      <Start {...p} />
    </ToastProvider>
  );
}
// vidHost: Video panelindeki yer (LiveScreen ScView; yalnız uygulama içinde); videolar oraya çizilir
// masaHost: Yayın masasının yeri (Yayın modunda "Yayında"ya basınca); give: Benim'de seçileni yayına ver isteği { s, n }
function Start({ raceId, open, onClose, onReady, wind = false, onWindClose, vidHost = null, playing = "", onPlay, stream = null, auto = false, masaHost = null, addCat = null, now = null, pos = [], give = null, onGiven, list = null, onListed, cards = null, talkN = 0 }) {
  const [orgId, setOrgId] = useState("");
  const [race, setRace] = useState(null);
  const [live, setLive] = useState(() => cleanLive({}));
  const [rounds, setRounds] = useState({});
  const [course, setCourse] = useState(() => cleanCourse({}));
  const [pickI, setPickI] = useState(0);
  const [runId, setRunId] = useState("");
  const [big, setBig] = useState(false); // start sürerken pencere küçük şerit; Büyüt ile tam (Seyhun 2026-11-06 "ekranı çok kaplıyor")
  const [edit, setEdit] = useState(""); // "prep" | "card": açık seçim
  const [msg, setMsg] = useState("");
  const pick = useRef(0);
  const today = todayStr();
  const own = yayinPath(raceId);

  // Ana hesap mı: oturum açık ve bu yarış onun işletmesinde (ana hesapta işletme = kullanıcı; çalışan için Start yok)
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (!u) return setOrgId("");
        loadRace(u.uid, raceId).then(
          (r) => {
            if (!r) return;
            setRace(r);
            setOrgId(u.uid);
          },
          () => {},
        );
      }),
    [raceId],
  );
  useEffect(() => onReady?.(!!orgId), [orgId, onReady]);
  // Benim › Yayına ver: seçilen kaynak / konum izleyicilere de geçer (Yayın › Ekrana al ile aynı kayıt)
  const gaveN = useRef(0);
  useEffect(() => {
    if (!orgId || !give?.n || gaveN.current === give.n) return;
    gaveN.current = give.n;
    showOnScreen(orgId, raceId, give.s).then(
      () => onGiven?.(true),
      () => (onGiven?.(false), setMsg("Kaydedilemedi. İnterneti kontrol et.")),
    );
  }, [orgId, raceId, give, onGiven]);
  // Parkur ve rüzgâr › Parkur seçimi (LiveScreen ScCrsPick): kartlar yarış boyu kaydedilir (Başlat o kartı yarışa yazar)
  const cardsN = useRef(0);
  useEffect(() => {
    if (!orgId || !cards?.n || cardsN.current === cards.n) return;
    cardsN.current = cards.n;
    setCourse((c) => cleanCourse({ ...c, ...cards.k }));
    saveCards(orgId, raceId, today, cards.k).catch(() => setMsg("Kaydedilemedi. İnterneti kontrol et."));
  }, [orgId, raceId, today, cards]);
  // Tekne ekranında "Yeni liste" (Seyhun 2026-11-06 "listeler açıklanınca tıklarım, her gün değişecek gruplar"): renk ya da final
  // listesi (PDF, foto, Excel) okunur, bugünün grupları olur (yarış sitesinden gelen belgeyle aynı iş: raceSite applyList), sporcular kayıt listesine eklenir.
  const listN = useRef(0);
  useEffect(() => {
    if (!orgId || !list?.n || listN.current === list.n) return;
    listN.current = list.n;
    (async () => {
      const rows = await readEntryFile(list.file);
      const color = colorOf(list.file.name || "");
      const pairs = rows.map((r) => [r.sail, groupOf(r.grp) || color]).filter(([a, g]) => a && g);
      if (!pairs.length) return onListed?.(rows.length ? "Listede grup yok (dosya adında renk de yok)" : "Liste okunamadı");
      const cur = await loadEntryDoc(orgId, raceId);
      await saveGroups(orgId, raceId, today, dayGroups(cur.groups[today] || null, pairs));
      await saveEntries(orgId, raceId, mergeEntries(cur.rows, rows));
      const n = {};
      pairs.forEach(([, g]) => (n[g] = (n[g] || 0) + 1));
      onListed?.(Object.entries(n).map(([g, k]) => `${g} ${k}`).join(" · "));
    })().catch(() => onListed?.("Liste okunamadı. İnterneti kontrol et."));
  }, [orgId, raceId, list, onListed, today]);
  useEffect(() => {
    if (!orgId) return;
    let on = true;
    loadRoundsOf(orgId, raceId).then((d) => {
      if (!on) return;
      setRounds(d.rounds);
      setLive(cleanLive(d));
      loadCourse(orgId, raceId, today).then((c) => on && setCourse(cleanCourse(withRaceCards(c, d.cards))), () => {});
    }, () => {});
    return () => {
      on = false;
    };
  }, [orgId, raceId, today]);
  useEffect(() => (orgId ? watchRounds(orgId, raceId, (d) => setRounds(d.rounds)) : undefined), [orgId, raceId]);
  useLiveSync({ orgId, raceId, setLive });

  const rdays = race ? raceDays(race) : null;
  const change = useCallback((patch, job) => {
    setLive((l) => cleanLive({ ...l, ...(typeof patch === "function" ? patch(l) : patch) }));
    Promise.resolve(job?.()).catch(() => setMsg("Kaydedilemedi. İnterneti kontrol et."));
  }, []);
  const onZero = useCallback(
    (end, t) =>
      change((l) => {
        const next = zeroStarts(l.starts, t, end, l.wind, rdays, t?.own === own);
        return next ? { starts: next } : {};
      }),
    [change, rdays, own],
  );
  const tr = useTimerRun({ onZero });
  const plan = live.plan.day && live.plan.day < today ? rollPlan(live.plan, today) : live.plan;
  const order = plan.order;
  const sel = order[pickI] ? pickI : 0;
  const row = order[sel] || null;
  const rf = useRaceFlow({ orgId, raceId, live, onChange: change, rdays, today, nextGrp: () => order[pick.current]?.grp ?? "" });

  const changePlan = (patch) => {
    const next = cleanPlan({ ...plan, ...patch });
    setLive((l) => ({ ...l, plan: next }));
    const keys = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(live.plan[k]));
    return savePlanKeys(orgId, raceId, next, keys).catch(() => setMsg("Kaydedilemedi. İnterneti kontrol et."));
  };
  const push = () => saveTimer(orgId, raceId, readTimer()).catch(() => {});
  const flow = {
    ...rf.flow,
    onStart: (end, rid, prevT) => {
      rf.flow.onStart(end, rid, prevT);
      const i = order[pick.current] ? pick.current : 0;
      const r = order[i];
      if (!r) return;
      startedRow({ orgId, raceId, rid, row: r, rounds, course }).catch(() => {});
      changePlan({ order: orderWithout(order, i), warn: "" });
      setPickI(0);
      // başlatılan grupta kalınır (Seyhun 2026-11-06 "startı başlatınca onda kalmalıyız"), pencere küçük şeride iner
      setRunId(rid);
      setBig(false);
    },
  };
  const go = () => {
    const no = startBlock(readTimer(), row, Date.now());
    if (no) return setMsg(no);
    setMsg("");
    setEdit("");
    pick.current = sel;
    raceStart(flow, "start", race?.name || "Yarış", own);
    push();
  };
  // Bayrak: seçilen satır ve ondan sonraki aynı sınıfın satırları, günün bayrağı da (sonraki startlarda seçili kalır)
  const putPrep = (p) => {
    setEdit("");
    changePlan({ prep: p, order: order.map((o, k) => (k === sel || (k > sel && o.cls === row.cls) ? { ...o, prep: p } : o)) });
  };
  // Parkur: grubun kartı (Parkur › Grupların parkuru); o grup için seçili kalır
  const putCard = (id) => {
    setEdit("");
    const next = { ...course, by: { ...course.by, [cardKey(row.cls, row.grp)]: id } };
    setCourse(next);
    saveCards(orgId, raceId, today, next).catch(() => setMsg("Kaydedilemedi. İnterneti kontrol et."));
  };
  const t = tr.t;
  // geri sayım sürüyor (duraklatılmış da); 0'dan sonra ileri sayan sayaç sayılmaz (startFlow countingAt ile aynı)
  const counting = t.mode === "start" && (t.left != null || (tr.running && !tr.up));
  const cdId = counting ? rf.ridOf(t) : "";
  const shift = () => {
    audio();
    const end = (t.end ?? Date.now()) + 60e3;
    writeTimer({ ...t, end, own: t.own || own });
    rf.flow.onShift(end, t.rid);
    push();
  };
  const cancel = () => {
    raceCancel(rf.flow, own);
    push();
  };
  // Rüzgâr / eksen / hat ölçümü (Seyhun 2026-11-05 "parkur sekmesinde yaptığımızın aynısını canlı yayında da"): Yayın › Parkur'daki
  // Ölçüm ekle penceresinin aynısı (CourseTab AddSheet), aynı kayıt (addCourseObs)
  const addObs = (o) => {
    onWindClose?.();
    const obs = cleanObs(o);
    setCourse((c) => cleanCourse({ ...c, obs: [...c.obs, obs] }));
    addCourseObs(orgId, raceId, today, obs).catch(() => setMsg("Kaydedilemedi. İnterneti kontrol et."));
  };
  // Sesle (Seyhun 2026-11-05 "canlı ekranda da sesle de olmalı"): Ölçüm ekle › Sesle; Yayın › Parkur'daki sesle parkurun aynısı
  // (CourseTalk + courseWrite): rüzgâr, eksen, hat, rota, grubun kartı aynı kayıtlarla; Geri al parkuru önceki hâline yazar
  const [talk, setTalk] = useState(false);
  // çubuktaki Sesle düğmesi (talkN her basışta değişir)
  const talkSeen = useRef(talkN);
  useEffect(() => {
    if (!talkN || talkSeen.current === talkN) return undefined;
    talkSeen.current = talkN;
    const t = setTimeout(() => setTalk(true), 0);
    return () => clearTimeout(t);
  }, [talkN]);
  const fail = () => setMsg("Kaydedilemedi. İnterneti kontrol et.");
  const applyVoice = (r) =>
    writeCourseVoice(r, {
      course,
      rows: plan.sets.flatMap((x) => x.grps.map((g) => [x.cls, g])),
      putCards: async (k) => {
        const next = cleanCourse({ ...course, ...k });
        setCourse(next);
        await saveCards(orgId, raceId, today, next);
      },
      putObs: async (list, len) => {
        setCourse((c) => cleanCourse({ ...c, obs: [...c.obs, ...list], ...(len ? { len: { ...(c.len || {}), ...len } } : {}) }));
        await addCourseMany(orgId, raceId, today, list, len);
      },
    });
  const undoVoice = async (prev) => {
    setCourse(cleanCourse(prev));
    await saveCourse(orgId, raceId, today, prev).catch(fail);
  };
  const running = live.starts.filter((x) => x.day === today && !x.fin && !x.void);
  // Yarıştaki grup (Seyhun 2026-11-05 "Mavi yarışta diyor, tıklıyorum, yarışı bitirmeyi yapamıyorum"): dokununca Yayın › Süre'deki işlemler,
  // aynı kayıtlarla (lib/raceLive openWin, moveWin, finishRace; useRaceFlow save / voidNow)
  const [clk, setClk] = useState(0);
  useEffect(() => {
    if (!open) return undefined;
    const i = setInterval(() => setClk(Date.now()), 500);
    return () => clearInterval(i);
  }, [open]);
  const nowT = Math.max(clk, tr.now || 0);
  const runS = running.find((x) => x.id === runId && x.id !== cdId) || null;
  const upHere = (id) => tr.up && t.mode === "start" && rf.ridOf(t) === id; // bu telefonun sayacı bu yarışı ileri sayıyor
  const putStarts = (fn) => rf.save(fn(live.starts));
  const endRace = (s) => {
    if (upHere(s.id)) raceFinish(rf.flow, own);
    else putStarts((l) => finishRace(l, s.id, Date.now(), rdays));
    push();
    setRunId("");
  };
  // Finiş penceresi kendiliğinden (Seyhun 2026-11-05 "canlı ekrana da taşı"): uygulama içi ekran açıkken bu telefon, Yayın › Süre ile aynı
  // kuralla (startFlow finishSteps) ilk finişte pencereyi açar, süre bitince yarışı bitirir, bitirmeyenlere bir kez DNF yazar. 5 sn'de bir
  const [groups, setGroups] = useState({});
  useEffect(() => {
    if (!orgId || !auto) return undefined;
    let on = true;
    loadEntryDoc(orgId, raceId).then((d) => on && setGroups(d.groups || {}), () => {});
    return () => {
      on = false;
    };
  }, [orgId, raceId, auto]);
  const tick = useRef(null);
  const step = () => {
    const now = Date.now();
    let next = live.starts;
    let stop = false;
    for (const x of finishSteps({ starts: live.starts, rounds, groups, today, now })) {
      if (x.k === "open") next = openWin(next, x.s.id, x.at);
      else if (x.k === "end") (next = finishRace(next, x.s.id, now, rdays)), (stop = stop || upHere(x.s.id));
      else {
        next = next.map((y) => (y.id === x.s.id ? { ...y, dnf: true } : y));
        stop = stop || upHere(x.s.id);
        if (x.pen) {
          const prev = rounds[x.s.id] || { route: [], legs: [] };
          saveRounds(orgId, raceId, x.s.id, { ...prev, pen: x.pen }, prev).catch(() => {});
        }
      }
    }
    if (stop) {
      writeTimer({ dur: t.dur, end: null, left: null, zero: t.end });
      push();
    }
    if (next !== live.starts) rf.save(next);
  };
  useEffect(() => {
    tick.current = step;
  });
  useEffect(() => {
    if (!orgId || !auto) return undefined;
    const i = setInterval(() => tick.current?.(), 5000);
    return () => clearInterval(i);
  }, [orgId, auto]);
  const runSec = (s) => (upHere(s.id) ? Math.max(0, Math.floor(-tr.rem)) : Math.max(0, Math.floor((nowT - Date.parse(s.at)) / 1000)));
  if (!orgId) return null;
  const card = row ? cardFor(course, row.cls, row.grp) : null;
  // Grup ekle (Seyhun 2026-11-08 "sarı, mavi, kırmızı grubumuz var, onları ekleyebiliyor olmam lazım"): seçili satırın sınıfına grup eklenir,
  // hem sınıfın grupları (plan.sets, sonraki yarışlar da) hem de bekleyen start olarak sıranın sonuna. Önce günün listesindeki gruplar.
  const addCls = row?.cls || plan.sets[0]?.cls || plan.cls || "Optimist";
  const dayGrps = [...new Set(Object.values(groupMap(groupsOn(groups, today))))];
  const addOpts = [...new Set([...dayGrps, ...GROUP_PICK])].filter((g) => !order.some((o) => o.cls === addCls && o.grp === g));
  const addGrp = (g) => {
    setEdit("");
    if (order.length >= 24) return setMsg("Programda en çok 24 start.");
    const sets = plan.sets.length ? plan.sets : [{ cls: addCls, grps: plan.grps || [] }];
    const next = sets.some((x) => x.cls === addCls) ? sets.map((x) => (x.cls === addCls && !x.grps.includes(g) ? { ...x, grps: [...x.grps, g] } : x)) : [...sets, { cls: addCls, grps: [g] }];
    changePlan({ sets: next, cls: next[0].cls, grps: next[0].grps, order: [...order, { cls: addCls, grp: g, prep: row?.prep || plan.prep || "U" }] });
    setPickI(order.length);
    setRunId("");
  };
  const dur = Math.round((t.left ?? t.dur ?? 300) / 60);
  const cdS = counting && cdId ? live.starts.find((x) => x.id === cdId) || null : null;
  const miniS = runS || cdS; // küçük şeritte görünen start
  const mini = open && !big && !!miniS;
  const gOf = (s) => rounds[s.id]?.grp || s.grp || "";
  const voidRun = (s) => (upHere(s.id) && writeTimer({ dur: t.dur, end: null, left: null, zero: t.end }), rf.voidNow([s.id], "Abandone"), push(), setRunId(""));
  return (
    <>
      {mini ? (
        <div className="lst lst-mini" role="dialog" aria-label="Start">
          <div className="lst-sh">
            <span className="nm">
              {gOf(miniS) ? <i style={{ background: groupColor(gOf(miniS)) || "#ffd23f" }} /> : null}
              {gOf(miniS) || raceName(miniS)}
            </span>
            <span className={`tm${miniS === cdS ? " cd" : ""}`}>
              {miniS === cdS ? (t.left != null ? `−${mmss(t.left)}` : `−${mmss(Math.max(0, tr.rem))}`) : miniS.fw ? `Finiş ${mmss(winLeft(miniS, nowT) || 0)}` : mmss(runSec(miniS))}
            </span>
            <span className="bt">
              {miniS === cdS ? (
                <>
                  <button type="button" onClick={shift}>
                    +1 dk
                  </button>
                  <button type="button" onClick={cancel}>
                    İptal
                  </button>
                </>
              ) : (
                <>
                  {miniS.fw ? (
                    <button type="button" onClick={() => putStarts((l) => moveWin(l, miniS.id, Date.now(), 5))}>
                      +5 dk
                    </button>
                  ) : (
                    <button type="button" onClick={() => putStarts((l) => openWin(l, miniS.id, Date.now()))}>
                      İlk finiş
                    </button>
                  )}
                  <button type="button" className="go" onClick={() => endRace(miniS)}>
                    Bitir
                  </button>
                  <button type="button" className="x" onClick={() => voidRun(miniS)}>
                    Abandone
                  </button>
                </>
              )}
              <button type="button" className="bg" onClick={() => setBig(true)}>
                Büyüt
              </button>
            </span>
          </div>
        </div>
      ) : open ? (
        <div className="lst" role="dialog" aria-label="Start">
          <div className="lst-sh">
            <div className="lst-hd">
              <b>Start</b>
              {miniS ? (
                <button type="button" className="lst-sm" onClick={() => setBig(false)}>
                  Küçült
                </button>
              ) : (
                <span>{[row?.cls, row ? rf.flow.label : ""].filter(Boolean).join(" · ")}</span>
              )}
            </div>
            {!counting || running.length ? (
              <>
                <div className="lst-lab">Grup</div>
                <div className="lst-gs">
                  {running.map((s) => {
                    const cd = s.id === cdId;
                    const g = rounds[s.id]?.grp || s.grp || "";
                    return (
                      <button key={s.id} type="button" className={`lst-g run${runS?.id === s.id ? " on" : ""}`} aria-pressed={runS?.id === s.id} disabled={cd} onClick={() => (setRunId(runS?.id === s.id ? "" : s.id), setEdit(""), setMsg(""))}>
                        <span>
                          {g ? <i style={{ background: groupColor(g) || "#ffd23f" }} /> : null}
                          {g || raceName(s)}
                        </span>
                        <small>{cd ? `Start'a ${mmss(Math.max(0, tr.rem))}` : s.fw ? `Finiş ${mmss(winLeft(s, nowT) || 0)}` : `Yarışta ${mmss(runSec(s))}`}</small>
                      </button>
                    );
                  })}
                  {(counting ? [] : order).map((o, i) => (
                    <button key={`${o.cls}${o.grp}${i}`} type="button" className={`lst-g${i === sel && !runS ? " on" : ""}`} aria-pressed={i === sel && !runS} onClick={() => (setPickI(i), setRunId(""), setEdit(""), setMsg(""))}>
                      <span>
                        {o.grp ? <i style={{ background: groupColor(o.grp) || "#ffd23f" }} /> : null}
                        {o.grp || o.cls}
                      </span>
                      <small>{o.ap ? "Tehirde" : `${nextRaceNo(live.starts, today, rdays, o.grp || "")}. yarış`}</small>
                    </button>
                  ))}
                  {counting ? null : (
                    <button type="button" className={`lst-g add${edit === "grp" ? " on" : ""}`} aria-pressed={edit === "grp"} onClick={() => (setEdit(edit === "grp" ? "" : "grp"), setMsg(""))}>
                      <span>+ Grup</span>
                    </button>
                  )}
                </div>
                {edit === "grp" ? (
                  <div className="lst-ch lst-addg">
                    {addOpts.map((g) => (
                      <button key={g} type="button" onClick={() => addGrp(g)}>
                        <i style={{ background: groupColor(g) || "#ffd23f" }} aria-hidden="true" />
                        {g}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
            {runS ? (
              <div className="lst-rows lst-rs">
                <div className="lst-r">
                  <span className="k">{runS.fw ? "Finiş" : "Süre"}</span>
                  <span className="v tm">{runS.fw ? `Pencere ${mmss(winLeft(runS, nowT) || 0)}` : mmss(runSec(runS))}</span>
                </div>
                <div className="lst-ch">
                  {runS.fw ? (
                    <>
                      <button type="button" onClick={() => putStarts((l) => moveWin(l, runS.id, Date.now(), -5))}>
                        −5 dk
                      </button>
                      <button type="button" onClick={() => putStarts((l) => moveWin(l, runS.id, Date.now(), 5))}>
                        +5 dk
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => putStarts((l) => openWin(l, runS.id, Date.now()))}>
                      İlk finiş
                    </button>
                  )}
                  <button type="button" className="go" onClick={() => endRace(runS)}>
                    Bitir
                  </button>
                  <button type="button" className="x" onClick={() => voidRun(runS)}>
                    Abandone
                  </button>
                </div>
              </div>
            ) : counting ? null : row ? (
              <>
                <div className="lst-rows">
                  <div className="lst-r">
                    <span className="k">Bayrak</span>
                    <span className="v">
                      {row.prep ? <span className="fl" dangerouslySetInnerHTML={{ __html: flagSvg(row.prep) || "" }} /> : null}
                      {row.prep ? prepName(row.prep) : "Seçilmedi"}
                    </span>
                    <button type="button" onClick={() => setEdit(edit === "prep" ? "" : "prep")}>
                      {edit === "prep" ? "Kapat" : "Değiştir"}
                    </button>
                  </div>
                  {edit === "prep" ? (
                    <div className="lst-ch">
                      {PREP_PICK.map((p) => (
                        <button key={p} type="button" className={row.prep === p ? "on" : ""} aria-pressed={row.prep === p} onClick={() => putPrep(p)}>
                          {prepName(p)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="lst-r">
                    <span className="k">Parkur</span>
                    <span className="v">{card ? `Kart ${card.id} · ${CARD_TYPES[card.type] || ""}` : "Seçilmedi"}</span>
                    {course.cards.length > 1 ? (
                      <button type="button" onClick={() => setEdit(edit === "card" ? "" : "card")}>
                        {edit === "card" ? "Kapat" : "Değiştir"}
                      </button>
                    ) : null}
                  </div>
                  {edit === "card" ? (
                    <div className="lst-ch">
                      {course.cards.map((k) => (
                        <button key={k.id} type="button" className={card?.id === k.id ? "on" : ""} aria-pressed={card?.id === k.id} onClick={() => putCard(k.id)}>
                          {`Kart ${k.id}`}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button type="button" className="lst-go" disabled={counting} onClick={go}>
                  {counting ? "Geri sayım sürüyor" : `${row.grp || row.cls} start ver`}
                  {counting ? null : <small>{`${dur} dk`}</small>}
                </button>
              </>
            ) : (
              <p className="lst-no">Programda bekleyen start yok</p>
            )}
            {msg ? <p className="lst-msg">{msg}</p> : null}
            {counting && cdId ? (
              <div className="lst-run">
                <span className="nm">{[rounds[cdId]?.grp || live.starts.find((x) => x.id === cdId)?.grp || "", raceName(live.starts.find((x) => x.id === cdId) || {})].filter(Boolean).join(" ")}</span>
                <span className="tm">{t.left != null ? `−${mmss(t.left)}` : `−${mmss(Math.max(0, tr.rem))}`}</span>
                <span className="x">
                  <button type="button" onClick={shift}>
                    +1 dk
                  </button>
                  <button type="button" onClick={cancel}>
                    İptal
                  </button>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {masaHost && orgId ? createPortal(<LiveMasa addCat={addCat} orgId={orgId} raceId={raceId} race={race} live={live} now={now} pos={pos} today={today} />, masaHost) : null}
      {vidHost ? createPortal(<LiveVideos orgId={orgId} raceId={raceId} race={race} starts={live.starts} rounds={rounds} stream={stream} playing={playing} onPlay={onPlay} />, vidHost) : null}
      <VoidSheet ask={rf.ask} onChoose={(r) => (rf.choose(r), push())} />
      <AddSheet open={wind} c={course} onClose={() => onWindClose?.()} onAdd={addObs} onVoice={() => (onWindClose?.(), setTalk(true))} />
      <CourseTalk open={talk} onClose={() => setTalk(false)} course={course} apply={applyVoice} undo={undoVoice} />
    </>
  );
}
