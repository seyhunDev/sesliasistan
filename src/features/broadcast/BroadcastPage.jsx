"use client";
/* eslint-disable @next/next/no-img-element -- yayın küçük resimleri (YouTube, kayıt) doğrudan */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { loadRace, saveRaceDates } from "@/features/athletes/races";
import { readProgramFile, readProgramText } from "@/features/broadcast/broadcastStore";
import { programPatch } from "@/lib/raceProgram";
import { raceDays } from "@/features/athletes/raceWeather";
import { addCourseObs, loadCourse, loadLive, loadRoundsOf, resetLive, saveCamBy, saveCourseShow, saveOnAir, saveCards, watchRounds, saveCourse, savePlan, saveRounds, saveStarts } from "@/features/athletes/raceLiveStore";
import { GROUP_PICK, groupColor, groupMap } from "@/lib/roundScore";
import { PenSheet } from "./PenSheet";
import { audio, chooseDur, ownHere, raceCancel, raceFinish, raceStart, raceVoid, readTimer, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { ResetSheet } from "@/features/raceMedia/ResetSheet";
import { useLiveSync } from "@/features/raceMedia/useLiveSync";
import { VoidSheet, useRaceFlow } from "@/features/raceMedia/useRaceFlow";
import { AddSheet } from "@/features/raceMedia/CourseTab";
import { RoundsScreen } from "@/features/rounds/RoundsScreen";
import { EntriesView } from "@/features/rounds/EntriesView";
import { TrackPanel } from "@/features/tracking/TrackPanel";
import { BoatLive } from "@/features/tracking/BoatLive";
import { loadEntryDoc } from "@/features/rounds/roundsStore";
import { ensurePublic, liveUrl, recName, setStream, showOnScreen } from "@/features/liveScreen/liveActions";
import { upSec, AP_MIN, AP_WHY, apDue, apLower, apRaise, trHm, warnDue, orangeUp, apText, cleanLive, cleanPlan, dayRaces, dayTime, dirShort, dropRace, finishRace, pickTimer, resetPatch, rollPlan, ownedBy, raceName, raceOrder, raceTime, raceTitle, renumber, zeroRace } from "@/lib/raceLive";
import { CARD_IDS, CARD_TYPES, cardFor, cardKey, withRaceCards, cleanCourse, cleanObs, obsTitle, selCard, withLiveWind } from "@/lib/raceCourse";
import { cleanRoute, routeText, sceneSvg } from "@/lib/courseScene";
import { cardOf } from "@/lib/courseCard";
import { CLASS_PICK, PREP_PICK, SRC_KINDS, YT_RTMP, addSource, cleanSources, currentStart, liveStarts, markName, prepName, screenUrl, streamSources, ytEmbed, ytId, ytSrc } from "@/lib/raceRounds";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { autoCaption } from "@/lib/raceCaption";
import { bindCam, camOf, groupsOf, sourcesOf } from "@/lib/raceCams";
import "./masa.css";

// Yarışın yayın sayfası (/athletes/races/<id>/yayin, yalnız ana hesap; Seyhun 2026-11-01 "herkese açık multimedyasını ayrı bir sayfada
// yöneteceğiz"): herkese açık /canli ekranına giden her şey tek yerde. Lacivert üstte start sayacı (Başlat · İptal · Eşitle; sayaç diğer
// cihazlara ve herkese açık sayfaya useLiveSync ile gider), Linki kopyala / Ekranı aç. Açık alanda üç bölüm:
// Ekranda (canlı yayın linki ya da bu yarışın videoları, telefondan seçilen video yüklenir; dikey/yatay yazılır; Göster ekrana verir),
// Parkur ve rüzgâr (son rüzgâr, parkur kartı, ölçüm ekleme; Parkur sekmesiyle aynı kayıt), Dönüşler (sesle giriş, kayıt listesi),
// Sonuç PDF'i ayrı sayfada (/sonuclar, 2026-11-01); Linki kopyala, Ekranı aç, Kayıt listesi, gün durumu ⋯ menüsünde. Multimedya sayfası kalktı (Seyhun 2026-11-01 "tek bu yayın olanı kullanacağız").
// Bugünün startları tek liste (Seyhun 2026-11-01 "sınıf/grup seçimi ile sıra ekleme birbirinden bağımsız olamaz"): biten ve süren startlar
// saatiyle üstte, sonra yapılacak startlar (raceLive.plan.order [{ cls, grp, prep }]); ilk bekleyen "Sıradaki"dir, sayacın üstünde yazar ve
// Başlat onun sınıf/grup/bayrağını rounds[start]'a yazıp listeden düşer. "Start ekle" satır ekler; satıra dokununca sınıf, grup, bayrak,
// Yukarı/Aşağı/Çıkar aynı yerde. Biten yarışın seçimi de satırından düzeltilir.
const hm = (iso) => (iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "");
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const orient = (m) => (m.w && m.h ? (m.h > m.w ? "Dikey" : "Yatay") : "");

// Elle yazılacak hazır yazılar: olaylar (start, tehir, genel geri, finiş) kendiliğinden yazar, grup ve yarış zaten şeritte
const CAP_PICKS = ["Ödül töreni", "Kısa ara", "Protesto saati"];

export function BroadcastPage({ orgId, id }) {
  const toast = useToast();
  const today = todayStr();
  const [race, setRace] = useState(null);
  const [live, setLive] = useState(() => cleanLive({}));
  const [L, setL] = useState(null); // rounds, screen, stream (loadRoundsOf)
  const [course, setCourse] = useState(() => cleanCourse({}));
  const [rtEdit, setRtEdit] = useState(false); // rotayı düzelt (yazı kutusu)
  const [rt, setRt] = useState(""); // seçili parkur kartının rotası (yazı: "1 2 3 F")
  const [rtId, setRtId] = useState("");
  const [tab, setTab] = useState("sure"); // Sekmeler (Seyhun 2026-11-02): Süre · Video · Parkur · Dönüşler
  const [cap, setCap] = useState(""); // ekranın altındaki yazı (screen.caption)
  const [capInit, setCapInit] = useState(false);
  const [capNow, setCapNow] = useState(0); // otomatik yazının önizlemesi için saat (5 sn)
  // Canlı kaynaklar (Seyhun 2026-11-02 "Drone 1, 2, 3, telefon; önce ben göreyim, sonra ekrana alayım"): stream.sources; sıfırlamada kalır,
  // yeni yarışta bu telefonda son kullanılan liste gelir. Önizleme yalnız bu sayfada (veriye yazılmaz), "ekrana al" screen'e yazar
  const [srcList, setSrcList] = useState([]);
  const [stat, setStat] = useState({}); // bağlantı → { live, vid } (/api/yayin-durum)
  const [addOpen, setAddOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false); // Drone › Nasıl bağlanır
  const [sel, setSel] = useState(null); // ekrana verilecek seçim { kind, mid }
  const [busy, setBusy] = useState("");
  const [add, setAdd] = useState(null); // ölçüm penceresi: PICKS sırası
  const [voice, setVoice] = useState(false);
  const [list, setList] = useState(false);
  const [penOpen, setPenOpen] = useState(false); // Dönüşler › Ceza (arayarak seçerek)
  const [entries, setEntries] = useState([]);
  const [groups, setGroups] = useState({});
  const [pickId, setPickId] = useState(""); // listede seçilen biten start (boşsa sayacın yarışı)
  const [editI, setEditI] = useState(-1); // listede açık olan bekleyen start (plan.order sırası)
  const [pickKey, setPickKey] = useState(""); // satırda açık seçim: cls | grp | prep
  const [menu, setMenu] = useState(false); // ⋯ menüsü (Seyhun 2026-11-01 "çok fazla buton, yanlışlıkla tıklanmasın": az kullanılan ve riskli işler burada)
  const [askEnd, setAskEnd] = useState(false); // Günü bitir bir daha sorar
  const [grpOpen, setGrpOpen] = useState(false); // Gruplar: seçim açık
  const [openN, setOpenN] = useState(0); // açılan biten yarış
  const [openDay, setOpenDay] = useState(""); // Program: seçili gün
  const [impOpen, setImpOpen] = useState(false); // Program: Programı ekle açık
  const [reset, setReset] = useState(false); // Yayını sıfırla penceresi
  const [delId, setDelId] = useState(""); // Program: silinmesi sorulan start
  const [retryPick, setRetryPick] = useState(false); // tekrar startın bayrağı burada seçildi ("Geri" boşaltır)
  const [made, setMade] = useState(0); // son oluşturulan yarışın programa eklenen start sayısı ("Geri" onları çıkarıp bayrağa döner)
  const [setupOpen, setSetupOpen] = useState(false); // ⋯ › Sınıf ve gruplar (yarışın sınıfları ve grupları bir kez seçilir)
  const [tick, setTick] = useState(0); // tehir takibinin saniyesi
  const [dev] = useState(() => Math.random().toString(36).slice(2, 10)); // bu telefon (tehirden sonra geri sayımı kim başlatır)
  const [ap, setAp] = useState(null); // tehir penceresi { min, why } (Seyhun 2026-11-01 "bir sebep belirterek tehir, bir saatlik")
  const [plan, setPlan] = useState(() => cleanPlan({})); // günün programı (raceLive.plan; herkese açık ekranın evresi buna göre)
  const file = useRef(null);
  const pickRef = useRef(-1); // Süre: satırdan başlatılan bekleyen start (plan.order sırası; -1 = sıradaki)
  const [vOpen, setVOpen] = useState(""); // Video: açık ayar (alt yazı, ekranda göster)
  const [camOpen, setCamOpen] = useState(""); // Kameralar: grupları seçilen kaynak
  const [camPick, setCamPick] = useState([]);
  const liveIn = useRef(false); // yarışlar yüklendi mi (yüklenmeden boş listeye yazılırsa günün yarışları silinirdi; multimedya sayfasındaki koruma)
  const rdays = race ? raceDays(race) : null;

  const reload = useCallback(
    () =>
      loadRoundsOf(orgId, id).then((d) => {
        setL(d);
        return d;
      }),
    [orgId, id],
  );
  useEffect(() => {
    let on = true;
    loadRace(orgId, id).then((r) => on && setRace(r || {}), () => on && setRace({}));
    loadLive(orgId, id).then((l) => on && ((liveIn.current = true), setLive(l)), () => {});
    // parkur kartları yarış boyu (raceLive.cards); ölçümler günün belgesinde
    Promise.all([loadCourse(orgId, id, today), loadRoundsOf(orgId, id).catch(() => ({}))]).then(([c, d]) => on && setCourse(cleanCourse(withRaceCards(c, d.cards)))).catch(() => {});
    loadEntryDoc(orgId, id).then((d) => on && (setEntries(d.rows), setGroups(d.groups)), () => {});
    reload().then((d) => {
      if (!on) return;
      // yeni gün: plan eski günde kaldıysa bugünün planı (günün saati, bekleyenler düşer) yazılır
      const rp = rollPlan(d.plan, today);
      setPlan(rp);
      if (rp.day !== d.plan.day) savePlan(orgId, id, rp).catch(() => {});
      const sl = streamSources(d.stream);
      setSrcList(d.stream.sources.length || sl.some((x) => x.url) ? sl : lastSources() || sl);
      setSel(d.screen.kind ? { kind: d.screen.kind, mid: d.screen.mid } : null);
    }, () => toast("Yüklenemedi, tekrar dene."));
    ensurePublic(id).catch(() => {});
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, id, today]);

  // Yayında mı (Video sekmesi açıkken 45 sn'de bir; YouTube, sunucuda /api/yayin-durum)
  const srcUrls = srcList.map((x) => x.url).filter(Boolean).join("|");
  useEffect(() => {
    if (tab !== "video" || !srcUrls) return;
    let on = true;
    const ask = () =>
      document.visibilityState === "visible" &&
      authFetch(`/api/yayin-durum?${srcUrls.split("|").map((u) => `u=${encodeURIComponent(u)}`).join("&")}`)
        .then((r) => r.json())
        .then((d) => on && setStat(Object.fromEntries((d.list || []).map((x) => [x.url, x]))))
        .catch(() => {});
    ask();
    const t = setInterval(ask, 45000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [tab, srcUrls]);

  // Dönüşler canlı (iki görevli: biri şamandırada, biri finişte; Seyhun 2026-11-02 inceleme)
  useEffect(() => {
    const tick = () => setCapNow(Date.now());
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => watchRounds(orgId, id, (d) => setL((p) => (p ? { ...p, ...d } : p))), [orgId, id]);
  // Bu sayfada yapılan değişiklik hemen görünür; kayıt arkada gider
  const change = useCallback(
    (patch, job) => {
      setLive((l) => cleanLive({ ...l, ...(typeof patch === "function" ? patch(l) : patch) }));
      Promise.resolve(job?.()).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
    },
    [toast],
  );
  // Sayaç 0 olunca günün sıradaki yarışı start saati ve son rüzgârla yazılır (RaceMedia ile aynı)
  const onZero = useCallback(
    (end, t) => {
      if (Date.now() - end > 20 * 60e3) return;
      if (!liveIn.current) return;
      if (t?.mode !== "start" || !t.rid || !ownedBy(t.own, ownHere())) return;
      change((l) => {
        const next = zeroRace(l.starts, t.rid, end, l.wind, rdays);
        if (next === l.starts) return {};
        saveStarts(orgId, id, next).catch(() => {});
        return { starts: next };
      });
    },
    [change, orgId, id, rdays],
  );
  const tr = useTimerRun({ onZero });
  useLiveSync({ orgId, raceId: id, setLive });
  const rf = useRaceFlow({ orgId, raceId: id, live, onChange: change, rdays, today, nextGrp: () => plan.order[pickRef.current]?.grp ?? plan.order[0]?.grp ?? "" });
  const cur = tr.t.end != null || tr.t.left != null ? live.starts.find((x) => x.id === rf.ridOf(tr.t)) : null;
  // Program: değişiklik hemen görünür, kayıt arkada (savePlan)
  const tomorrow = new Date(Date.parse(`${today}T12:00:00`) + 864e5).toLocaleDateString("sv-SE");
  const changePlan = (patch) => {
    const next = cleanPlan({ ...plan, ...patch });
    setPlan(next);
    savePlan(orgId, id, next).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
  };
  const planDay = plan.day || today;
  const nextPlan = plan.order[0] || null; // sıradaki start (listenin ilk bekleyeni)
  // Tehir: start saati min dakika ileri alınır (0 = belirsiz, saat silinir), sebep ekranda yazar; "Erteleme kalktı" eski saati geri getirir
  // Geri sayımda tehir (Seyhun 2026-11-02 "tehir yaptım ama süre durmadı"): sayaç durur, start verilmemiş yarış silinir ve programın
  // başına geri döner (aynı grup, aynı numara); yeni saat şimdiden ileri (varsayılan 1 dk). Yarış öncesi tehirde varsayılan 1 saat.
  const countingAt = (now) => tr.t.mode === "start" && ((tr.t.end != null && tr.t.end > now) || tr.t.left != null);
  const apBack = (rid, drop = true) => {
    const s = live.starts.find((x) => x.id === rid);
    if (!s) return;
    const e = L?.rounds?.[rid] || {};
    const back = { cls: e.cls || "", grp: e.grp || s.grp || "", prep: e.prep || plan.prep || "" };
    if (!drop) return back;
    change((l) => {
      const next = dropRace(l.starts, rid, rdays);
      saveStarts(orgId, id, next).catch(() => {});
      return { starts: next };
    });
    return back;
  };
  const stopCount = () => {
    const t = readTimer();
    if (t.mode === "start" && (t.end != null || t.left != null)) writeTimer({ ...pickTimer({}), zero: t.zero });
  };
  const openAp = () => {
    const c = countingAt(Date.now());
    setAp(ap ? null : { min: c ? 1 : 60, why: AP_WHY[0], live: c });
  };
  const chooseVoid = (v) => {
    // Genel geri / Abandone (Seyhun 2026-11-02 "sınıf aynı, sadece bayrak değiştirebilmeliyim; sorun olunca kara bayrağa gidiliyor"): aynı start
    // aynı numarayla programın başına döner, bayrağı boş; sayaç yerine resimli bayrak seçimi çıkar
    if ((v === "Genel geri çağırma" || v === "Abandone") && rf.ask) {
      const back = apBack(rf.ask.id, false);
      rf.choose(v);
      if (back) changePlan({ order: [{ ...back, prep: "" }, ...plan.order] });
      setRetryPick(false);
      setTab("sure");
      return;
    }
    if (v !== "Tehir" || !rf.ask?.canDrop) return rf.choose(v);
    const back = apBack(rf.ask.id, false);
    if (back) changePlan({ order: [back, ...plan.order] });
    rf.choose("");
    setTab("sure");
    setAp({ min: 1, why: AP_WHY[0], live: false, now: true, auto: true });
  };
  // Tehir (Seyhun 2026-11-02 "geri sayımın herhangi bir yerinde tehir; 1 dk sonra indir, 5 dk sonra indir ya da belirsiz; indikten 1 dk sonra
  // 5 dakikalık geri sayımı vermem gerekiyor, takibini yapalım"): AP şimdi çekilir, seçilen dakikada kendiliğinden iner (belirsizde
  // "Tehiri indir"); inince 1 dk sonra uyarı işareti = sıradaki yarışın geri sayımı kendiliğinden başlar (tehiri kuran telefonda).
  const postpone = () => {
    let order = plan.order;
    // dizinin durduğu yer (canlı ekranda şerit orada kırmızı noktayla durur)
    const t0 = readTimer();
    const seq = ap.live && t0.mode === "start" ? (t0.end != null ? Math.max(0, Math.ceil((t0.end - Date.now()) / 1000)) : t0.left ?? null) : null;
    if (ap.live) {
      const rid = rf.ridOf(tr.t);
      stopCount();
      const back = rid ? apBack(rid) : null;
      if (back) order = [back, ...order];
    }
    const raised = apRaise(plan, Date.now(), ap.min, ap.why, ap.land, ap.auto);
    if (seq != null) raised.ap = { ...raised.ap, seq, dur: t0.dur || 300 };
    changePlan({ day: planDay, order, ...raised });
    setAp(null);
  };
  const lowerAp = () => changePlan({ day: planDay, ...apLower(Date.now(), readTimer().dur || 300, dev, plan.ap?.land, plan.ap?.auto) });
  // Program sekmesi: her günün saati (o güne özel saat yoksa bugünün ilk start'ı da değişir), güne özel saat, yarış olmayan gün, start silme
  const setDaily = (v) => changePlan({ daily: v, ...(!plan.times[planDay] && plan.status !== "ap" ? { at: v } : {}), ...(plan.next && !plan.times[plan.next.day] ? { next: { ...plan.next, at: v } } : {}) });
  const setDayTime = (d, v) => {
    const times = { ...plan.times };
    if (v && v !== plan.daily) times[d] = v;
    else delete times[d];
    changePlan({ times, ...(d === planDay && plan.status !== "ap" ? { at: v || plan.daily } : {}), ...(plan.next?.day === d ? { next: { day: d, at: v || plan.daily } } : {}) });
  };
  const toggleOff = (d) => {
    const on = plan.off.includes(d);
    changePlan({ off: on ? plan.off.filter((x) => x !== d) : [...plan.off, d], ...(d === planDay && (plan.status === "" || plan.status === "none") ? { status: on ? "" : "none" } : {}) });
  };
  const cShow = L?.courseShow || { auto: true, at: "", one: "", side: true };
  const putCourseShow = (c) => {
    setL((p) => (p ? { ...p, courseShow: c } : p));
    saveCourseShow(orgId, id, c).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
  };
  const dropStart = (sid) => {
    setDelId("");
    change((l) => {
      const next = dropRace(l.starts, sid, rdays);
      saveStarts(orgId, id, next).catch(() => {});
      return { starts: next };
    });
    toast("Start silindi");
  };

  // Başlat: yarış açılır, sıradaki startın sınıf/grup/bayrağı o startın dönüş kaydına yazılır ve listeden düşer
  const flow = {
    ...rf.flow,
    onStart: (end, rid, prevT) => {
      if (!liveIn.current) return toast("Yarışlar yükleniyor, bir saniye sonra tekrar başlat.");
      rf.flow.onStart(end, rid, prevT);
      const pk = plan.order[pickRef.current] ? pickRef.current : 0;
      pickRef.current = -1;
      const np = plan.order[pk];
      if (!np) return;
      const { cls, grp, prep } = np;
      // seçili parkur kartı ve rotası o yarışa yazılır (rota daha önce söylendiyse o kalır)
      const prev = L?.rounds?.[rid] || { route: [], legs: [] };
      // grubun parkuru (Parkur › Grupların parkuru), yoksa seçili kart
      const k = cardFor(course, cls, grp);
      if (rid) saveRounds(orgId, id, rid, { ...prev, grp, cls, prep, card: k.id, route: prev.route?.length ? prev.route : k.route }, prev).then(reload, () => {});
      setEditI(-1);
      setMade(0);
      setRetryPick(false);
      changePlan({ order: plan.order.filter((_, k) => k !== pk), warn: "" });
    },
  };
  // Gruplar ayrı ayrı (Seyhun 2026-11-02 "sarı başladı, mavi de başlayabilir; grupları ayrı yönetebilmeliyim"): bekleyen her satırın kendi
  // Başlat'ı; başka grubun geri sayımı sürerken başlamaz (yarışta olan grup sürer, Bitti ile ayrı biter)
  const startRow = (i) => {
    if (countingAt(new Date().valueOf())) return toast("Önce süren geri sayım bitsin");
    if (!plan.order[i]?.prep) return toast("Önce bayrağı seç");
    pickRef.current = i;
    raceStart(flow, "start", race?.name || "Yarış");
  };
  // Ekranda hangi yarış (▶; tekrar dokununca en son başlayana döner) ve kameraların grupları
  const onAir = L?.onAir?.sid || "";
  const putOnAir = (sid) => {
    const o = { sid: onAir === sid ? "" : sid };
    setL((p) => (p ? { ...p, onAir: o } : p));
    saveOnAir(orgId, id, o).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
  };
  const srcs = sourcesOf(L?.stream);
  const saveCams = () => {
    const m = bindCam(L?.camBy, camOpen, camPick);
    setL((p) => (p ? { ...p, camBy: m } : p));
    setCamOpen("");
    saveCamBy(orgId, id, m).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
  };
  // Takip: saniyede bir; tehirin inişi geldiyse iner, uyarı işareti geldiyse geri sayım başlar (başka telefon kurduysa 4 sn sonra bu da başlatabilir)
  const autoRef = useRef(null);
  useEffect(() => {
    autoRef.current = (now) => {
      if (apDue(plan, now)) return changePlan({ day: planDay, ...apLower(Date.parse(plan.ap.down), readTimer().dur || 300, dev, plan.ap.land, plan.ap.auto) });
      if (!warnDue(plan, now)) return;
      const mine = !plan.warnBy || plan.warnBy === dev || now - Date.parse(plan.warn) > 4000;
      if (!mine) return;
      if (countingAt(now) || !plan.order.length) return changePlan({ warn: "" });
      if (!plan.order[0].prep) return (changePlan({ warn: "" }), toast("Bayrak seçilmedi, geri sayım başlamadı"));
      raceStart(flow, "start", race?.name || "Yarış");
    };
  });
  const tracking = (plan.status === "ap" && !!plan.ap?.down) || !!plan.warn;
  useEffect(() => {
    if (!tracking) return;
    const t = setInterval(() => {
      setTick(Date.now());
      autoRef.current?.(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, [tracking]);
  // Bekleyen start satırı: ekle, düzenle, sırala, çıkar
  const editRow = (i, patch) => changePlan({ order: plan.order.map((o, k) => (k === i ? { ...o, ...patch } : o)) });
  const undoRace = () => {
    if (retryPick) return (setRetryPick(false), editRow(0, { prep: "" }));
    if (!made || plan.order.length < made) return setMade(0);
    changePlan({ order: plan.order.slice(0, -made) });
    setMade(0);
  };
  // Kurulum: yarışın sınıfları ve sınıf sınıf grupları (yarış boyunca aynı; ⋯ › Sınıf ve gruplar ile değişir)
  const saveSetup = (sets) => {
    changePlan({ sets, cls: sets[0]?.cls || "", grps: sets[0]?.grps || [] });
    setSetupOpen(false);
    toast("Sınıflar ve gruplar kaydedildi");
  };
  // + Yarış: sıradaki yarış günün bütün gruplarıyla (grup yoksa tek start)
  const addRace = () => {
    const add = raceOrder(plan);
    if (plan.order.length + add.length > 24) return toast("Programda en çok 24 start.");
    changePlan({ order: [...plan.order, ...add] });
    setPickId("");
    setEditI(-1);
  };
  // Biten yarışın grubu / sınıfı / bayrağı düzeltilir (rounds[sid])
  const setPickOf = async (sid, patch) => {
    // grup değişince startın grubu ve yarış numaraları da (grup grup yarışta aynı yarışın grupları ortak numara)
    if ("grp" in patch)
      change((l) => {
        const next = renumber(l.starts.map((x) => (x.id === sid ? { ...x, grp: patch.grp || "" } : x)), rdays);
        saveStarts(orgId, id, next).catch(() => {});
        return { starts: next };
      });
    try {
      const prev = L?.rounds?.[sid] || { route: [], legs: [] };
      await saveRounds(orgId, id, sid, { ...prev, ...patch }, prev);
      await reload();
    } catch {
      toast("Kaydedilemedi. İnterneti kontrol et.");
    }
  };

  const copy = async () => {
    try {
      await ensurePublic(id);
      await navigator.clipboard.writeText(liveUrl(id));
      toast("Link kopyalandı");
    } catch (e) {
      toast(e?.message || "Kopyalanamadı");
    }
  };
  const openScreen = async () => {
    const w = window.open("", "_blank");
    try {
      await ensurePublic(id);
      if (w) w.location.href = liveUrl(id);
      else window.location.href = liveUrl(id);
    } catch (e) {
      w?.close();
      toast(e?.message || "Açılamadı");
    }
  };
  const show = async (s) => {
    setBusy("x");
    try {
      await showOnScreen(orgId, id, s);
      setSel(s.kind ? { kind: s.kind, mid: s.mid, src: s.src } : null);
      toast(s.kind ? "Ekranda" : "Ekrandan kaldırıldı");
      await reload();
    } catch {
      toast("Kaydedilemedi, tekrar dene.");
    }
    setBusy("");
  };
  // Canlı kaynaklar: ekle, bağlantı yaz, sil (stream.sources; eski url/drone alanları Kamera 1 / Drone 1'den dolar)
  const putSources = async (l) => {
    setSrcList(l);
    keepSources(l);
    try {
      await setStream(orgId, id, { sources: l });
      await reload();
    } catch {
      toast("Kaydedilemedi. İnterneti kontrol et.");
    }
  };
  const addSrc = (k) => {
    const l = addSource(srcList, k);
    setSel({ kind: "src", src: l.at(-1).id });
    putSources(l);
  };
  const putSrc = (sid, p) => {
    const u = String(p.url || "").trim();
    if (u && !ytEmbed(u)) return toast("Bağlantı tanınmadı: YouTube canlı yayın ya da kanal bağlantısı olmalı.");
    putSources(srcList.map((x) => (x.id === sid ? { ...x, url: u } : x)));
  };
  const dropSrc = (sid) => {
    if (sel?.src === sid) setSel(null);
    putSources(srcList.filter((x) => x.id !== sid));
  };
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const { uploadForScreen } = await import("./broadcastStore");
      const meta = await uploadForScreen(orgId, id, f, live.starts, setBusy);
      setLive((l) => cleanLive({ ...l, media: [...l.media, meta] }));
      setBusy("");
      // yüklenen video hemen yayına alınmaz: önizlemede seçilir, hazır olunca "Ekrana al" (Seyhun 2026-11-03)
      setSel({ kind: "rec", mid: meta.id });
      toast("Video yüklendi, önizlemede");
    } catch (err) {
      toast(err?.message || "Yüklenemedi");
      setBusy("");
    }
  };
  const addObs = async (o) => {
    setAdd(null);
    const obs = cleanObs(o);
    setCourse((c) => cleanCourse({ ...c, obs: [...c.obs, obs] }));
    try {
      await addCourseObs(orgId, id, today, obs);
      toast(`${obsTitle(obs)} · ${obs.deg}°`);
    } catch {
      toast("Kaydedilemedi. İnterneti kontrol et.");
    }
  };

  // Hatalı ölçümü silme (Seyhun 2026-11-02 "hatalı bir giriş olursa onu silmem gerekiyor"): Ölçümler listesinde satır başına Sil
  const dropObs = async (o) => {
    const next = cleanCourse({ ...course, obs: course.obs.filter((x) => x.id !== o.id) });
    setCourse(next);
    try {
      await saveCourse(orgId, id, today, next);
      toast("Ölçüm silindi");
    } catch {
      toast("Silinemedi. İnterneti kontrol et.");
    }
  };
  // Parkur kartları (Seyhun 2026-11-02): varsayılan A seçili; Yeni kart seçilinin rotasıyla açılır; rota yazılıp kaydedilir.
  // Canlı ekran seçili kartın sahnesini gösterir (değişince 20 sn), Başlat o kartı yarışa yazar.
  const putCards = async (next, msg) => {
    const k = cleanCourse({ ...course, ...next });
    setCourse((c) => ({ ...c, cards: k.cards, sel: k.sel, by: k.by }));
    try {
      await saveCards(orgId, id, today, k);
      ensurePublic(id).catch(() => {});
      if (msg) toast(msg);
    } catch {
      toast("Kaydedilemedi. İnterneti kontrol et.");
    }
  };
  const pickCard = (cid) => cid !== course.sel && putCards({ sel: cid }, `Kart ${cid} seçildi`);
  const newCard = () => {
    const cid = CARD_IDS.find((x) => !course.cards.some((k) => k.id === x));
    if (!cid) return toast("En çok 8 kart.");
    putCards({ cards: [...course.cards, { id: cid, route: selCard(course).route, type: selCard(course).type }], sel: cid }, `Kart ${cid} açıldı, rotasını yaz`);
  };
  const dropCard = () => {
    if (course.cards.length < 2) return;
    const left = course.cards.filter((k) => k.id !== course.sel);
    putCards({ cards: left, sel: left[0].id }, `Kart ${course.sel} silindi`);
  };
  const setType = (t) => t !== selCard(course).type && putCards({ cards: course.cards.map((k) => (k.id === course.sel ? { ...k, type: t } : k)) }, `Kart ${course.sel}: ${CARD_TYPES[t]}`);
  const saveRoute = () => {
    const r = cleanRoute(rt);
    if (!r.length) return toast("Rota boş. Örn. 1 2 3 F");
    putCards({ cards: course.cards.map((k) => (k.id === course.sel ? { ...k, route: r } : k)) }, `Kart ${course.sel}: ${routeText(r)}`);
    setRt(routeText(r));
  };
  if (rtId !== course.sel) {
    setRtId(course.sel);
    setRt(routeText(selCard(course).route));
  }
  const vids = [...live.media].filter((m) => m.kind === "video" && m.url).reverse().slice(0, 6); // yalnız telefonda duran (ph) ekrana gidemez
  const srcOf = (sid) => srcList.find((x) => x.id === sid) || null;
  const selSrc = sel?.kind === "src" ? srcOf(sel.src) : null;
  // "Grubun kamerası" (kind live): ekrandaki yarışın grubuna bağlı kamera (Kameralar), yoksa Kamera 1
  const autoOn = Object.keys(L?.camBy || {}).length > 0;
  const onScreen = L?.screen.kind ? L.screen : null;
  if (L && !capInit) {
    setCapInit(true);
    setCap(L.screen.caption || "");
  }
  const capSave = async (text) => {
    setCap(text);
    try {
      await showOnScreen(orgId, id, { ...(L?.screen || { kind: "" }), caption: text });
      toast(text ? "Ekrana yazıldı" : "Yazı kaldırıldı");
      await reload();
    } catch {
      toast("Kaydedilemedi, tekrar dene.");
    }
  };
  // Elle yazı yoksa ekran kendiliğinden yazar (lib/raceCaption.js): Start, Son dakika, Tehir, Genel geri, Bireysel geri, Finiş
  const autoCap = autoCaption({ plan, starts: live.starts, timer: tr.t, rounds: L?.rounds || {}, now: capNow, today });
  const isOn = (k, mid = "") => onScreen?.kind === k && (k === "rec" ? onScreen.mid === mid : k === "src" ? onScreen.src === mid : true);
  const isSel = (k, mid = "") => sel?.kind === k && (k === "rec" ? sel.mid === mid : k === "src" ? sel.src === mid : true);
  const c = withLiveWind(course, live.wind, today);
  const wind = [...c.obs].reverse().find((x) => x.kind === "wind");
  const scene = (() => {
    try {
      return sceneSvg(cardOf(c), selCard(course).route, { W: 960, H: 540, pre: "yp", sea: true, sail: true });
    } catch {
      return "";
    }
  })();
  const st = (pickId && live.starts.find((x) => x.id === pickId)) || (L ? currentStart(live.starts, L.timer) : null);
  const entry = st && L ? L.rounds[st.id] : null;
  // startın grubu günün grup listesinde varsa ceza aramasında önce o grup (Seyhun 2026-11-02 "mavi grup listesini veririm")
  const dayGrp = st ? groupMap(groups[st.day]) : {};
  const penMembers = entry?.grp && Object.keys(dayGrp).length ? Object.keys(dayGrp).filter((s) => dayGrp[s] === entry.grp) : null;
  const penOf_ = entry?.pen || {};
  const todays = [...live.starts].filter((x) => x.day === today); // eskiden yeniye (listede 1., 2., …)
  const races = dayRaces({ starts: live.starts, order: plan.order, grpOf: (x) => x.grp || L?.rounds?.[x.id]?.grp || "", liveIds: cur ? [cur.id] : [], today, rdays });
  const nextRow = races.flatMap((r) => r.rows).find((x) => x.state === "next");
  const days = rdays?.length ? rdays : [today];
  const idle = tr.t.end == null && tr.t.left == null;
  const needRace = !!L && !nextRow && idle && plan.status !== "done";
  // Kurulum önce (Seyhun 2026-11-02 "önce sınıfları, sonra grupları seçelim; bir kere seçip kapatalım; sonra süre, program, video… gösterilsin")
  const needSetup = !!L && (setupOpen || !plan.sets.length);
  // Sıradaki startın bayrağı boşsa (genel geri / abandone sonrası tekrar) önce bayrak
  const needFlag = !!L && idle && !!nextPlan && !nextPlan.prep && plan.status !== "done";
  // Yarış bayrak sorulmadan oluşur (Seyhun 2026-11-03 "sınıf ve grup seçildikten sonra bayrak seçimi fazlalık; U seçili olsun"):
  // sıradaki yarış yoksa startları U bayrağıyla programa eklenir; bayrak her startın satırındaki karede değiştirilir
  const raceRef = useRef("");
  const autoKey = needRace && !needSetup ? `${today}/${live.starts.length}/${plan.order.length}` : "";
  useEffect(() => {
    if (!autoKey || raceRef.current === autoKey) return undefined;
    raceRef.current = autoKey;
    const add = raceOrder({ ...plan, prep: "U" });
    if (!add.length) return undefined;
    const t = setTimeout(() => changePlan({ prep: "U", order: [...plan.order, ...add] }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoKey]);
  // Seçim kareleri (Seyhun 2026-11-03 "sınıf, grup, bayrak yan yana kare butonlar, görselleriyle; hangisine tıklanırsa onu değiştirelim"):
  // üç kare seçili değeri gösterir (sınıf işareti grup renginde, grup rengi, bayrak resmi); dokununca yalnız o seçimin seçenekleri açılır
  const pickSquares = (val, set, keys = ["cls", "grp", "prep"]) => {
    const defs = { cls: ["Sınıf", CLASS_PICK], grp: ["Grup", GROUP_PICK], prep: ["Bayrak", PREP_PICK] };
    const art = (key, v, g) => (key === "cls" ? <ClsArt cls={v} grp={g} /> : key === "grp" ? <span className="block h-full w-full" style={{ background: groupColor(v) || "var(--chip)" }} /> : v ? <FlagArt p={v} /> : null);
    const open = keys.includes(pickKey) ? pickKey : "";
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          {keys.map((key) => (
            <button key={key} type="button" aria-expanded={open === key} onClick={() => setPickKey(open === key ? "" : key)} data-press className={`masa-sq${open === key ? " on" : ""}`}>
              <span className="art">{art(key, val[key], val.grp)}</span>
              <small>{val[key] ? (key === "prep" ? (val[key] === "Kara" ? "Kara" : val[key]) : val[key]) : defs[key][0]}</small>
            </button>
          ))}
        </div>
        {open ? (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {defs[open][1].map((g) => (
              <button key={g} type="button" aria-pressed={val[open] === g} onClick={() => (set(open, val[open] === g ? "" : g), setPickKey(""))} data-press className={`masa-sq sm${val[open] === g ? " sel" : ""}`}>
                <span className="art">{art(open, g, open === "cls" ? val.grp : val.grp)}</span>
                <small>{open === "prep" && g === "Kara" ? "Kara" : g}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };
  const legsDone = entry?.route?.length ? entry.route.filter((_, k) => (entry.legs[k] || []).length).length : 0;
  const tabInfo = [
    ["sure", "Süre", cur ? (Date.parse(cur.at) > capNow ? "Geri sayım" : "Yarışta") : plan.status === "ap" ? "Tehir" : plan.status === "done" ? "Gün bitti" : races.length ? `${races.length} yarış` : "Boş", !!cur],
    ["program", "Program", `${days.length} gün`, false],
    ["video", "Video", onScreen ? (onScreen.pause ? "Ara" : "Ekranda") : "Boş", !!onScreen && !onScreen.pause],
    ["parkur", "Parkur", (CARD_TYPES[selCard(course).type] || "").split(" ")[0], false],
    ["donus", "Dönüşler", entry?.route?.length ? `${legsDone}/${entry.route.length}` : entries.length ? `${entries.length} tekne` : "—", false],
  ];
  const monRec = onScreen?.kind === "rec" ? live.media.find((m) => m.id === onScreen.mid) : null;
  const pDay = days.includes(openDay) ? openDay : days.includes(planDay) ? planDay : days[0];
  const groupRows = plan.sets.flatMap((x) => (x.grps.length ? x.grps.map((g) => [x.cls, g]) : [[x.cls, ""]]));
  const row = "flex w-full items-center gap-3 px-4 py-3 text-left";
  // Yayında: bugün süren yarış var. İnce üst çubuk: yalnız sıradan durumlarda (kurulum, bayrak seçimi, tehir, geri düğmesi yokken)
  const anyLive = live.starts.some((x) => x.day === today && !x.fin && !x.void);
  const slim = !needSetup && !needRace && !needFlag && !(plan.status === "ap" || plan.warn) && !((made || retryPick) && idle);
  // Satır süreleri: sayacın yarışı geri sayımda (pembe) ya da startan beri (ileri sayar); öbür süren yarışlar start anından beri
  const nowS = Math.max(capNow, tr.running ? tr.now : 0);
  const cdRow = (sid) => !!cur && cur.id === sid && (tr.t.left != null || (tr.running && !tr.up));
  const upRow = (sid) => !!cur && cur.id === sid && tr.up;
  const pauseCd = () => writeTimer({ ...tr.t, end: null, left: Math.max(1, tr.rem), own: tr.t.own || ownHere() });
  const resumeCd = () => {
    audio();
    const end = Date.now() + (tr.t.left ?? tr.t.dur) * 1000;
    writeTimer({ ...tr.t, end, left: null, own: tr.t.own || ownHere() });
    flow.onShift(end, tr.t.rid);
  };
  const shiftCd = (end) => {
    writeTimer({ ...tr.t, end, own: tr.t.own || ownHere() });
    flow.onShift(end, tr.t.rid);
  };

  // Ekrandaki yarış: ▶ ile seçilen, yoksa en son başlayan (sunucu da böyle seçer, /api/canli onAirStart)
  const airStart = live.starts.find((x) => x.id === onAir && !x.void) || currentStart(live.starts.filter((x) => x.day === today), L?.timer);
  const airId = airStart?.id || "";
  const airE = airStart ? L?.rounds?.[airStart.id] || {} : {};
  const airCam = airStart ? srcs.find((c) => c.id === camOf(L?.camBy, airE.cls || "", airE.grp || airStart.grp || "")) : null;
  // Ekranda: canlıysa küçük oynatıcı (sessiz), kayıtsa küçük resmi; Önizleme: seçilen kaynak (yalnız burada)
  const airUrl = onScreen && onScreen.kind !== "rec" ? (onScreen.kind === "live" && airCam?.url ? airCam.url : screenUrl(onScreen, { ...L?.stream, sources: srcList })) : "";
  const monName = monRec ? recName(monRec, live.starts) : onScreen?.kind === "boats" ? "Tekneler · Canlı konum" : onScreen?.kind === "src" ? srcOf(onScreen.src)?.name || "Canlı" : onScreen?.kind === "live" ? airCam?.name || "Grubun kamerası" : onScreen?.kind === "drone" ? "Drone" : "Video";
  const pvRec = sel?.kind === "rec" ? live.media.find((m) => m.id === sel.mid) : null;
  const pvUrl = selSrc?.url || (sel?.kind === "live" ? airCam?.url || L?.stream.url || "" : "");
  const pvName = selSrc?.name || (sel?.kind === "live" ? "Grubun kamerası" : sel?.kind === "boats" ? "Tekneler" : pvRec ? recName(pvRec, live.starts) : "");
  const takeOk = !!sel && (sel.kind === "rec" || sel.kind === "boats" || !!ytEmbed(pvUrl));
  const nLive = srcList.filter((x) => stat[x.url]?.live).length;
  // satırdan başlatma: geri sayım sürmüyor, tehir yok, gün bitmedi
  const canRow = plan.status !== "ap" && plan.status !== "done" && tr.t.left == null && !(cur && Date.parse(cur.at) > capNow);
  const grpName = (k) => { const [c, g] = k.split("|"); return g || c; };

  return (
    <main className="masa mx-auto max-w-[30rem] px-5 pb-[calc(env(safe-area-inset-bottom)+7rem)]">
      <section className={`ck -mx-5 px-5 ${slim ? "pb-2" : "pb-9"} pt-[calc(0.75rem+env(safe-area-inset-top))]`} aria-label="Yayın">
        {/* Ince üst çubuk (Seyhun 2026-11-03 yonetim/ornek-A): geri, yarış adı, Yayında, ⋯; büyük sayaç kalktı, süre her grubun satırında */}
        <header className="flex items-center gap-2.5">
          <BackButton href={`/athletes/races/${id}`} />
          <h1 className="min-w-0 flex-1 truncate text-[1.125rem] font-bold tracking-[-.01em]">{race?.name || "Yayın"}</h1>
          {anyLive ? (
            <span className="masa-live">
              <i aria-hidden="true" />
              Yayında
            </span>
          ) : null}
          <button type="button" onClick={() => setMenu(true)} aria-label="Diğer işler" data-press className="ck-glass flex size-9 shrink-0 items-center justify-center rounded-full text-[1.25rem] font-bold leading-none">
            ⋯
          </button>
        </header>
        {/* Sıradaki start Başlat düğmesinin içinde yazar ("Başlat · Optimist · Mavi" / "Başlat · Start seçilmedi"); start sonrası sayacın
            başlığında sınıf · grup · yarış (Seyhun 2026-11-02 "yukarıdaki yazıyı kaldıralım") */}
        {/* Önce yarış, sonra süre (Seyhun 2026-11-02 "süreyi göstermeden ne için olduğunu seçmemiz lazım"): sıradaki yarış yoksa ve sayaç
            boştaysa sayaç yerine yarış oluşturma (sınıf, gruplar, bayrak); oluşturulunca sayaç "Başlat · 1. yarış Sarı" ile açılır */}
        {/* Tehir takibi: AP çekili (iniş saati ve kalan, belirsizse "Tehiri indir") ya da indi (uyarı işaretine kalan; geri sayım kendiliğinden) */}
        {!needSetup && (plan.status === "ap" || plan.warn) ? (
          // İki satır (Seyhun 2026-11-03 "yazılar kayıyor"): üstte bayrak, başlık ve kalan süre; altta yer · sebep ve geri sayım seçimi
          <div className="ck-glass mt-4 rounded-[1rem] px-3.5 py-3">
            <div className="flex items-center gap-3">
              <span className="h-6 w-9 shrink-0 rounded-[3px] bg-[repeating-linear-gradient(90deg,#e11d48_0_20%,#fff_20%_40%)]" aria-hidden="true" />
              <b className="min-w-0 flex-1 truncate text-[1rem] font-semibold">{plan.status === "ap" ? (plan.ap?.down ? `Tehir · iniş ${trHm(plan.ap.down)}` : "Tehir · belirsiz") : "Tehir indi"}</b>
              {plan.status === "ap" && plan.ap?.down ? <b className="shrink-0 text-[1.375rem] font-bold tabular-nums">{mmss(Math.max(0, Math.ceil((Date.parse(plan.ap.down) - (tick || capNow)) / 1000)))}</b> : null}
              {plan.status !== "ap" && plan.warn ? <b className="shrink-0 text-[1.375rem] font-bold tabular-nums">{mmss(Math.max(0, Math.ceil((Date.parse(plan.warn) - (tick || capNow)) / 1000)))}</b> : null}
              {plan.status !== "ap" && plan.warn ? (
                <button type="button" onClick={() => changePlan({ warn: "" })} className="shrink-0 text-[0.875rem] font-semibold text-white/70">
                  Bekle
                </button>
              ) : null}
            </div>
            <div className="mt-1.5 flex items-center gap-2 pl-12">
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-white/65">
                {plan.status === "ap" ? [plan.ap?.land ? "Karada" : "Denizde", plan.ap?.why].filter(Boolean).join(" · ") : plan.order.length ? "Uyarı işaretinde geri sayım kendiliğinden başlar" : "Önce yarışı oluştur"}
              </span>
              {/* İnince geri sayım kendiliğinden mi (Seyhun 2026-11-03 seçilebilir); tehir çekiliyken de değiştirilir */}
              {plan.status === "ap" && !plan.ap?.land ? (
                <button type="button" aria-pressed={!!plan.ap?.auto} onClick={() => changePlan({ ap: { ...plan.ap, auto: !plan.ap?.auto } })} className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${plan.ap?.auto ? "bg-acc text-white" : "bg-white/15 text-white/80"}`}>
                  {plan.ap?.auto ? "İnince 1 dk sonra geri sayım" : "Geri sayımı sen başlatırsın"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {needSetup ? (
          <Setup sets={plan.sets} onSave={saveSetup} onCancel={plan.sets.length ? () => setSetupOpen(false) : null} />
        ) : needFlag ? (
          <FlagPick no={nextRow?.n || 1} again={!!nextRow?.retry} sets={[{ cls: nextPlan.cls, grps: nextPlan.grp ? [nextPlan.grp] : [] }]} value="" onPick={(g) => (editRow(0, { prep: g }), setRetryPick(true))} />
        ) : (
          <>
          {(made || retryPick) && idle ? (
            <button type="button" onClick={undoRace} data-press className="ck-glass mt-3 flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.875rem] font-semibold">
              <span aria-hidden="true">‹</span>
              {`Geri · ${prepName(nextPlan?.prep || plan.prep) || "Bayrak"}`}
            </button>
          ) : null}
          </>
        )}
      </section>

      <div className={`relative -mx-5 space-y-6 bg-bg px-5 pb-1 ${slim ? "pt-2" : "-mt-6 rounded-t-[1.75rem] pt-5"}`}>
        {/* Yayın masası (Seyhun 2026-11-02, masa/B-koyu-masa.png): sekmeler tek kartta, altında kısa durum; iş düğmeleri altta sabit */}
        {needSetup ? null : <MasaTabs value={tab} onChange={setTab} tabs={tabInfo} />}
        {!needSetup && tab === "sure" ? (
          <>
        {/* Bugün (Seyhun 2026-11-02 tasarım yayin-tasarim/startlar/startlar-yeni.png): gruplar yarış oluşturulurken seçilir (üstte); liste yarış
            yarış, her yarışın altında grupları ve tek durum (Bitti · Yarışta · Abandone, Sıradaki, Bekliyor). "+ Yarış" sıradaki yarışı
            bütün gruplarıyla ekler. Biten yarış tek satıra kapanır (dokununca açılır). */}
        {/* Turuncu bayrak (Seyhun 2026-11-02): çekilince canlı ekran "Start öncesi"ne geçer (videoluda soldaki şeritte bayrak, uyarıya kalan süre, hattaki rüzgâr) */}
        {/* Ekranda (Seyhun 2026-11-02 gruplar-kamera/grup-a.png): canlı ekranın gösterdiği yarış ve kamerası; ▶ ile seçildiyse "Otomatik" en son başlayana döner */}
        {airStart ? (
          <div className="masa-onair flex items-center gap-3 rounded-[1.125rem] px-3.5 py-3">
            <span className="masa-onair-tag">Ekranda</span>
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(airE.grp || airStart.grp || "") }} aria-hidden="true" />
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block truncate font-semibold">{[airE.grp || airStart.grp || airE.cls, `${airStart.n}. yarış`].filter(Boolean).join(" · ")}</b>
              <span className="block truncate text-[0.8125rem] text-mut">{[airCam?.name, airStart.void ? airStart.void : airStart.fin ? "Bitti" : Date.parse(airStart.at) > capNow ? "Geri sayım" : "Yarışta"].filter(Boolean).join(" · ")}</span>
            </span>
            {onAir ? (
              <Button size="sm" variant="secondary" full={false} onClick={() => putOnAir(onAir)}>
                Otomatik
              </Button>
            ) : null}
          </div>
        ) : null}
        {plan.status !== "done" ? (
          <button type="button" data-press onClick={() => changePlan({ orange: orangeUp(plan, today) ? "" : new Date().toISOString() })} aria-pressed={orangeUp(plan, today)} className={`${card} ${row} rounded-[1.125rem]`}>
            <span className="h-4 w-6 shrink-0 rounded-[2px] bg-[#ff7a1a]" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-semibold">Turuncu bayrak</span>
            <span className={`text-[0.875rem] font-semibold ${orangeUp(plan, today) ? "text-[#ff9a4d]" : "text-mut"}`}>{orangeUp(plan, today) ? `Çekili · ${hm(plan.orange)}` : "İnik"}</span>
            <span className={`masa-sw${orangeUp(plan, today) ? " on" : ""}`} aria-hidden="true" />
          </button>
        ) : null}
        <section>
          <Head title="Bugün" right={plan.status === "done" ? "Gün bitti" : plan.status === "none" ? "Bugün yarış yok" : plan.status === "ap" ? "Start ertelendi" : [races.length ? `${races.length} yarış` : "", plan.at ? `İlk start ${plan.at}` : ""].filter(Boolean).join(" · ")} />
          <div className={`${card} overflow-hidden`}>
            {races.map((r) => {
              const open = r.state !== "done" || openN === r.n;
              return (
                <div key={r.n} className="border-b border-line">
                  <button type="button" onClick={() => r.state === "done" && setOpenN(openN === r.n ? 0 : r.n)} className="flex w-full items-center px-4 pb-1 pt-2.5 text-left text-[0.8125rem] font-bold tracking-[0.02em] text-mut">
                    <span className="flex-1">{r.n}. YARIŞ</span>
                    <span>{r.state === "done" ? "Bitti" : r.state === "live" ? "Sürüyor" : ""}</span>
                  </button>
                  {open
                    ? r.rows.map((x) => {
                        const s = x.start;
                        const e = s ? L?.rounds?.[s.id] || {} : x.plan;
                        const isOpen = s ? pickId === s.id : editI === x.i;
                        const live = x.state === "live";
                        const isCd = !!s && cdRow(s.id);
                        const isUp = !!s && upRow(s.id);
                        const paused = isCd && tr.t.left != null;
                        const prepTxt = prepName(e?.prep) || "";
                        // Her satırın süresi ve durumu (Seyhun 2026-11-03: gruplar ayrı, süre kendi satırında)
                        const sub =
                          x.state === "done" ? `Bitti · start ${hm(s.at)}`
                          : x.state === "void" ? `${s.void} · ${hm(s.fin || s.at)}`
                          : isCd ? [paused ? "Durdu" : "Geri sayım", prepTxt].filter(Boolean).join(" · ")
                          : live ? `Yarışta · start ${hm(s.at)}`
                          : x.state === "next" ? ["Sıradaki", prepTxt].filter(Boolean).join(" · ") : "Bekliyor";
                        const time =
                          x.state === "done" ? raceTime(s)
                          : isCd ? mmss(Math.max(0, paused ? tr.t.left : tr.rem))
                          : isUp ? mmss(upSec(tr.t.end, tr.now))
                          : live ? mmss(Math.max(0, Math.floor((nowS - Date.parse(s.at)) / 1000)))
                          : "";
                        const finish = () => change((l) => { const next = finishRace(l.starts, s.id, Date.now(), rdays); saveStarts(orgId, id, next).catch(() => {}); return { starts: next }; });
                        return (
                          <div key={x.key} className={live || x.state === "next" ? "bg-accbg" : ""}>
                            <div className="flex items-center gap-2 pl-2.5 pr-3">
                              {/* ▶ ekrana al (pembe = ekranda); bekleyen startın yerinde boşluk */}
                              {s && x.state !== "void" ? (
                                <button type="button" aria-pressed={airId === s.id} aria-label={`${x.grp || e?.cls || "Start"} ekrana`} onClick={() => putOnAir(s.id)} data-press className={`masa-air${airId === s.id ? " on" : ""}`}>
                                  <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 2l5 3-5 3z" fill="currentColor" /></svg>
                                </button>
                              ) : (
                                <span className="masa-air off" aria-hidden="true" />
                              )}
                              <button type="button" onClick={() => (s ? (setEditI(-1), setPickId(isOpen ? "" : s.id)) : (setPickId(""), setEditI(isOpen ? -1 : x.i)))} className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left">
                                <span className="size-2.5 shrink-0 rounded-full" style={{ background: x.grp ? groupColor(x.grp) : "var(--mut)" }} aria-hidden="true" />
                                <span className="min-w-0 flex-1 leading-tight">
                                  <b className={`block truncate font-semibold ${x.state === "void" ? "text-mut line-through" : ""}`}>{[x.grp || e?.cls || "Start", x.retry ? "tekrar" : ""].filter(Boolean).join(" · ")}</b>
                                  <span className={`block truncate text-[0.8125rem] ${x.state === "void" ? "text-warn" : "text-mut"}`}>{sub}</span>
                                </span>
                                {time ? <span className={`shrink-0 text-[1.25rem] font-bold tabular-nums ${isCd ? "text-acc" : x.state === "done" ? "text-ok" : ""}`}>{time}</span> : null}
                              </button>
                              {isCd ? (
                                <Button size="sm" variant="secondary" full={false} onClick={paused ? resumeCd : pauseCd}>
                                  {paused ? "Devam" : "Dur"}
                                </Button>
                              ) : isUp ? (
                                <Button size="sm" variant="secondary" full={false} onClick={() => raceFinish(flow)}>
                                  Bitti
                                </Button>
                              ) : live ? (
                                <Button size="sm" variant="secondary" full={false} onClick={finish}>
                                  Bitti
                                </Button>
                              ) : null}
                              {!s && canRow && x.state !== "next" ? (
                                <Button size="sm" variant="secondary" full={false} onClick={() => startRow(x.i)}>
                                  Başlat
                                </Button>
                              ) : null}
                            </div>
                            {!s && canRow && x.state === "next" ? (
                              // Sıradaki grup: süre seçimi ve Başlat (5 · 4 · 2 · 1 dk; son seçilen bu telefonda kalır)
                              <div className="flex items-center gap-1.5 pb-2.5 pl-[3.4rem] pr-3">
                                {[300, 240, 120, 60].map((d) => (
                                  <button key={d} type="button" aria-pressed={tr.t.dur === d} onClick={() => chooseDur(d)} className={`h-8 min-w-[2.6rem] rounded-[0.625rem] px-2 text-[0.8125rem] font-bold tabular-nums ${tr.t.dur === d ? "bg-white text-[#0b1322]" : "bg-chip text-fg2"}`}>
                                    {d / 60}
                                  </button>
                                ))}
                                <span className="text-[0.8125rem] text-mut">dk</span>
                                <Button size="sm" full={false} className="ml-auto" onClick={() => startRow(x.i)}>
                                  Başlat
                                </Button>
                              </div>
                            ) : null}
                            {isOpen && s ? (
                              // Biten yarışın sınıfı / grubu / bayrağı düzeltilir; aynı anda iki yarışta sayacın olmayanı buradan biter
                              <div className="space-y-2 px-4 pb-2.5">
                                {pickSquares(e, (k, v) => setPickOf(s.id, { [k]: v }))}
                                {isCd || isUp ? (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {isCd && !paused ? (
                                      <>
                                        <Button variant="secondary" size="sm" full={false} disabled={tr.rem <= 60} onClick={() => shiftCd(tr.t.end - 60000)}>
                                          −1 dk
                                        </Button>
                                        <Button variant="secondary" size="sm" full={false} onClick={() => shiftCd(Date.now() + Math.round(tr.rem / 60) * 60000)}>
                                          Eşitle
                                        </Button>
                                        <Button variant="secondary" size="sm" full={false} onClick={() => shiftCd(tr.t.end + 60000)}>
                                          +1 dk
                                        </Button>
                                      </>
                                    ) : null}
                                    <Button variant="secondary" size="sm" full={false} className="ml-auto" onClick={() => (isCd ? raceCancel(flow) : raceVoid(flow))}>
                                      {isCd ? "İptal" : "Abandone"}
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                            {isOpen && !s ? (
                              <div className="space-y-2 px-4 pb-2.5">
                                {pickSquares(e, (k, v) => editRow(x.i, { [k]: v }))}
                                <div className="flex gap-2 pt-1">
                                  <Button variant="secondary" size="sm" onClick={() => (setEditI(-1), changePlan({ order: plan.order.filter((_, k) => k !== x.i) }))}>
                                    Çıkar
                                  </Button>
                                  <Button size="sm" className="ml-auto" onClick={() => setEditI(-1)}>
                                    Tamam
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    : null}
                </div>
              );
            })}
            {plan.status === "ap" ? <p className="border-b border-line px-4 py-2.5 text-[0.875rem] font-semibold text-warn">{apText(plan)}</p> : null}
          </div>
        </section>
        {/* Kameralar: her kaynağın çektiği gruplar (bir kez seçilir); grup ekrana alınınca canlı görüntü o grubun kamerasına geçer */}
        <section>
          <Head title="Kameralar" />
          <div className={`${card} divide-y divide-line overflow-hidden`}>
            {srcs.map((c) => {
              const gs = groupsOf(L?.camBy, c.id);
              return (
                <button key={c.id} type="button" onClick={() => (setCamPick(gs), setCamOpen(c.id))} className={row}>
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block truncate font-semibold">{c.name}</b>
                    <span className="block truncate text-[0.8125rem] text-mut">{gs.length ? gs.map(grpName).join(" · ") : "Grup yok"}</span>
                  </span>
                  <span className={`masa-pill${c.url ? " on" : ""}`}>{c.url ? "Yayında" : "Yayın yok"}</span>
                </button>
              );
            })}
          </div>
        </section>
        <MasaBar>
              <Button variant="secondary" onClick={addRace}>
                + Yarış
              </Button>
              <Button variant={plan.status === "ap" ? "primary" : "secondary"} onClick={() => (plan.status === "ap" ? lowerAp() : openAp())}>
                {plan.status === "ap" ? "Tehiri indir" : "Tehir"}
              </Button>
              {plan.status === "done" ? null : (
                <Button variant="secondary" onClick={() => (askEnd ? (setAskEnd(false), changePlan({ day: planDay, status: "done", orange: "", next: plan.next || { day: tomorrow, at: dayTime(plan, tomorrow) || plan.at } })) : setAskEnd(true))}>
                  {askEnd ? "Emin misin?" : "Günü bitir"}
                </Button>
              )}
            </MasaBar>
          </>
        ) : null}
        {!needSetup && tab === "program" ? (
          <>
        {/* Program (Seyhun 2026-11-02): günler yan yana kutular, seçili günün ilk start saati, startları (Sil) ve bekleyenleri (Çıkar) altta;
            Her gün saatleri; "Programı ekle" altta sabit (fotoğraf, PDF ya da yazı → yapay zekâ) */}
        {impOpen ? (
        <ProgramImport
              ctx={{ today, race: [race?.name, race?.place].filter(Boolean).join(" · ") }}
            onApply={async (days) => {
              const pp = programPatch(days, plan);
              if (!pp) return toast("Programda yarış günü yok.");
              changePlan({ ...pp.plan, ...(plan.status !== "ap" && plan.status !== "done" ? { at: pp.plan.times[planDay] || pp.plan.daily } : {}) });
              if (race && (race.startDate !== pp.startDate || race.endDate !== pp.endDate)) {
                setRace((r) => ({ ...r, startDate: pp.startDate, endDate: pp.endDate }));
                await saveRaceDates(orgId, id, pp).catch(() => toast("Yarış tarihleri kaydedilemedi."));
              }
              toast("Program yazıldı");
              setImpOpen(false);
            }}
          />
        ) : null}
        <div className="masa-days">
          {days.map((d, k) => {
            const ds = live.starts.filter((x) => x.day === d);
            const nRaces = new Set(ds.filter((x) => !x.void).map((x) => x.n)).size;
            const off = plan.off.includes(d);
            return (
              <button key={d} type="button" aria-pressed={pDay === d} onClick={() => (setDelId(""), setOpenDay(d))} className={`masa-day${off ? " off" : ""}`}>
                <small>{`${k + 1}. GÜN`}</small>
                <b>{dayLong(d)}</b>
                <span>{off ? "Yarış yok" : [d === today ? "Bugün" : "", dayTime(plan, d) || "--:--", nRaces ? `${nRaces} yarış` : ""].filter(Boolean).join(" · ")}</span>
              </button>
            );
          })}
        </div>
        {(() => {
          const d = pDay;
          const ds = live.starts.filter((x) => x.day === d);
          const off = plan.off.includes(d);
          const pend = d === planDay ? races.flatMap((r) => r.rows).filter((x) => !x.start) : [];
          return (
            <section>
              <Head title={dayLong(d)} right={off ? "Yarış yok" : ds.length + pend.length ? `${ds.length + pend.length} start` : ""} />
              <div className={`${card} overflow-hidden`}>
                    <div>
                      <div className={`${row} border-b border-line`}>
                        <span className="flex-1 font-semibold">İlk start</span>
                        <input type="time" value={plan.times[d] || plan.daily} onChange={(e) => setDayTime(d, e.target.value)} aria-label="Bu günün ilk start saati" className="h-9 rounded-lg bg-[var(--chip)] px-2 text-[0.9375rem] font-semibold tabular-nums outline-none" />
                      </div>
                      {/* Programdan okunan maddeler (antrenör toplantısı, ilk start, son start saati…); canlı ekranda Program'da görünür */}
                      {(plan.agenda?.[d] || []).map((x, i) => (
                        <div key={`ag${i}`} className={`${row} border-b border-line`}>
                          <span className="w-12 shrink-0 text-[0.875rem] font-semibold tabular-nums text-mut">{x.at || "—"}</span>
                          <span className="min-w-0 flex-1 truncate font-semibold">{x.text}</span>
                        </div>
                      ))}
                      {ds.map((x) => {
                        const g = x.grp || L?.rounds?.[x.id]?.grp || "";
                        const ask = delId === x.id;
                        return (
                          <div key={x.id} className={`${row} border-b border-line`}>
                            {g ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(g) }} aria-hidden="true" /> : null}
                            <span className={`min-w-0 flex-1 truncate font-semibold ${x.void ? "text-mut" : ""}`}>{[raceTitle(x), g].filter(Boolean).join(" · ")}</span>
                            <span className="shrink-0 text-[0.875rem] tabular-nums text-mut">{[hm(x.at), cur?.id === x.id ? "Sürüyor" : x.fin && !x.void ? raceTime(x) : ""].filter(Boolean).join(" · ")}</span>
                            {cur?.id === x.id ? null : (
                              <Button size="sm" variant={ask ? "danger" : "secondary"} onClick={() => (ask ? dropStart(x.id) : setDelId(x.id))}>
                                {ask ? "Emin misin?" : "Sil"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      {pend.map((x) => (
                        <div key={x.key} className={`${row} border-b border-line`}>
                          {x.grp ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(x.grp) }} aria-hidden="true" /> : null}
                          <span className="min-w-0 flex-1 truncate font-semibold">{[`${x.n}. yarış`, x.grp].filter(Boolean).join(" · ")}</span>
                          <span className="shrink-0 text-[0.875rem] text-mut">{x.state === "next" ? "Sıradaki" : "Bekliyor"}</span>
                          <Button size="sm" variant="secondary" onClick={() => changePlan({ order: plan.order.filter((_, k2) => k2 !== x.i) })}>
                            Çıkar
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2 p-3">
                        <Button variant="secondary" className="flex-1" onClick={() => toggleOff(d)}>
                          {off ? "Yarış var" : "Bu gün yarış yok"}
                        </Button>
                        {pend.length > 1 ? (
                          <Button variant="secondary" className="flex-1" onClick={() => changePlan({ order: [] })}>
                            Bekleyenleri çıkar
                          </Button>
                        ) : null}
                      </div>
                    </div>
              </div>
            </section>
          );
        })()}
        <section>
          <Head title="Her gün" />
          <div className={`${card} overflow-hidden`}>
            <div className={`${row} border-b border-line`}>
              <span className="flex-1 font-semibold">İlk start</span>
              <input type="time" value={plan.daily} onChange={(e) => setDaily(e.target.value)} aria-label="Her günün ilk start saati" className="h-9 rounded-lg bg-[var(--chip)] px-2 text-[0.9375rem] font-semibold tabular-nums outline-none" />
            </div>
            <div className={row}>
              <span className="flex-1 font-semibold">Ekran yeni güne geçer</span>
              <input type="time" value={plan.showAt} onChange={(e) => changePlan({ showAt: e.target.value })} aria-label="Ekranın yeni güne geçeceği saat" className="h-9 rounded-lg bg-[var(--chip)] px-2 text-[0.9375rem] font-semibold tabular-nums outline-none" />
            </div>
          </div>
        </section>
        <MasaBar>
          <Button variant={impOpen ? "secondary" : "primary"} onClick={() => setImpOpen((v) => !v)}>
            {impOpen ? "Kapat" : "Programı ekle"}
          </Button>
        </MasaBar>
          </>
        ) : null}
        {!needSetup && tab === "video" ? (
          <>
        {/* Video (Seyhun 2026-11-02 "önce ben göreyim, sonra ekrana alayım"; örnek drone-yayin/coklu onaylandı): solda Önizleme (yalnız burada),
            sağda Ekranda (izleyicinin gördüğü); altta canlı kaynaklar (Drone 1-3, telefon, kamera; Yayında göstergesi), sonra kayıtlar */}
        <section>
          <div className="masa-mons">
            <div className="masa-mon pv">
              {sel?.kind === "boats" ? <BoatLive grp={airE.grp || airStart?.grp || ""} /> : pvUrl && ytEmbed(pvUrl) ? <iframe key={pvUrl} src={ytSrc(pvUrl)} title="Önizleme" allow="autoplay; encrypted-media" /> : pvRec?.thumb ? <img src={pvRec.thumb} alt="" /> : <div className="mid">{sel ? "Bağlantı yok" : "Kaynak seç"}</div>}
              <span className="lb">ÖNİZLEME</span>
              {pvName ? <span className="sn">{pvName}</span> : null}
            </div>
          </div>
          {/* Tek önizleme (Seyhun 2026-11-03 yonetim/ornek-A: video alanı sade); ekrandaki ne olduğu tek satır */}
          <p className="truncate px-1 pt-2 text-[0.8125rem] font-semibold text-mut">
            {`Ekranda: ${onScreen ? (onScreen.pause ? `${monName} · ara verildi` : monName) : "boş"}`}
          </p>
        </section>
        <section>
          <Head title="Canlı kaynaklar" right={nLive ? `${nLive} yayında` : ""} />
          <div className={`${card} overflow-hidden`}>
            <div className="masa-srcs">
              {autoOn ? (
                <button type="button" onClick={() => setSel({ kind: "live" })} className={`masa-src${isSel("live") ? " pv" : ""}${isOn("live") ? " pg" : ""}`}>
                  <span className="th">
                    {ytThumb(airCam?.url, stat[airCam?.url]?.vid) ? <img src={ytThumb(airCam?.url, stat[airCam?.url]?.vid)} alt="" /> : <span className="no">Gruba göre</span>}
                    {isOn("live") ? <em className="tg pg">EKRANDA</em> : isSel("live") ? <em className="tg pv">ÖNİZLEME</em> : null}
                  </span>
                  <span className="nm">
                    <b>Grubun kamerası</b>
                    <span className="st">{airCam?.name || ""}</span>
                  </span>
                </button>
              ) : null}
              {srcList.map((x) => {
                const st = stat[x.url];
                const th = ytThumb(x.url, st?.vid);
                return (
                  <button key={x.id} type="button" onClick={() => setSel({ kind: "src", src: x.id })} className={`masa-src${isSel("src", x.id) ? " pv" : ""}${isOn("src", x.id) ? " pg" : ""}`}>
                    <span className="th">
                      {th && st?.live !== false ? <img src={th} alt="" /> : <span className="no">{x.url ? "Yayın yok" : "Bağlantı yok"}</span>}
                      {isOn("src", x.id) ? <em className="tg pg">EKRANDA</em> : isSel("src", x.id) ? <em className="tg pv">ÖNİZLEME</em> : null}
                    </span>
                    <span className="nm">
                      <b>{x.name}</b>
                      {x.url ? <span className={`st${st?.live ? " on" : ""}`}>{st?.live ? <i /> : null}{st?.live ? "Yayında" : st?.live === false ? "Yayın yok" : ""}</span> : null}
                    </span>
                  </button>
                );
              })}
              {srcList.length < 8 ? (
                <button type="button" onClick={() => setAddOpen(true)} className="masa-src">
                  <span className="th">
                    <span className="no plus">+ Kaynak</span>
                  </span>
                  <span className="nm">
                    <b className="text-mut">Drone, telefon, kamera</b>
                  </span>
                </button>
              ) : null}
            </div>
            {selSrc ? (
              <div className="border-t border-line px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <input
                    key={selSrc.id}
                    defaultValue={selSrc.url}
                    onBlur={(e) => e.target.value.trim() !== selSrc.url && putSrc(selSrc.id, { url: e.target.value })}
                    placeholder={`${selSrc.name} · YouTube bağlantısı`}
                    inputMode="url"
                    className="h-10 w-full min-w-0 flex-1 rounded-[0.6875rem] bg-[var(--chip)] px-3 text-[0.875rem] outline-none"
                  />
                  <button type="button" onClick={() => setHowOpen(true)} className="h-10 shrink-0 rounded-[0.6875rem] bg-[var(--chip)] px-3 text-[0.8125rem] font-semibold">
                    Nasıl bağlanır
                  </button>
                </div>
                <div className="flex items-center pt-2 text-[0.8125rem]">
                  <span className="min-w-0 flex-1 truncate text-mut">{selSrc.url && !ytEmbed(selSrc.url) ? "Bağlantı tanınmadı" : ""}</span>
                  {isOn("src", selSrc.id) ? null : (
                    <button type="button" onClick={() => dropSrc(selSrc.id)} className="font-semibold text-rec">
                      Kaynağı sil
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        <section>
          <Head title="Kayıtlar" />
          <div className={`${card} overflow-hidden`}>
            <div className="masa-tiles">
              {vids.map((m) => (
                <button key={m.id} type="button" aria-pressed={isSel("rec", m.id)} onClick={() => setSel({ kind: "rec", mid: m.id })} className="masa-tile">
                  <span className="th">
                    {m.thumb ? <img src={m.thumb} alt="" /> : null}
                    {m.dur ? <em>{mmss(m.dur)}</em> : null}
                  </span>
                  <b>{isOn("rec", m.id) ? `Ekranda · ${recName(m, live.starts)}` : recName(m, live.starts)}</b>
                </button>
              ))}
              {/* Canlı tekne konumları (Seyhun 2026-11-03 "video yerine bunu da seçebilmeliyim; gruba göre otomatik"; replay değil, o ayrı yapılacak): ekrandaki yarışın grubu */}
              <button type="button" aria-pressed={isSel("boats")} onClick={() => setSel({ kind: "boats" })} className="masa-tile">
                <span className="th">Canlı konum</span>
                <b>{isOn("boats") ? "Ekranda · Tekneler" : "Tekneler"}</b>
              </button>
              <button type="button" disabled={!!busy} onClick={() => file.current?.click()} className="masa-tile">
                <span className="th">{busy && busy !== "x" ? busy : "+ Video"}</span>
                <b>Telefondan</b>
              </button>
            </div>
            <input ref={file} type="file" accept="video/*" className="hidden" onChange={pick} />
          </div>
        </section>
        <section>
          <div className={`${card} overflow-hidden`}>
            <button type="button" onClick={() => setVOpen(vOpen === "cap" ? "" : "cap")} aria-expanded={vOpen === "cap"} className={row}>
              <span className="min-w-0 flex-1 font-semibold">Ekranda yazı</span>
              <span className="min-w-0 max-w-[60%] truncate text-[0.875rem] text-mut">{cap ? "Elle" : autoCap.text ? `Otomatik · ${autoCap.text}` : "Otomatik"}</span>
              <span className="text-mut" aria-hidden="true">{vOpen === "cap" ? "⌃" : "›"}</span>
            </button>
            {vOpen === "cap" ? (
              <div className="border-t border-line">
            <div className="flex items-center gap-2 px-4 py-3">
              <input value={cap} onChange={(e) => setCap(e.target.value.slice(0, 80))} onBlur={() => cap !== (L?.screen.caption || "") && capSave(cap.trim())} placeholder={autoCap.text ? `Otomatik: ${autoCap.text}` : "Boşken kendiliğinden yazar"} className="min-w-0 flex-1 rounded-lg bg-bg px-2.5 py-1.5 text-[0.9375rem] font-semibold outline-none" />
              {cap ? (
                <button type="button" onClick={() => capSave("")} className="text-[0.875rem] font-semibold text-rec">
                  Kaldır
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              {CAP_PICKS.map((t) => (
                  <button key={t} type="button" onClick={() => capSave(t)} className={`h-8 rounded-full px-3 text-[0.8125rem] font-medium active:scale-95 ${cap === t ? "bg-acc text-white" : "bg-line/60"}`}>
                    {t}
                  </button>
                ))}
            </div>

              </div>
            ) : null}
          </div>
        </section>
        {/* Ekranda gösterim (Seyhun 2026-11-02 "otomatik starttan önce; starttan sonra manuel; starttan önce de manuel"):
            Otomatik = yarış öncesi dakikada bir parkur → rüzgâr → program; Parkur / Rüzgâr / Program elle açılır, kaldırılana kadar
            ekranda kalır (yarış öncesi, sırasında, sonrasında); Video sekmesinde (Seyhun 2026-11-02 "video sekmesine alalım") */}
        <section>
          <div className={`${card} overflow-hidden`}>
            <button type="button" onClick={() => setVOpen(vOpen === "show" ? "" : "show")} aria-expanded={vOpen === "show"} className={row}>
              <span className="min-w-0 flex-1 font-semibold">Ekranda göster</span>
              <span className="min-w-0 max-w-[60%] truncate text-[0.875rem] text-mut">{cShow.one ? `${SHOW_NAME[cShow.one]} ekranda` : cShow.auto ? "Otomatik" : "Kapalı"}</span>
              <span className="text-mut" aria-hidden="true">{vOpen === "show" ? "⌃" : "›"}</span>
            </button>
            {vOpen === "show" ? (
              <div className="border-t border-line">
            <div className="grid grid-cols-3 gap-2 p-3">
              {Object.entries(SHOW_NAME).map(([k, t]) => (
                <button key={k} type="button" data-press aria-pressed={cShow.one === k} className="masa-tog" onClick={() => putCourseShow({ ...cShow, one: cShow.one === k ? "" : k })}>
                  {t}
                  <small>{cShow.one === k ? "Ekranda" : "Kapalı"}</small>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => putCourseShow({ ...cShow, auto: !cShow.auto })} className={`${row} border-t border-line`} aria-pressed={cShow.auto}>
              <span className="min-w-0 flex-1 font-semibold">Starttan önce otomatik</span>
              <span className={`masa-sw${cShow.auto ? " on" : ""}`} aria-hidden="true" />
            </button>
            {/* Videolu yarış öncesi ekranda soldaki bilgi şeridi (Seyhun 2026-11-02 "istersem kaldırabilmeliyim") */}
            <button type="button" onClick={() => putCourseShow({ ...cShow, side: !cShow.side })} className={`${row} border-t border-line`} aria-pressed={cShow.side}>
              <span className="min-w-0 flex-1 font-semibold">Sol bilgi (videoluyken)</span>
              <span className={`masa-sw${cShow.side ? " on" : ""}`} aria-hidden="true" />
            </button>
            {/* Yarışta sağdaki genel sıralama (Seyhun 2026-11-02 "göster ya da kaldır"); start'tan önce hiç görünmez */}
            <button type="button" onClick={() => putCourseShow({ ...cShow, ov: cShow.ov === false })} className={`${row} border-t border-line`} aria-pressed={cShow.ov !== false}>
              <span className="min-w-0 flex-1 font-semibold">Genel sıralama (yarışta)</span>
              <span className={`masa-sw${cShow.ov !== false ? " on" : ""}`} aria-hidden="true" />
            </button>

              </div>
            ) : null}
          </div>
        </section>
        <MasaBar>
          <Button variant="secondary" disabled={!!busy || !onScreen} onClick={() => show({ kind: "", caption: cap })}>
            Kaldır
          </Button>
          {onScreen ? (
            // Duraklat (Seyhun 2026-11-02): görüntü ekranda kalır, önünde "Yayına ara verildi"; Sürdür geri açar
            <Button variant="secondary" disabled={!!busy} onClick={() => show({ ...onScreen, pause: !onScreen.pause })}>
              {onScreen.pause ? "Sürdür" : "Duraklat"}
            </Button>
          ) : null}
          <Button disabled={!!busy || !takeOk || (!!onScreen && isOn(sel.kind, sel.mid || sel.src || ""))} onClick={() => show({ ...sel, loop: sel.kind === "boats", caption: cap })}>
            {pvName ? `${pvName.length > 14 ? "Ekrana al" : `${pvName}'i ekrana al`}` : "Ekrana al"}
          </Button>
        </MasaBar>
          </>
        ) : null}
        {!needSetup && tab === "parkur" ? (
          <>
        {/* Parkur (Seyhun 2026-11-02 yayın masası): büyük çizim, adı üstünde; kartlar yan yana kutu (yarış boyunca seçili olan); rota */}
        <section>
          <div className={`${card} overflow-hidden`}>
            <div className="relative">
              {scene ? <div className="[&>svg]:block" dangerouslySetInnerHTML={{ __html: scene }} /> : <p className="px-4 py-6 text-[0.875rem] text-mut">Rüzgâr ya da parkur ölçümü girince kart çizilir</p>}
              <div className="pointer-events-none absolute left-3 top-2.5 leading-tight text-white">
                <b className="block text-[0.9375rem] font-bold">{CARD_TYPES[selCard(course).type] || CARD_TYPES.std}</b>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-line px-3.5 py-3">
              <span className="text-[0.8125rem] font-bold text-mut">Rota</span>
              {rtEdit ? (
                <input autoFocus value={rt} onChange={(e) => setRt(e.target.value.slice(0, 40))} placeholder="1 2 3 F" aria-label="Rota" className="h-9 min-w-0 flex-1 rounded-[0.6875rem] bg-[var(--chip)] px-3 text-[0.9375rem] font-bold tabular-nums tracking-[0.06em] outline-none" />
              ) : (
                <b className="min-w-0 flex-1 truncate text-[1rem] tabular-nums tracking-[0.06em]">{routeText(cleanRoute(rt)) || "Yok"}</b>
              )}
              <Button size="sm" variant="secondary" onClick={() => setRtEdit((v) => !v)}>
                {rtEdit ? "Tamam" : "Düzelt"}
              </Button>
              {course.cards.length > 1 ? (
                <Button size="sm" variant="secondary" onClick={dropCard}>
                  Kartı sil
                </Button>
              ) : null}
            </div>
          </div>
        </section>
        <div className="masa-cards">
          {course.cards.map((k) => (
            <button key={k.id} type="button" aria-pressed={k.id === course.sel} onClick={() => pickCard(k.id)} className="masa-card" data-press>
              <b>{CARD_TYPES[k.type] || CARD_TYPES.std}</b>
              <span>{[`Kart ${k.id}`, routeText(k.route) || "Rota yok"].join(" · ")}</span>
            </button>
          ))}
          <button type="button" onClick={newCard} className="masa-card" data-press>
            <b className="text-acc">+ Yeni kart</b>
            <span>Boş parkur</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.8125rem] font-bold text-mut">Seçili kartın türü</span>
          {Object.entries(CARD_TYPES).map(([t, n]) => (
            <button key={t} type="button" onClick={() => setType(t)} aria-pressed={selCard(course).type === t} className={`h-8 rounded-full px-3 text-[0.8125rem] font-semibold active:scale-95 ${selCard(course).type === t ? "bg-acc text-white" : "bg-[var(--chip)]"}`}>
              {n}
            </button>
          ))}
        </div>
        {/* Grupların parkuru (Seyhun 2026-11-02 "sarı grubu trapezde, mavi grubu başka parkurda; 1 2 1 2 3 finiş gibi değiştirebilmeliyim"):
            her sınıf/grup bir kart seçer (kartın rotası değişirse o grubun rotası da); seçmeyen grup seçili kartla yarışır. Start bu kartla açılır. */}
        {groupRows.length > 1 || course.cards.length > 1 ? (
          <section>
            <Head title="Grupların parkuru" right="Start bu kartla açılır" />
            <div className={`${card} overflow-hidden`}>
              {groupRows.map(([c, g]) => {
                const k = cardFor(course, c, g);
                return (
                  <div key={cardKey(c, g)} className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 last:border-b-0">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: g ? groupColor(g) : "var(--mut)" }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 leading-tight">
                      <b className="block truncate font-semibold">{g ? `${g}${plan.sets.length > 1 ? ` · ${c}` : ""}` : c}</b>
                      <span className="block truncate text-[0.75rem] text-mut">{`${CARD_TYPES[k.type] || CARD_TYPES.std} · ${routeText(k.route) || "Rota yok"}`}</span>
                    </span>
                    <div className="flex shrink-0 gap-1">
                      {course.cards.map((x) => (
                        <button key={x.id} type="button" aria-pressed={k.id === x.id} aria-label={`Kart ${x.id}`} onClick={() => k.id !== x.id && putCards({ by: { ...course.by, [cardKey(c, g)]: x.id } }, `${g || c}: Kart ${x.id}`)} className={`h-8 min-w-8 rounded-full px-2 text-[0.8125rem] font-bold active:scale-95 ${k.id === x.id ? "bg-acc text-white" : "bg-[var(--chip)]"}`}>
                          {x.id}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
        <section>
          {/* Seyhun 2026-11-02 "parkur ve rüzgârı şimdilik gizle, alta koy, istersek açarız; parkur kartları aynı şeyi animasyonla gösteriyor":
              kapalıyken yalnız Rüzgâr / Parkur ölçümü girişi */}
          <Head title="Ölçümler" right={wind ? `${wind.deg}° ${dirShort(wind.deg)}${wind.kn != null ? ` · ${wind.kn} kn` : ""}` : ""} />
          <div className={`${card} overflow-hidden`}>
            {course.obs.length ? (
              [...course.obs].reverse().map((o) => (
                <div key={o.id} className="flex items-center gap-3 border-b border-line px-4 py-2 text-[0.9375rem] last:border-b-0">
                  <span className="min-w-0 flex-1 truncate font-semibold">{`${obsTitle(o)} · ${o.deg}°${o.kn != null ? ` · ${o.kn} kn` : ""}`}</span>
                  <span className="text-[0.8125rem] tabular-nums text-mut">{hm(o.at)}</span>
                  <button type="button" onClick={() => dropObs(o)} className="text-[0.875rem] font-semibold text-rec">
                    Sil
                  </button>
                </div>
              ))
            ) : (
              <p className="px-4 py-3 text-[0.875rem] text-mut">Ölçüm yok</p>
            )}
          </div>
        </section>
        <MasaBar>
          <Button variant="secondary" onClick={() => setAdd(0)}>
            Ölçüm ekle
          </Button>
          <Button disabled={routeText(cleanRoute(rt)) === routeText(selCard(course).route)} onClick={saveRoute}>
            Kaydet
          </Button>
        </MasaBar>
          </>
        ) : null}
        {!needSetup && tab === "donus" ? (
          <>
        {/* Dönüşler (Seyhun 2026-11-02 yayın masası): şamandıralar adım adım (geçen tekne sayısı), son şamandıra üstte, lider sarı */}
        {entry?.route?.length ? (
          <>
            <section>
              <Head title={st ? `${raceName(st)}${entry?.grp ? ` · ${entry.grp}` : ""}` : ""} right={entries.length ? `Kayıt listesi ${entries.length}` : ""} />
              <div className={`${card} masa-steps`}>
                {entry.route.map((m, k) => {
                  const n = (entry.legs[k] || []).length;
                  const tot = (entry.legs[0] || []).length;
                  const last = entry.route.reduce((a, _, j) => ((entry.legs[j] || []).length ? j : a), -1);
                  const cls = k < last ? "dn" : k === last ? "cu" : "";
                  return (
                    <div key={k} className={cls}>
                      <b>{m}</b>
                      <span>{n ? (k && tot ? `${n}/${tot}` : n) : "–"}</span>
                    </div>
                  );
                })}
              </div>
            </section>
            {entry.route
              .map((m, k) => ({ m, k, legs: entry.legs[k] || [] }))
              .filter((x) => x.legs.length)
              .reverse()
              .map((x) => (
                <section key={x.k}>
                  <Head title={markName(x.m)} right={`${x.legs.length} tekne`} />
                  <div className={`${card} masa-sails`}>
                    {x.legs.map((sl, i) => (
                      <span key={sl} className={i ? "" : "f"}>
                        {sl}
                      </span>
                    ))}
                  </div>
                </section>
              ))}
          </>
        ) : (
          <section>
            <Head title="Dönüşler" right={st ? raceName(st) : "Önce yarışı başlat"} />
            <p className={`${card} px-4 py-3 text-[0.875rem] text-mut`}>{entries.length ? `Kayıt listesi ${entries.length} tekne · Henüz dönüş yok` : "Henüz dönüş yok"}</p>
          </section>
        )}
        {st ? (
          <section>
            <Head title="Ceza ve sonuç kodları" right={Object.keys(penOf_).length ? `${Object.keys(penOf_).length} tekne` : ""} />
            <button type="button" onClick={() => setPenOpen(true)} className={`${card} masa-sails w-full text-left`}>
              {Object.keys(penOf_).length ? Object.entries(penOf_).map(([s, c]) => <span key={s}>{`${s} · ${c}`}</span>) : <span className="!bg-transparent !px-0 font-semibold text-mut">Yok · DNC, DSQ, UFD… eklemek için dokun</span>}
            </button>
          </section>
        ) : null}
        <MasaBar>
          <Button variant="secondary" onClick={() => setList(true)}>
            {entries.length ? `Kayıt listesi · ${entries.length}` : "Kayıt listesi"}
          </Button>
          <Button variant="secondary" disabled={!st} onClick={() => setPenOpen(true)}>
            Ceza
          </Button>
          <Button disabled={!st} onClick={() => setVoice(true)}>
            Sesle gir
          </Button>
        </MasaBar>
          </>
        ) : null}
        {/* Tekne takibi (Seyhun 2026-11-02): teknedeki telefonların konumu, şamandıra yanından geçince dönüş (features/tracking).
            Sekme değişince de takılı kalır (algılama sayfa açıkken sürer), yalnız Dönüşler'de görünür */}
        <section className={!needSetup && tab === "donus" ? "" : "hidden"}>
          <Head title="Tekne takibi" />
          <TrackPanel orgId={orgId} raceId={id} starts={liveStarts(live.starts, L?.timer, today).map((x) => ({ ...x, grp: x.grp || L?.rounds?.[x.id]?.grp || "" }))} rounds={L?.rounds || {}} groupOf={groupMap(groups[today])} course={course} />
        </section>
      </div>

      {/* ⋯ menüsü: ekran ve link, sonuç PDF'i (ayrı sayfa), kayıt listesi, gün durumu; Günü bitir bir daha sorar (yanlış dokunuş) */}
      {/* Yayını sıfırla (Seyhun 2026-11-02 "deneme yaptıkça sıfırlayabilmeliyim"): yarışlar, program, gruplar, dönüşler, sayaç, ekran; fotoğraf/video isteğe bağlı */}
      <ResetSheet
        open={reset}
        onClose={() => setReset(false)}
        live={{ ...live, plan }}
        onReset={async (media) => {
          const patch = resetPatch(media, Date.now(), { plan, drone: L?.stream.drone || "", sources: cleanSources(srcList) });
          try {
            await resetLive(orgId, id, patch, live.media);
          } catch {
            return toast("Sıfırlanamadı. İnterneti kontrol et.");
          }
          const t = readTimer();
          if (t.mode === "start" && (t.end != null || t.left != null)) writeTimer({ ...pickTimer({}), zero: t.zero });
          setLive((l) => cleanLive({ ...l, ...patch }));
          setPlan(cleanPlan(patch.plan));
          setGroups({});
          setPickId("");
          setEditI(-1);
          setCap("");
          setReset(false);
          await reload().catch(() => {});
          toast("Yayın sıfırlandı");
        }}
      />
      {/* Tehir (Seyhun 2026-11-03 "alt çubuktan yukarı açılsın, kare belirgin düğmeler: İner, Yer, İnince, Sebep, Tamam") */}
      <Sheet open={!!ap && plan.status !== "ap"} onClose={() => setAp(null)} title="Tehir" navy>
        {ap ? (
          <div className="space-y-4 pb-3">
            <div>
              <div className="masa-aplab">İner</div>
              <div className="masa-apgrid">
                {[...AP_MIN, 0].map((m) => (
                  <button key={m} type="button" data-press aria-pressed={ap.min === m} onClick={() => setAp({ ...ap, min: m })} className="masa-ap">
                    <b>{m === 0 ? "?" : m < 60 ? m : m / 60}</b>
                    <small>{m === 0 ? "Belirsiz" : m < 60 ? "dk sonra" : "saat sonra"}</small>
                  </button>
                ))}
              </div>
            </div>
            {/* Denizde (AP): inince 1 dk sonra uyarı işareti; Karada (AP üstünde H): geri sayım kendiliğinden başlamaz */}
            <div>
              <div className="masa-aplab">Yer</div>
              <div className="masa-apgrid two">
                {[[false, "Denizde", "AP"], [true, "Karada", "AP + H"]].map(([v, t, f]) => (
                  <button key={t} type="button" data-press aria-pressed={!!ap.land === v} onClick={() => setAp({ ...ap, land: v })} className="masa-ap">
                    <b>{t}</b>
                    <small>{f}</small>
                  </button>
                ))}
              </div>
            </div>
            {!ap.land ? (
              <div>
                <div className="masa-aplab">İnince</div>
                <div className="masa-apgrid two">
                  {[[true, "1 dk sonra", "geri sayım kendiliğinden"], [false, "Ben başlatırım", "geri sayım elle"]].map(([v, t, f]) => (
                    <button key={t} type="button" data-press aria-pressed={ap.auto !== false === v} onClick={() => setAp({ ...ap, auto: v })} className="masa-ap">
                      <b>{t}</b>
                      <small>{f}</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <div className="masa-aplab">Sebep</div>
              <div className="masa-apgrid">
                {AP_WHY.map((w) => (
                  <button key={w} type="button" data-press aria-pressed={ap.why === w} onClick={() => setAp({ ...ap, why: w })} className="masa-ap">
                    <b className="sm">{w}</b>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[0.875rem] text-mut">{[ap.live ? "Sayaç durur" : "", ap.min ? `İniş ${trHm(new Date((tick || capNow) + ap.min * 60e3).toISOString())}` : "İniş belirsiz, Tehiri indir ile iner", ap.land || ap.auto === false ? "Geri sayımı sen başlatırsın" : "İnince 1 dk sonra geri sayım"].filter(Boolean).join(" · ")}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setAp(null)}>
                Vazgeç
              </Button>
              <Button className="flex-1" onClick={postpone}>
                Tehir çek
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Kaynak ekle">
        <div className="grid grid-cols-2 gap-2 px-4 pb-5">
          {Object.entries(SRC_KINDS).map(([k, t]) => (
            <button key={k} type="button" data-press className="masa-tog" onClick={() => (setAddOpen(false), addSrc(k))}>
              {t}
            </button>
          ))}
          {/* Sade video (Seyhun 2026-11-03 "önceden hazırlanmış videoları ekleyip gösterebilmeliyim"): dosyadan yüklenir, Kayıtlar'a girer */}
          <button type="button" data-press className="masa-tog" disabled={!!busy} onClick={() => (setAddOpen(false), file.current?.click())}>
            Sade video
          </button>
        </div>
      </Sheet>
      {/* Drone › Nasıl bağlanır (Seyhun 2026-11-02): DJI Fly yalnız RTMP verir; en kolayı YouTube'a gönderip buradan göstermek */}
      <Sheet open={howOpen} onClose={() => setHowOpen(false)} title="Kaynağı bağla">
        <div className="space-y-4 px-4 pb-5 text-[0.9375rem]">
          <div>
            <b className="block pb-1.5">Bir kez</b>
            <ol className="list-decimal space-y-1 pl-5">
              <li>YouTube&apos;da canlı yayını aç (YouTube Studio › Canlı yayın). İlk seferde 24 saate kadar sürebilir.</li>
              <li>Yayın sekmesinde yayın anahtarını kopyala. Gecikme: Ultra düşük.</li>
              <li>Kanal ya da yayın bağlantısını buraya yapıştır. Her drone ve telefon için ayrı kanal: kanalın canlı bağlantısı tek yayın gösterir.</li>
            </ol>
          </div>
          <div>
            <b className="block pb-1.5">Yarışta</b>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Drone: kumandayı internete bağla, DJI Fly › ⋯ › Aktarım › Canlı yayın › RTMP. Adres: aşağıdaki satır + yayın anahtarı. Başlat.</li>
              <li>Telefon: YouTube uygulamasında Oluştur › Canlı yayına geç.</li>
              <li>Burada kaynağı seç, önizlemede gör, ekrana al.</li>
            </ol>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(YT_RTMP).then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı"))}
            className="flex w-full items-center gap-2 rounded-[0.6875rem] bg-[var(--chip)] px-3 py-2.5 text-left"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-[0.8125rem]">{YT_RTMP}</span>
            <span className="shrink-0 text-[0.8125rem] font-semibold text-acc">Kopyala</span>
          </button>
        </div>
      </Sheet>
      <Sheet open={!!camOpen} onClose={() => setCamOpen("")} title={`${srcs.find((c) => c.id === camOpen)?.name || "Kamera"} hangi grupları çekiyor?`}>
        <div className="space-y-2 px-4 pb-5">
          {groupRows.map(([c, g]) => {
            const k = cardKey(c, g);
            const on = camPick.includes(k);
            const other = L?.camBy?.[k] && L.camBy[k] !== camOpen ? srcs.find((x) => x.id === L.camBy[k]) : null;
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => setCamPick(on ? camPick.filter((x) => x !== k) : [...camPick, k])} className={`masa-pick flex w-full items-center gap-3 rounded-[0.875rem] px-3.5 py-3 text-left${on ? " on" : ""}`}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: g ? groupColor(g) : "var(--mut)" }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-semibold">{groupRows.some(([c2]) => c2 !== c) ? [c, g].filter(Boolean).join(" · ") : g || c}</span>
                <span className="shrink-0 text-[0.8125rem] text-mut">{on ? "✓" : other ? `${other.name}'de` : ""}</span>
              </button>
            );
          })}
          <Button className="mt-2 w-full" onClick={saveCams}>
            Kaydet
          </Button>
        </div>
      </Sheet>
      <Sheet open={menu} onClose={() => (setMenu(false), setAskEnd(false))} title="Yayın">
        <div className="divide-y divide-line">
          {[
            ["Ekranı aç", () => (setMenu(false), openScreen())],
            ["Linki kopyala", () => (setMenu(false), copy())],
            ["Sınıf ve gruplar", () => (setMenu(false), setSetupOpen(true), window.scrollTo({ top: 0 }))],
            // Örnek yarış (Seyhun 2026-11-02): tasarımı görmek için Sarı grup örneği, veriye dokunmaz
            ["Örnek yarışı aç", () => (setMenu(false), window.open("/canli/ornek", "_blank"))],
            ["Yayını sıfırla", () => (setMenu(false), setReset(true))],
          ].map(([t, fn]) => (
            <button key={t} type="button" onClick={fn} className={`${row} font-semibold`}>
              {t}
            </button>
          ))}
          <Link href={`/athletes/races/${id}/sonuclar`} className={`${row} font-semibold`}>
            <span className="flex-1">{"Sonuç PDF'i"}</span>
            <span className="text-[0.875rem] text-mut">{race?.results?.fleet ? `${race.results.fleet} tekne` : ""}</span>
          </Link>
          <button type="button" onClick={() => (setMenu(false), setList(true))} className={`${row} font-semibold`}>
            <span className="flex-1">Kayıt listesi</span>
            <span className="text-[0.875rem] text-mut">{entries.length ? `${entries.length} tekne` : ""}</span>
          </button>
          <button type="button" onClick={() => (setMenu(false), changePlan({ day: planDay, status: plan.status === "none" ? "" : "none" }))} className={`${row} font-semibold`}>
            {plan.status === "none" ? "Bugün yarış var" : "Bugün yarış yok"}
          </button>
          {plan.status === "done" ? (
            <button type="button" onClick={() => (setMenu(false), changePlan({ day: planDay, status: "" }))} className={`${row} font-semibold`}>
              Günü yeniden aç
            </button>
          ) : null}
        </div>
      </Sheet>

      {/* geri sayımda İptal › Tehir: yarış silinip programa döner, tehir penceresi 1 dk seçili açılır (sayaç zaten durdu) */}
      <VoidSheet ask={rf.ask} onChoose={chooseVoid} />
      <AddSheet open={add !== null} pick0={add || 0} c={c} onClose={() => setAdd(null)} onAdd={addObs} />
      <PenSheet
        open={penOpen}
        onClose={() => setPenOpen(false)}
        title={st ? `Ceza · ${raceName(st)}${entry?.grp ? ` · ${entry.grp}` : ""}` : "Ceza"}
        entries={entries}
        members={penMembers}
        pen={penOf_}
        onSet={(sail, code) => {
          if (!st) return;
          const next = { ...penOf_ };
          if (code) next[sail] = code;
          else delete next[sail];
          setPickOf(st.id, { pen: next });
        }}
      />
      <RoundsScreen open={voice} onClose={() => (setVoice(false), reload())} orgId={orgId} raceId={id} startId={st?.id || ""} />
      {list && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
              <EntriesView onClose={() => setList(false)} orgId={orgId} raceId={id} rows={entries} setRows={setEntries} groups={groups} setGroups={setGroups} />
            </div>,
            document.body,
          )
        : null}
    </main>
  );
}

const dayLong = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });

// Yayın masası sekmeleri: ad + kısa durum (canlıysa kırmızı nokta)
// YouTube bağlantısından küçük resim (video ya da canlı yayın kimliği varsa; kanal bağlantısında yok)
// Son kullanılan kaynak listesi bu telefonda kalır: yeni yarışta kutucuklar bağlantılarıyla hazır gelir
const lastSources = () => {
  try {
    const l = cleanSources(JSON.parse(localStorage.getItem("yayin-kaynak") || "[]"));
    if (l.length) return l;
    const d = localStorage.getItem("yayin-drone") || ""; // eski (#1012)
    return ytEmbed(d) ? [{ id: "c1", name: "Kamera 1", kind: "camera", url: "" }, { id: "d1", name: "Drone 1", kind: "drone", url: d }] : null;
  } catch {
    return null;
  }
};
const keepSources = (l) => {
  try {
    localStorage.setItem("yayin-kaynak", JSON.stringify(l));
  } catch {}
};
// vid: kanal bağlantısında o anki yayının kimliği (/api/yayin-durum); canlı yayının resmi dakikada bir tazelenir (hqdefault_live)
const ytThumb = (u, vid = "") => {
  const m = String(u || "").match(/(?:youtu\.be\/|[?&]v=|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/);
  const v = vid || m?.[1] || "";
  return v ? (vid ? `https://i.ytimg.com/vi/${v}/hqdefault_live.jpg?m=${Math.floor(Date.now() / 60000)}` : `https://i.ytimg.com/vi/${v}/hqdefault.jpg`) : "";
};
function MasaTabs({ value, onChange, tabs }) {
  return (
    <div className="masa-tabs">
      {tabs.map(([k, name, sub, dot]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)} data-press>
          <b>{name}</b>
          <small>
            {dot ? <i aria-hidden="true" /> : null}
            {sub}
          </small>
        </button>
      ))}
    </div>
  );
}
// Sekmenin iş düğmeleri: ekranın altında sabit (en çok üç, ana iş pembe)
function MasaBar({ children }) {
  return (
    <div data-pagebar="" className="masa-bar fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto flex max-w-[30rem] gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2.5">{children}</div>
    </div>
  );
}
function Head({ title, right = "" }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1 text-[0.8125rem] font-semibold text-mut">
      <span>{title}</span>
      <span className="min-w-0 truncate">{right}</span>
    </div>
  );
}

// Yarışın kurulumu (Seyhun 2026-11-02 "önce bu yarış için sınıfları, sonra uygulanacak grupları seçelim; bunlar fix, bir kere seçip
// kapatalım; ayarlardan değiştirebilelim"): 1 Sınıf (birden çok) → 2 Gruplar (sınıf sınıf; grup yoksa boş) → Kaydet. Geri ile bir adım geri.
const SHOW_NAME = { course: "Parkur", wind: "Rüzgâr", prog: "Program" };
const STEPS = ["Sınıflar", "Gruplar"];
const bigBtn = "flex h-14 w-full items-center justify-center rounded-[1.125rem] bg-white text-[1.125rem] font-semibold text-[#11203a] shadow-[0_3px_0_rgba(0,0,0,.35)] active:translate-y-0.5 active:shadow-none disabled:opacity-40";
const backBtn = "ck-glass flex h-14 shrink-0 items-center justify-center rounded-[1.125rem] px-5 text-[1.0625rem] font-semibold";
function Setup({ sets, onSave, onCancel }) {
  const [step, setStep] = useState(1);
  const [clss, setClss] = useState(() => sets.map((x) => x.cls));
  const [grps, setGrps] = useState(() => Object.fromEntries(sets.map((x) => [x.cls, x.grps])));
  const starts = clss.reduce((n, c) => n + Math.max(1, (grps[c] || []).length), 0);
  const chip = (on) => `flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.9375rem] font-semibold ${on ? "bg-white text-[#11203a]" : "ck-glass text-white/85"}`;
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[1.0625rem] font-semibold">Yarışın sınıfları ve grupları</p>
        <ol className="flex items-center gap-1.5 text-[0.8125rem] font-semibold">
          {STEPS.map((x, i) => (
            <li key={x} className={`rounded-full px-2.5 py-1 ${i + 1 === step ? "bg-white text-[#11203a]" : i + 1 < step ? "ck-glass text-white" : "text-white/40"}`}>
              {`${i + 1} ${x}`}
            </li>
          ))}
        </ol>
      </div>
      {step === 1 ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {CLASS_PICK.map((c) => {
              const on = clss.includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} onClick={() => setClss((l) => (on ? l.filter((x) => x !== c) : CLASS_PICK.filter((x) => x === c || l.includes(x))))} className={`flex h-12 items-center gap-2.5 rounded-[0.875rem] px-3.5 text-left text-[1rem] font-semibold ${on ? "bg-white text-[#11203a]" : "ck-glass text-white/70"}`}>
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 text-[0.75rem] ${on ? "border-[#11203a] bg-[#11203a] text-white" : "border-white/40"}`} aria-hidden="true">
                    {on ? "✓" : ""}
                  </span>
                  {c}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            {onCancel ? (
              <button type="button" onClick={onCancel} className={backBtn}>
                Vazgeç
              </button>
            ) : null}
            <button type="button" disabled={!clss.length} onClick={() => setStep(2)} className={bigBtn}>
              {clss.length ? `Devam · ${clss.length === 1 ? clss[0] : `${clss.length} sınıf`}` : "Sınıf seç"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            {clss.map((c) => (
              <div key={c} className="ck-glass rounded-[0.875rem] p-3">
                <p className="mb-2 text-[0.9375rem] font-semibold">{c}</p>
                <div className="flex flex-wrap gap-1.5">
                  {GROUP_PICK.map((g) => {
                    const on = (grps[c] || []).includes(g);
                    return (
                      <button key={g} type="button" aria-pressed={on} onClick={() => setGrps((d) => ({ ...d, [c]: on ? (d[c] || []).filter((x) => x !== g) : [...(d[c] || []), g] }))} className={chip(on)}>
                        <span className="size-2.5 rounded-full" style={{ background: groupColor(g) }} aria-hidden="true" />
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className={backBtn}>
              ‹ Geri
            </button>
            <button type="button" onClick={() => onSave(clss.map((c) => ({ cls: c, grps: GROUP_PICK.filter((g) => (grps[c] || []).includes(g)) })))} className={bigBtn}>
              {`Kaydet · ${starts} start`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Sınıf işareti kare (canlı ekrandaki sınıf bayrağı gibi): grup renginde zemin, Optimist halka + I, diğerleri kısa ad
function ClsArt({ cls, grp }) {
  const bg = (grp && groupColor(grp)) || "#fff";
  const m = /^#?([0-9a-f]{6})$/i.exec(bg);
  const n = m ? parseInt(m[1], 16) : 0xffffff;
  const ink = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6 ? "#111" : "#fff";
  const short = /^opti/i.test(cls) ? "" : /^ilca\s*(\d)/i.test(cls) ? `ILCA ${/^ilca\s*(\d)/i.exec(cls)[1]}` : String(cls || "").slice(0, 5).toUpperCase();
  if (!cls) return null;
  return (
    <span className="flex h-full w-full items-center justify-center" style={{ background: bg, color: ink }}>
      {/^opti/i.test(cls) ? (
        <svg viewBox="10 0 40 40" className="h-[88%]" aria-label="Optimist">
          <circle cx="30" cy="15.4" r="11.2" fill="none" stroke="currentColor" strokeWidth="2.6" />
          <path d="M27.1 14.6 L32.9 14.6 Q31.35 15.4 31.3 16.9 L31.3 35.2 Q31.35 36.6 32.9 37.4 L27.1 37.4 Q28.65 36.6 28.7 35.2 L28.7 16.9 Q28.65 15.4 27.1 14.6 Z" fill="currentColor" />
        </svg>
      ) : (
        <b className="text-[0.6875rem] font-extrabold tracking-tight">{short}</b>
      )}
    </span>
  );
}
// Hazırlık bayrağının resmi (canlı ekrandaki bayraklarla aynı renkler)
const FLAG_NAME = { P: "P bayrağı", I: "I bayrağı", Z: "Z bayrağı", U: "U bayrağı", Kara: "Kara bayrak" };
function FlagArt({ p }) {
  return (
    <svg viewBox="0 0 30 20" className="block h-full w-full" aria-hidden="true">
      {p === "P" ? (
        <>
          <rect width="30" height="20" fill="#1b4fd6" />
          <rect x="8.4" y="5.6" width="13.2" height="8.8" fill="#fff" />
        </>
      ) : p === "I" ? (
        <>
          <rect width="30" height="20" fill="#f5c400" />
          <ellipse cx="15" cy="10" rx="6.6" ry="6" fill="#111" />
        </>
      ) : p === "U" ? (
        <>
          <rect width="30" height="20" fill="#fff" />
          <rect width="15" height="10" fill="#e11d48" />
          <rect x="15" y="10" width="15" height="10" fill="#e11d48" />
        </>
      ) : p === "Z" ? (
        <>
          <path d="M0 0 L15 10 L0 20 Z" fill="#111" />
          <path d="M0 0 L30 0 L15 10 Z" fill="#f5c400" />
          <path d="M30 0 L30 20 L15 10 Z" fill="#1b4fd6" />
          <path d="M0 20 L30 20 L15 10 Z" fill="#e11d48" />
        </>
      ) : (
        <rect width="30" height="20" fill="#111" />
      )}
    </svg>
  );
}
// Yarışı oluştur (Seyhun 2026-11-02 "bayrak seçimini bayrakları göstererek tıklayarak yapalım; hiçbir şey seçili olmasın, seçince
// ilerlesin; geri de olsun"): bayraklar resimli; dokununca yarış programa eklenir ve Başlat açılır (Başlat'ın üstündeki "Geri" buraya döner)
function FlagPick({ no, sets, value, onPick, again = false }) {
  const who = sets.flatMap((x) => (x.grps.length ? x.grps.map((g) => [x.cls, g]) : [[x.cls, ""]]));
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[1.0625rem] font-semibold">{again ? `${no}. yarış tekrar · bayrak` : `${no}. yarışın bayrağı`}</p>
        <p className="min-w-0 truncate text-[0.8125rem] text-white/65">{who.map(([c, g]) => g || c).join(" · ")}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PREP_PICK.map((g) => (
          <button key={g} type="button" aria-pressed={value === g} onClick={() => onPick(g)} data-press className={`flex flex-col items-center gap-2 rounded-[1rem] p-3 ${value === g ? "bg-white text-[#11203a]" : "ck-glass text-white"}`}>
            <span className="block h-10 w-[3.75rem] overflow-hidden rounded-[4px] ring-1 ring-white/70 shadow-[0_2px_6px_rgba(0,0,0,.35)]">
              <FlagArt p={g} />
            </span>
            <span className="text-[0.875rem] font-semibold">{FLAG_NAME[g]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Programı ekle (Seyhun 2026-11-02 "böyle bir program ekleyerek yarış günlerini ve programı oluşturabilmeliyim, yapay zekâ"): yarış
// talimatındaki program tablosunun fotoğrafı, PDF'i ya da yazısı → günler (tarih, ilk start, yarış var mı, not). Önizlenir, "Programa yaz"
// her günün saatini (en sık saat), farklı günleri, yarış olmayan günleri ve yarışın tarihlerini yazar.
function ProgramImport({ ctx, onApply }) {
  const [st, setSt] = useState({ busy: false, days: null, err: "", paste: false, text: "" });
  const file = useRef(null);
  const run = async (p) => {
    setSt((x) => ({ ...x, busy: true, err: "" }));
    try {
      const days = await p;
      setSt((x) => ({ ...x, busy: false, days, paste: false, text: "" }));
    } catch (e) {
      setSt((x) => ({ ...x, busy: false, err: e.message || "Program okunamadı" }));
    }
  };
  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) run(readProgramFile(f, ctx));
  };
  return (
    <section>
      <Head title="Programı ekle" right={st.busy ? "Okunuyor…" : ""} />
      <div className={`${card} overflow-hidden`}>
        {st.days ? (
          <>
            {st.days.map((d) => (
              <div key={d.day} className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-[0.9375rem]">
                <span className="w-24 shrink-0 font-semibold">{dayLong(d.day)}</span>
                <span className="min-w-0 flex-1 truncate text-mut">{[d.note, d.items?.length ? `${d.items.length} madde` : ""].filter(Boolean).join(" · ")}</span>
                <b className={`shrink-0 tabular-nums ${d.race ? "" : "font-semibold text-mut"}`}>{d.race ? d.at || "Saat yok" : "Yarış yok"}</b>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 p-3">
              <Button variant="secondary" onClick={() => setSt((x) => ({ ...x, days: null }))}>
                Vazgeç
              </Button>
              <Button onClick={() => (onApply(st.days), setSt((x) => ({ ...x, days: null })))}>Programa yaz</Button>
            </div>
          </>
        ) : (
          <>
            {st.paste ? (
              <textarea value={st.text} onChange={(e) => setSt((x) => ({ ...x, text: e.target.value.slice(0, 30000) }))} rows={5} placeholder="Programı buraya yapıştır" className="block w-full resize-none border-b border-line bg-transparent px-4 py-3 text-[0.9375rem] outline-none" />
            ) : null}
            {st.err ? <p className="border-b border-line px-4 py-2.5 text-[0.875rem] font-semibold text-warn">{st.err}</p> : null}
            <div className="grid grid-cols-2 gap-2 p-3">
              {st.paste ? (
                <>
                  <Button variant="secondary" disabled={st.busy} onClick={() => setSt((x) => ({ ...x, paste: false, text: "" }))}>
                    Vazgeç
                  </Button>
                  <Button disabled={st.busy || st.text.trim().length < 10} onClick={() => run(readProgramText(st.text, ctx))}>
                    {st.busy ? "Okunuyor…" : "Oku"}
                  </Button>
                </>
              ) : (
                <>
                  <Button disabled={st.busy} onClick={() => file.current?.click()}>
                    {st.busy ? "Okunuyor…" : "Fotoğraf / PDF"}
                  </Button>
                  <Button variant="secondary" disabled={st.busy} onClick={() => setSt((x) => ({ ...x, paste: true }))}>
                    Yazı yapıştır
                  </Button>
                </>
              )}
            </div>
            <input ref={file} type="file" accept="image/*,application/pdf" className="hidden" onChange={pick} />
          </>
        )}
      </div>
    </section>
  );
}
