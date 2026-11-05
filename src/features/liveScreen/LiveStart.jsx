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
import { addCourseObs, loadCourse, loadRoundsOf, saveCards, savePlanKeys, saveTimer, watchRounds } from "@/features/athletes/raceLiveStore";
import { useLiveSync } from "@/features/raceMedia/useLiveSync";
import { VoidSheet, useRaceFlow } from "@/features/raceMedia/useRaceFlow";
import { audio, raceCancel, raceStart, readTimer, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { orderWithout, startBlock, startedRow, yayinPath, zeroStarts } from "@/features/broadcast/startFlow";
import { cleanLive, cleanPlan, raceName, rollPlan } from "@/lib/raceLive";
import { CARD_TYPES, cardFor, cardKey, cleanCourse, cleanObs, withRaceCards } from "@/lib/raceCourse";
import { AddSheet } from "@/features/raceMedia/CourseTab";
import { PREP_PICK, prepName } from "@/lib/raceRounds";
import { flagSvg } from "@/lib/raceSignals";
import { groupColor } from "@/lib/roundScore";
import { todayStr } from "@/lib/utils/format";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LiveVideos } from "./LiveVideos";

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function LiveStart(p) {
  return (
    <ToastProvider>
      <Start {...p} />
    </ToastProvider>
  );
}
// vidHost: Video panelindeki yer (LiveScreen ScView; yalnız uygulama içinde); videolar oraya çizilir
function Start({ raceId, open, onClose, onReady, wind = false, onWindClose, vidHost = null, playing = "", onPlay }) {
  const [orgId, setOrgId] = useState("");
  const [race, setRace] = useState(null);
  const [live, setLive] = useState(() => cleanLive({}));
  const [rounds, setRounds] = useState({});
  const [course, setCourse] = useState(() => cleanCourse({}));
  const [pickI, setPickI] = useState(0);
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
      setPickI(0); // sıradaki grup kendiliğinden seçili
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
  const running = live.starts.filter((x) => x.day === today && !x.fin && !x.void);
  if (!orgId) return null;
  const card = row ? cardFor(course, row.cls, row.grp) : null;
  const dur = Math.round((t.left ?? t.dur ?? 300) / 60);
  return (
    <>
      {open ? (
        <div className="lst" role="dialog" aria-label="Start">
          <div className="lst-sh">
            <div className="lst-hd">
              <b>Start</b>
              <span>{[row?.cls, row ? rf.flow.label : ""].filter(Boolean).join(" · ")}</span>
            </div>
            {order.length || running.length ? (
              <>
                <div className="lst-lab">Grup</div>
                <div className="lst-gs">
                  {running.map((s) => {
                    const cd = s.id === cdId;
                    const g = rounds[s.id]?.grp || s.grp || "";
                    return (
                      <div key={s.id} className="lst-g run">
                        <span>
                          {g ? <i style={{ background: groupColor(g) || "#ffd23f" }} /> : null}
                          {g || raceName(s)}
                        </span>
                        <small>{cd ? `Start'a ${mmss(Math.max(0, tr.rem))}` : "Yarışta"}</small>
                      </div>
                    );
                  })}
                  {order.map((o, i) => (
                    <button key={`${o.cls}${o.grp}${i}`} type="button" className={`lst-g${i === sel ? " on" : ""}`} aria-pressed={i === sel} onClick={() => (setPickI(i), setEdit(""), setMsg(""))}>
                      <span>
                        {o.grp ? <i style={{ background: groupColor(o.grp) || "#ffd23f" }} /> : null}
                        {o.grp || o.cls}
                      </span>
                      <small>{o.ap ? "Tehirde" : i === 0 ? "Sırada" : "Bekliyor"}</small>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {row ? (
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
      {vidHost ? createPortal(<LiveVideos raceId={raceId} starts={live.starts} playing={playing} onPlay={onPlay} />, vidHost) : null}
      <VoidSheet ask={rf.ask} onChoose={(r) => (rf.choose(r), push())} />
      <AddSheet open={wind} c={course} onClose={() => onWindClose?.()} onAdd={addObs} />
    </>
  );
}
