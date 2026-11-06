"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { openInApp } from "@/features/liveScreen/InAppBack";
import { BackButton } from "@/components/ui/BackButton";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { loadRace, saveRaceDates } from "@/features/athletes/races";
import { readProgramFile, readProgramText } from "@/features/broadcast/broadcastStore";
import { FIRST_ITEM, agendaFirst, agendaPut, datesAdd, datesDrop, programPatch } from "@/lib/raceProgram";
import { raceDays } from "@/features/athletes/raceWeather";
import { loadSheets, addCourseMany, addCourseObs, saveCoursePt, loadCourse, loadLive, loadRoundsOf, resetLive, saveCamBy, saveSrcLive, saveCourseShow, saveEvre, saveEvreMan, loadShowTpl, saveShowTpl, savePin, saveOnAir, saveCards, watchRounds, saveCourse, savePlan, saveRounds, saveStarts, savePlanKeys } from "@/features/athletes/raceLiveStore";
import { GROUP_PICK, finalsFirst, groupColor, groupMap, groupsOn, isFinalGrp } from "@/lib/roundScore";
import { PenSheet } from "./PenSheet";
import { countingAt as countingNow, finishSteps, orderWithout, startBlock, startedRow, zeroStarts } from "./startFlow";
import { DocsTab } from "./DocsTab";
import { MyChannel } from "./MyChannel";
import { SrcKey } from "./SrcKey";
import { ytPrepare } from "@/lib/youtube";
import { nextSrcLive } from "@/lib/srcLive";
import { NearCams } from "./NearCams";
import { AthletesTab } from "./AthletesTab";
import { CourseTalk } from "./CourseTalk";
import { writeCourseVoice } from "./courseWrite";
import { courseVoice } from "./courseVoice";
import { SIGNALS, addHours, flagSvg, signalOf, soundText } from "@/lib/raceSignals";
import { VoiceLight } from "@/features/home/TabBar";
import { setCourseView } from "@/features/raceMedia/courseView";
import { audio, chooseDur, ownHere, raceCancel, raceFinish, raceStart, raceVoid, readTimer, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { ResetSheet } from "@/features/raceMedia/ResetSheet";
import { useLiveSync } from "@/features/raceMedia/useLiveSync";
import { VoidSheet, useRaceFlow } from "@/features/raceMedia/useRaceFlow";
import { AddSheet } from "@/features/raceMedia/CourseTab";
import { RoundsScreen } from "@/features/rounds/RoundsScreen";
import { EntriesView } from "@/features/rounds/EntriesView";
import { TrackPanel } from "@/features/tracking/TrackPanel";
import { BoatLive } from "@/features/tracking/BoatLive";
import { ZOOMS, fleetGroups, fleetOf } from "@/lib/boatPlay";
import { loadEntryDoc } from "@/features/rounds/roundsStore";
import { ensurePublic, liveUrl, recName, setStream, showOnScreen } from "@/features/liveScreen/liveActions";
import { upSec, AP_MIN, AP_WHY, apDue, apGap, apLower, apRaise, apSigId, trHm, warnDue, orangeUp, apText, cleanLive, cleanPlan, dayRaces, dayTime, dirShort, dropRace, finishRace, openWin, moveWin, pickTimer, resetPatch, rollPlan, ownedBy, raceName, raceOrder, raceTime, raceTitle, renumber, zeroRace, setsUp, orderBySets, grpHold, grpRelease, grpDue, heldGrps } from "@/lib/raceLive";
import { CARD_IDS, CARD_TYPES, cardFor, cardKey, withRaceCards, cleanCourse, cleanObs, degText, lineBias, obsTitle, obsValue, selCard, withLiveWind } from "@/lib/raceCourse";
import { cleanRoute, routeText, sceneSvg } from "@/lib/courseScene";
import { cardOf, coursePoints } from "@/lib/courseCard";
import { EVRES, EVRE_DEF, EVRE_NAME, EVRE_WHEN, ITEM_NAME, SIDE_DEF, ITEM_SECS, SHOW_ITEMS, SIDES, SIDE_NAME, cleanCourseShow, evreOf, evreScreen, showPlan, CLASS_PICK, raceClasses, PREP_PICK, SRC_KINDS, YT_RTMP, addSource, cleanSources, currentStart, liveStarts, markName, prepName, screenUrl, streamSources, ytEmbed, ytId, ytSrc } from "@/lib/raceRounds";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { autoCaption } from "@/lib/raceCaption";
import { bindCam, camOf, groupsOf, sourcesOf } from "@/lib/raceCams";
import "./masa.css";

// Yarışın yayın sayfası (/athletes/races/<id>/yayin, yalnız ana hesap; Seyhun 2026-11-01 "herkese açık multimedyasını ayrı bir sayfada
// yöneteceğiz"): herkese açık /canli ekranına giden her şey tek yerde. Lacivert üstte start sayacı (Başlat · İptal · Eşitle; sayaç diğer
// cihazlara ve herkese açık sayfaya useLiveSync ile gider), Linki kopyala / Ekrana aç. Açık alanda üç bölüm:
// Ekranda (canlı yayın linki ya da bu yarışın videoları, telefondan seçilen video yüklenir; dikey/yatay yazılır; Göster ekrana verir),
// Parkur ve rüzgâr (son rüzgâr, parkur kartı, ölçüm ekleme; Parkur sekmesiyle aynı kayıt), Dönüşler (sesle giriş, kayıt listesi),
// Sonuç PDF'i ayrı sayfada (/sonuclar, 2026-11-01); Linki kopyala, Ekrana aç, Kayıt listesi, gün durumu ⋯ menüsünde. Multimedya sayfası kalktı (Seyhun 2026-11-01 "tek bu yayın olanı kullanacağız").
// Bugünün startları tek liste (Seyhun 2026-11-01 "sınıf/grup seçimi ile sıra ekleme birbirinden bağımsız olamaz"): biten ve süren startlar
// saatiyle üstte, sonra yapılacak startlar (raceLive.plan.order [{ cls, grp, prep }]); ilk bekleyen "Sıradaki"dir, sayacın üstünde yazar ve
// Başlat onun sınıf/grup/bayrağını rounds[start]'a yazıp listeden düşer. "Start ekle" satır ekler; satıra dokununca sınıf, grup, bayrak,
// Yukarı/Aşağı/Çıkar aynı yerde. Biten yarışın seçimi de satırından düzeltilir.
const hm = (iso) => (iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "");
const nowMs = () => Date.now();
// bu telefonun son program değişikliğinin anı (öbür telefondan gelen eski kayıt hemen üstüne yazılmasın)
let planLocalT = 0;
const markLocal = () => {
  planLocalT = Date.now();
};
const sinceLocal = () => Date.now() - planLocalT;
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const orient = (m) => (m.w && m.h ? (m.h > m.w ? "Dikey" : "Yatay") : "");

// Elle yazılacak hazır yazılar: olaylar (start, tehir, genel geri, finiş) kendiliğinden yazar, grup ve yarış zaten şeritte
const CAP_PICKS = ["Ödül töreni", "Kısa ara", "Protesto saati"];

export function BroadcastPage({ orgId, id }) {
  const toast = useToast();
  const confirmIt = useConfirm();
  const today = todayStr();
  const [race, setRace] = useState(null);
  const [live, setLive] = useState(() => cleanLive({}));
  const [L, setL] = useState(null); // rounds, screen, stream (loadRoundsOf)
  const [tpl, setTpl] = useState(null); // senin evre listelerin (bütün yarışlar; loadShowTpl)
  const [course, setCourse] = useState(() => cleanCourse({}));
  const [rtEdit, setRtEdit] = useState(false); // rotayı düzelt (yazı kutusu)
  const [rt, setRt] = useState(""); // seçili parkur kartının rotası (yazı: "1 2 3 F")
  const [rtId, setRtId] = useState("");
  const [tab, setTab] = useState("sure"); // Sekmeler (Seyhun 2026-11-02): Süre · Video · Parkur · Dönüşler
  // iPad ve Mac (Seyhun 2026-11-06 "Yap", örnek project-files/yayin-ipad/sure-ipad-ornek.png): solda sekmelerin menüsü (ad + kısa durum),
  // sağda yalnız seçili sekme; Süre iki sütun (solda başlatılacak grup, sağda yarışta olanlar ve Bugün). Eski: 2026-11-04 bütün bölümler
  // yan yana sütunlarda. Telefonda sekmeler aynı.
  const board = useSyncExternalStore(subMq(BOARD_Q), () => window.matchMedia(BOARD_Q).matches, () => false);
  const [slots, setSlots] = useState({});
  const seen = (k) => tab === k || (board && k === "track" && tab === "donus");
  // sekmeye geç (ör. Süre'deki "Dönüşler"); panoda soldaki menüden aynı sekme seçilir
  const goTab = (k) => setTab(k);
  const [cap, setCap] = useState(""); // ekranın altındaki yazı (screen.caption)
  const [capInit, setCapInit] = useState(false);
  const [capNow, setCapNow] = useState(0); // otomatik yazının önizlemesi için saat (5 sn)
  // Canlı kaynaklar (Seyhun 2026-11-02 "Drone 1, 2, 3, telefon; önce ben göreyim, sonra ekrana alayım"): stream.sources; sıfırlamada kalır,
  // yeni yarışta bu telefonda son kullanılan liste gelir. Önizleme yalnız bu sayfada (veriye yazılmaz), "ekrana al" screen'e yazar
  const [srcList, setSrcList] = useState([]);
  const [stat, setStat] = useState({}); // bağlantı → { live, vid } (/api/yayin-durum)
  const [addOpen, setAddOpen] = useState(false);
  const [scOpen, setScOpen] = useState(""); // Ekran: ataması açılan evre (pre, start, race, post, ap)
  const [vidPick, setVidPick] = useState(false); // evre penceresinde görüntü listesi açık
  const [hasSheet, setHasSheet] = useState(false); // yüklü sonuç PDF'i var: 03 genel sıralama gösterilebilir
  const [addKind, setAddKind] = useState("drone");
  const [addUrl, setAddUrl] = useState("");
  const [howOpen, setHowOpen] = useState(false); // Drone › Nasıl bağlanır
  const [sel, setSel] = useState(null); // ekrana verilecek seçim { kind, mid }
  const [zoom, setZoom] = useState(null); // tekne ekranının yakınlığı (seçilmediyse ekrandaki ya da 100)
  const [busy, setBusy] = useState("");
  const [add, setAdd] = useState(null); // ölçüm penceresi: PICKS sırası
  const [voice, setVoice] = useState(false);
  const [list, setList] = useState(false);
  const [penOpen, setPenOpen] = useState(false); // Dönüşler › Ceza (arayarak seçerek)
  const [entries, setEntries] = useState([]);
  const [groups, setGroups] = useState({});
  const [pickId, setPickId] = useState(""); // Süre'de açık satır (başlamış startın kısa yolları)
  // Dönüşler, Ceza ve Sesle gir'in yarışı (Seyhun 2026-11-04 aynı anda üç grup): grup şeridinden seçilir, satırın açık/kapalı olmasına bağlı değil
  const [selId, setSelId] = useState("");
  // Süre büyük kartı: başlatılacak start (plan.order sırası; -1 = sıradaki) ve açık seçim (prep · card · more)
  const [heroPick, setHeroPick] = useState(-1);
  const [chg, setChg] = useState("");
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
  const [agEdit, setAgEdit] = useState(null); // Program: düzeltilen madde { d, i (-1 yeni), at, text }
  const [dayAsk, setDayAsk] = useState(false); // Program: Günü kaldır bir daha sorar
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
    loadSheets(orgId, id).then((l) => on && setHasSheet(l.length > 0), () => {});
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
    loadShowTpl(orgId).then((t) => on && setTpl(t), () => on && setTpl({}));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, id, today]);

  // Yayında mı (sayfa açıkken 45 sn'de bir; YouTube, sunucuda /api/yayin-durum). Yayında olan kaynaklar raceLive.srcLive'a yazılır
  // (lib/srcLive.js; Seyhun 2026-11-06 "yayın başladığında yayının başladığını gösteririz"): Ekran seçicisi ve /canli oradan okur
  const srcUrls = srcList.map((x) => x.url).filter(Boolean).join("|");
  const liveRef = useRef({});
  useEffect(() => {
    liveRef.current = { srcLive: L?.srcLive, list: srcList };
  });
  useEffect(() => {
    if (!srcUrls) return;
    let on = true;
    const ask = () =>
      document.visibilityState === "visible" &&
      authFetch(`/api/yayin-durum?${srcUrls.split("|").map((u) => `u=${encodeURIComponent(u)}`).join("&")}`)
        .then((r) => r.json())
        .then((d) => {
          if (!on) return;
          const m = Object.fromEntries((d.list || []).map((x) => [x.url, x]));
          setStat(m);
          if (!d.key) return;
          const nx = nextSrcLive(liveRef.current.srcLive, liveRef.current.list.filter((x) => x.url && m[x.url]?.live).map((x) => x.id));
          if (nx) (setL((p) => (p ? { ...p, srcLive: nx } : p)), saveSrcLive(orgId, id, nx).catch(() => {}));
        })
        .catch(() => {});
    ask();
    const t = setInterval(ask, 45000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [srcUrls, orgId, id]);

  // Program sekmesi açılınca günlerin saati, "yok" günleri ve maddeleri belgeden tazelenir (siteden gelen talimat ya da başka telefon
  // arada yazdıysa eski hâli üstüne yazılmasın; yarış sistemi haritası 2026-11-04 riski)
  useEffect(() => {
    if (!(board || tab === "program")) return undefined;
    let on = true;
    loadRoundsOf(orgId, id)
      .then((d) => on && d?.plan && setPlan((p) => cleanPlan({ ...p, daily: d.plan.daily, times: d.plan.times, off: d.plan.off, agenda: d.plan.agenda })))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [tab, board, orgId, id]);
  // gün değişince (sayfa gece açık kaldıysa) plan bugüne geçer ve kaydedilir
  useEffect(() => {
    if (!plan.day || plan.day >= today) return;
    const rp = rollPlan(plan, today);
    const t = setTimeout(() => (setPlan(rp), savePlan(orgId, id, rp).catch(() => {})), 0);
    return () => clearTimeout(t);
  }, [today, plan, orgId, id]);
  // Aynı anda iki telefon (Seyhun 2026-11-04): öbür telefonun program değişikliği (tehir, bekleyen startlar, bayrak…) bu telefona da gelir.
  // Kendi değişikliğimizden hemen sonraki 3 sn'de gelen eski kayıt atlanır (kendi kaydımız gelince zaten aynı olur).
  const livePlanJs = JSON.stringify(live.plan || null);
  useEffect(() => {
    if (!liveIn.current || !live.plan || sinceLocal() < 3000) return;
    const rp = rollPlan(live.plan, today);
    const t = setTimeout(() => setPlan((p) => (JSON.stringify(p) === JSON.stringify(rp) ? p : rp)), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePlanJs]);
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
      if (!liveIn.current) return;
      change((l) => {
        const next = zeroStarts(l.starts, t, end, l.wind, rdays, ownedBy(t?.own, ownHere()));
        if (!next) return {};
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
  // Yayın gece açık kaldıysa (Seyhun 2026-11-04 "tehir ettim, canlı ekranda hiç görünmedi"): plan dünde kalıyordu, tehir dünün gününe
  // yazılıp ekranda yeni günle siliniyordu. Gün değişince plan önce bugüne geçer.
  const changePlan = (patch) => {
    const base = plan.day && plan.day < today ? rollPlan(plan, today) : plan;
    const next = cleanPlan({ ...base, ...(patch.day && patch.day < today ? { ...patch, day: today } : patch) });
    markLocal();
    setPlan(next);
    // Promise döner: düğme veri gidene kadar halka gösterir
    // yalnız değişen alanlar (sunucunun siteden yazdığı program alanları ezilmesin)
    const keys = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(plan[k]));
    return savePlanKeys(orgId, id, next, keys).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
  };
  const planDay = plan.day && plan.day >= today ? plan.day : today;
  const nextPlan = plan.order[0] || null; // sıradaki start (listenin ilk bekleyeni)
  // Tehir: start saati min dakika ileri alınır (0 = belirsiz, saat silinir), sebep ekranda yazar; "Erteleme kalktı" eski saati geri getirir
  // Geri sayımda tehir (Seyhun 2026-11-02 "tehir yaptım ama süre durmadı"): sayaç durur, start verilmemiş yarış silinir ve programın
  // başına geri döner (aynı grup, aynı numara); yeni saat şimdiden ileri (denizde varsayılan Belirsiz).
  const countingAt = (now) => countingNow(tr.t, now);
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
  // Tehir penceresi: her tehir buradan çekilir (Bayrak › Tehir / AP üzeri H / saatli, geri sayımdaki Tehir, İptal › Tehir). Yer (Karada /
  // Denizde) her seferinde seçilir (Seyhun 2026-11-04). Denizde varsayılan "Belirsiz" (Seyhun 2026-11-03 11:47)
  // Tek gruba tehir (Seyhun 2026-11-04): başka grup yarıştayken geri sayımdaki grup varsayılan "Yalnız o grup"; yoksa Tüm gruplar
  const cdGrp = () => {
    const rid = rf.ridOf(readTimer());
    const s0 = rid ? live.starts.find((x) => x.id === rid) : null;
    return s0 ? s0.grp || L?.rounds?.[rid]?.grp || "" : "";
  };
  const openAp = (pre = {}) => {
    const now = nowMs();
    const grp = countingAt(now) && runningIds(now).length ? cdGrp() : "";
    setAp({ min: 0, why: AP_WHY[0], live: countingAt(now), land: false, auto: true, hours: 0, grp, ...pre });
  };
  // Bayraktan tehir: AP denizde, AP üzeri H karada, AP üzeri sayı saatli (planlanan start + n saat; iniş uyarı işaretinden 1 dk önce)
  const apFromFlag = (id) => {
    const s = signalOf(id);
    const pre = { land: !!s?.land };
    if (s?.hours) {
      const at2 = addHours(plan.at, s.hours);
      const t2 = at2 ? Date.parse(`${planDay}T${at2}:00+03:00`) : NaN;
      Object.assign(pre, { hours: s.hours, min: Number.isFinite(t2) ? Math.max(1, Math.round((t2 - 60e3 - nowMs()) / 60e3)) : 0, why: `${s.hours} saat tehir` });
    }
    openAp(pre);
  };
  // Çekili tehiri düzelt: iniş (seçildiyse şimdiden), yer, inince, sebep; seçilmeyen iniş aynı kalır
  const fixAp = () => {
    if (plan.status !== "ap" || !ap) return setAp(null);
    const down = ap.min == null ? plan.ap?.down || "" : ap.min ? new Date(Date.now() + ap.min * 60e3).toISOString() : "";
    changePlan({ ap: { ...plan.ap, why: ap.why, land: !!ap.land, auto: ap.auto !== false, hours: ap.min == null ? plan.ap?.hours || 0 : ap.hours || 0, down }, ...apSigOff(plan) });
    setAp(null);
    toast("Tehir düzeltildi");
  };
  const chooseVoid = (v) => {
    // Genel geri / Abandone (Seyhun 2026-11-02 "sınıf aynı, sadece bayrak değiştirebilmeliyim; sorun olunca kara bayrağa gidiliyor"): aynı start
    // aynı numarayla programın başına döner, bayrağı boş; sayaç yerine resimli bayrak seçimi çıkar
    if ((v === "Genel geri çağırma" || v === "Abandone") && rf.ask) {
      const back = apBack(rf.ask.id, false);
      rf.choose(v);
      if (back) changePlan({ order: [{ ...back, prep: "" }, ...plan.order] });
      setRetryPick(false);
      goTab("sure");
      return;
    }
    if (v !== "Tehir" || !rf.ask?.canDrop) return rf.choose(v);
    const back = apBack(rf.ask.id, false);
    if (back) changePlan({ order: [back, ...plan.order] });
    rf.choose("");
    goTab("sure");
    setAp({ min: 1, why: AP_WHY[0], live: false, now: true, auto: true });
  };
  // Tehir (Seyhun 2026-11-02 "geri sayımın herhangi bir yerinde tehir; 1 dk sonra indir, 5 dk sonra indir ya da belirsiz; indikten 1 dk sonra
  // 5 dakikalık geri sayımı vermem gerekiyor, takibini yapalım"): AP şimdi çekilir, seçilen dakikada kendiliğinden iner (belirsizde
  // "Tehiri indir"); inince 1 dk sonra uyarı işareti = sıradaki yarışın geri sayımı kendiliğinden başlar (tehiri kuran telefonda).
  // Geri sayımı süren startlar (start anı henüz gelmemiş; bu telefonun sayacında olsun olmasın): tehirde hepsi durur ve programa döner
  // (Seyhun 2026-11-04 "bütün sınıflara tehir çektim ama sarı grubun geri sayımı devam ediyor")
  const startGrp = (x) => x.grp || L?.rounds?.[x.id]?.grp || "";
  const pendingIds = (now, grp = null) => live.starts.filter((x) => x.day === today && !x.fin && !x.void && Date.parse(x.at) > now && (grp == null || startGrp(x) === grp)).map((x) => x.id);
  const grpOfTimer = () => (countingAt(nowMs()) ? cdGrp() : null);
  // a: Tehir penceresinin seçimleri. Düğmeden tıklama olayı gelirse pencerenin seçimi alınır (Seyhun 2026-11-04 "tehir yapıyorum, süre geri
  // saymaya devam ediyor": "Tehir çek" olayı a sanılıyordu; grup, yer, iniş, sebep yok sayılıyor, sayaç durmuyordu)
  const postpone = (a0, extra = {}) => {
    const a = a0 && typeof a0 === "object" && !a0.nativeEvent && !a0.target ? a0 : ap || {};
    let order = plan.order;
    if (a.grp) {
      // yalnız bir grup: o grubun geri sayımı sürüyorsa durur, start programa döner; grubun bekleyen startları tehirde (gün tehiri yok)
      const ids = pendingIds(nowMs(), a.grp);
      const trid = countingAt(nowMs()) ? rf.ridOf(readTimer()) : "";
      if (grpOfTimer() === a.grp || (trid && ids.includes(trid))) stopCount();
      order = [...ids.map((x) => apBack(x)).filter(Boolean), ...order];
      const done = changePlan({ day: planDay, order: grpHold(order, a.grp, { why: a.why, land: a.land, hours: a.hours, down: a.min ? new Date(nowMs() + a.min * 60e3).toISOString() : "" }) });
      setAp(null);
      toast(`${a.grp} grup tehirde`);
      return done;
    }
    // dizinin durduğu yer (canlı ekranda şerit orada kırmızı noktayla durur)
    const t0 = readTimer();
    const counting = countingAt(nowMs());
    const seq = counting && t0.mode === "start" ? (t0.end != null ? Math.max(0, Math.ceil((t0.end - Date.now()) / 1000)) : t0.left ?? null) : null;
    // tüm gruplar: her grubun süren geri sayımı durur (yalnız bu telefonun sayacındaki değil), startlar programın başına döner
    const ids = pendingIds(nowMs());
    const rid = counting ? rf.ridOf(t0) : "";
    if (rid && !ids.includes(rid)) ids.unshift(rid);
    if (counting) stopCount();
    order = [...ids.map((x) => apBack(x)).filter(Boolean), ...order];
    const raised = apRaise(plan, Date.now(), a.min, a.why, a.land, a.auto, a.hours);
    if (seq != null) raised.ap = { ...raised.ap, seq, dur: t0.dur || 300 };
    // eski tehir işareti (AP/H, AP 3…) plan.sig'de kaldıysa silinir; tehirin bayrağı plan.ap'tan okunur (apSigId)
    const done = changePlan({ day: planDay, order, ...raised, ...apSigOff(plan), ...extra });
    setAp(null);
    return done;
  };
  // Bayrakla işlem (Seyhun 2026-11-03 19:23-19:28 "bayrakları tıklayarak yapalım, hepsinde onay"): Bayrak penceresinde bayrağa dokun → onay → Çek.
  // Tehir ailesi tehir akışını, abandone ve birinci tekrar yarışı geçersiz sayar, hazırlık sıradaki startın bayrağı olur, diğerleri ekranda kart.
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagPick, setFlagPick] = useState(null); // { id, rid }
  const [flagFor, setFlagFor] = useState(""); // bayrak penceresi yalnız bu yarış için açıldı (satırın Bayrak kısa yolu)
  const runningIds = (now) => {
    return live.starts.filter((x) => x.day === today && !x.fin && !x.void && Date.parse(x.at) <= now).map((x) => x.id);
  };
  const dayDone = () => ({ day: planDay, status: "done", orange: "", ap: null, next: plan.next || { day: tomorrow, at: dayTime(plan, tomorrow) || plan.at } });
  const sigNow = (id, grp = "") => ({ sig: { id, at: new Date().toISOString(), grp } });
  const raiseFlag = (id, rid = "") => {
    const s = signalOf(id);
    if (!s) return;
    const now = nowMs();
    let p = null;
    if (s.kind === "ap" && !s.end) {
      // tehir bayrağı Tehir penceresine gider (yer, iniş, sebep orada seçilir)
      setFlagPick(null);
      setFlagOpen(false);
      setFlagFor("");
      return apFromFlag(id);
    } else if (s.kind === "ap") {
      // AP üzeri A: bugün yarış yok (tehir çekiliyken de çekilebilir)
      p = plan.status === "ap" ? changePlan({ ...dayDone(), ...sigNow(id) }) : postpone({ min: 0, why: AP_WHY[0], live: countingAt(now) }, { ...dayDone(), ...sigNow(id) });
    } else if (s.kind === "void" || s.kind === "fs") {
      let ids = rid ? [rid] : runningIds(now);
      if (s.kind === "fs" && !rid) {
        const last = live.starts.filter((x) => x.day === today && !x.void && Date.parse(x.at) <= now).sort((x, y) => Date.parse(y.at) - Date.parse(x.at))[0];
        ids = last ? [last.id] : [];
      }
      if (!ids.length) return (setFlagPick(null), setFlagOpen(false), toast(s.kind === "fs" ? "Start verilmiş yarış yok." : "Devam eden yarış yok."));
      const t0 = readTimer();
      if (t0.mode === "start" && ids.includes(rf.ridOf(t0))) writeTimer({ dur: t0.dur, end: null, left: null, zero: t0.end });
      const backs = ids.map((x) => apBack(x, false)).filter(Boolean).map((b) => (s.kind === "fs" ? { ...b, prep: "" } : b));
      rf.voidNow(ids, s.kind === "fs" ? "Genel geri çağırma" : "Abandone");
      p = changePlan({ order: [...backs, ...plan.order], ...(s.end ? dayDone() : {}), ...(s.land || s.end ? sigNow(id) : {}) });
      if (s.kind === "fs") setRetryPick(false);
    } else if (s.kind === "prep") {
      p = plan.order.length ? editRow(0, { prep: id }) : changePlan({ prep: id });
    } else {
      const g = (rid ? [rid] : runningIds(now)).map((x) => live.starts.find((y) => y.id === x)?.grp || L?.rounds?.[x]?.grp || "").filter(Boolean);
      p = changePlan(sigNow(id, [...new Set(g)].join(" · ")));
    }
    // onay penceresi veri gidene kadar açık kalır (Çek düğmesinde halka), sonra kapanır ve bildirir
    return Promise.resolve(p).then(() => {
      setFlagPick(null);
      setFlagOpen(false);
      setFlagFor("");
      toast(`${s.name} çekildi`);
    });
  };
  // Tehir inince tehir işareti de (AP/H, AP 6 saat…) ekrandan kalkar (Seyhun 2026-11-04 "tehiri indirmem canlı yayına gitmedi": işaret kartı kalıyordu)
  const apSigOff = (pl) => (signalOf(pl.sig?.id)?.kind === "ap" && !signalOf(pl.sig.id).end ? { sig: null } : {});
  // Tehiri indir: tek yol (düğme, inişi gelince kendiliğinden, eski tehir işaretinin İndir'i): denizde 1 dk, karada 60 dk sonra uyarı işareti
  const lowerAp = (at = nowMs()) => changePlan({ day: planDay, ...apLower(at, readTimer().dur || 300, dev, plan.ap?.land, plan.ap?.auto), ...apSigOff(plan) });
  // Tek grubun tehiri iner: grup sıranın başına döner, geri sayımı komite başlatır
  const lowerGrp = (g) => (changePlan({ order: grpRelease(plan.order, g) }), toast(`${g} grubun tehiri indi`));
  // tehirdeki bütün grupların tehiri iner (alttaki "Tehiri indir · Sarı")
  const lowerHeld = () => {
    const gs = heldGrps(plan.order).map((x) => x.grp);
    changePlan({ order: gs.reduce((o, g) => grpRelease(o, g), plan.order) });
    toast(`${gs.join(", ")} grubun tehiri indi`);
  };
  const lowerSig = () => (plan.status === "ap" && signalOf(plan.sig?.id)?.kind === "ap" && !signalOf(plan.sig.id).end ? lowerAp() : changePlan({ sig: null }));
  // Program sekmesi (Seyhun 2026-11-04 "çok karışık, yeniden tasarla"): her günün tek "İlk start" saati (aynı saat daily, farklı gün times;
  // ilk kez girilen saat bütün günlerin olur), "Her güne" ile bütün günler aynı saat. Bugünün / yarının saati değişirse ekranın saati de;
  // programdaki "İlk start" maddesi de aynı saate geçer (agendaFirst). Yarış olmayan gün, gün ekle/kaldır, programın maddeleri elle.
  const timePatch = (daily, times, ds, v, agenda = plan.agenda) => {
    const at = (dd) => times[dd] || daily;
    return {
      daily,
      times,
      ...(plan.status !== "ap" && at(planDay) !== dayTime(plan, planDay) ? { at: at(planDay) } : {}),
      ...(plan.next && at(plan.next.day) !== dayTime(plan, plan.next.day) ? { next: { ...plan.next, at: at(plan.next.day) } } : {}),
      agenda: agendaFirst(agenda, ds, v),
    };
  };
  const dayPatch = (d, v, agenda) => {
    const daily = plan.daily || v;
    const times = { ...plan.times };
    if (v && v !== daily) times[d] = v;
    else delete times[d];
    return timePatch(daily, times, [d], v, agenda);
  };
  const setDayTime = (d, v) => changePlan(dayPatch(d, v));
  const setAllTimes = (v) => changePlan(timePatch(v, {}, days, v));
  // Programın maddesi kaydedilir; "İlk start" maddesinin saati değiştiyse günün ilk start saati de
  const saveAg = (d, list, edited) => {
    setAgEdit(null);
    const agenda = agendaPut(plan.agenda, d, list);
    if (edited && FIRST_ITEM.test(edited.text) && /^\d\d:\d\d$/.test(edited.at) && edited.at !== dayTime(plan, d) && !plan.off.includes(d)) return changePlan(dayPatch(d, edited.at, agenda));
    return changePlan({ agenda });
  };
  // Gün ekle (sona) / kaldır (yalnız ilk ya da son gün, yarışı yoksa): yarışın tarihleri, kalkan günün saati, programı ve "yok"u da silinir
  const putDates = (pp) => {
    setRace((r) => ({ ...r, ...pp }));
    return saveRaceDates(orgId, id, pp).catch(() => toast("Yarış tarihleri kaydedilemedi."));
  };
  const addDay = () => {
    const pp = datesAdd(rdays?.length ? race.startDate : "", race?.endDate, today);
    if (!pp) return toast("En çok 10 gün.");
    setOpenDay(pp.endDate);
    setAgEdit(null);
    return putDates(pp);
  };
  const dropDay = (d) => {
    setDayAsk(false);
    if (live.starts.some((x) => x.day === d)) return toast("Bu günde yarış var. Önce yarışları sil.");
    const pp = datesDrop(race?.startDate, race?.endDate, d);
    if (!pp) return null;
    const times = { ...plan.times };
    delete times[d];
    const agenda = { ...plan.agenda };
    delete agenda[d];
    changePlan({ times, agenda, off: plan.off.filter((x) => x !== d) });
    setOpenDay("");
    return putDates(pp);
  };
  const toggleOff = (d) => {
    const on = plan.off.includes(d);
    changePlan({ off: on ? plan.off.filter((x) => x !== d) : [...plan.off, d], ...(d === planDay && (plan.status === "" || plan.status === "none") ? { status: on ? "" : "none" } : {}) });
  };
  const cShow = L?.courseShow || { auto: true, at: "", one: "", side: true };
  const pre = cleanCourseShow(cShow);
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
      // sınıf, grup, bayrak ve grubun parkur kartı o yarışa (startFlow; /canli Start penceresi de aynısı)
      if (rid) startedRow({ orgId, raceId: id, rid, row: np, rounds: L?.rounds, course }).then(reload, () => {});
      setEditI(-1);
      setMade(0);
      setRetryPick(false);
      changePlan({ order: orderWithout(plan.order, pk), warn: "" });
    },
  };
  // Gruplar ayrı ayrı (Seyhun 2026-11-02 "sarı başladı, mavi de başlayabilir; grupları ayrı yönetebilmeliyim"): bekleyen her satırın kendi
  // Başlat'ı; başka grubun geri sayımı sürerken başlamaz (yarışta olan grup sürer, Bitti ile ayrı biter)
  const startRow = (i) => {
    const no = startBlock(tr.t, plan.order[i], new Date().valueOf());
    if (no) return toast(no);
    pickRef.current = i;
    raceStart(flow, "start", race?.name || "Yarış");
  };
  // Ekranda hangi yarış (Ekranda kartındaki grup şeridi; Otomatik en son başlayana döner) ve kameraların grupları
  const onAir = L?.onAir?.sid || "";
  const putOnAir = (sid) => {
    const o = { sid: onAir === sid ? "" : sid };
    setL((p) => (p ? { ...p, onAir: o } : p));
    saveOnAir(orgId, id, o).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
  };
  const srcs = sourcesOf(L?.stream);
  // Canlı konum (Seyhun 2026-11-04): renk listesindeki tekneler ve grupları ("Sarı grup tekneler", "Mavi grup tekneler" …)
  const fleet = fleetOf(entries, groupMap(groupsOn(groups, today)));
  const fleetGrps = fleetGroups(fleet, [...plan.sets.flatMap((x) => x.grps), ...GROUP_PICK]);
  const boatsName = (g) => (g ? `${g} grup tekneler` : "Tekneler");
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
      if (apDue(plan, now)) return lowerAp(Date.parse(plan.ap.down));
      const gd = grpDue(plan.order, now);
      if (gd.length) return changePlan({ order: gd.reduce((o, g) => grpRelease(o, g), plan.order) });
      if (!warnDue(plan, now)) return;
      const mine = !plan.warnBy || plan.warnBy === dev || now - Date.parse(plan.warn) > 4000;
      if (!mine) return;
      // tek gruba tehirdeki satırlar atlanır: sıradaki tehirde olmayan start başlar (hepsi tehirdeyse geri sayım başlamaz)
      const nx = plan.order.findIndex((o) => !o.ap);
      if (countingAt(now) || nx < 0) return changePlan({ warn: "" });
      if (!plan.order[nx].prep) return (changePlan({ warn: "" }), toast("Bayrak seçilmedi, geri sayım başlamadı"));
      pickRef.current = nx;
      raceStart(flow, "start", race?.name || "Yarış");
    };
  });
  // Başka telefon tehir çektiyse bu telefonun sayacı da durur: gün tehiri ya da sayaçtaki start tehirle programa döndü
  useEffect(() => {
    if (!countingAt(nowMs())) return;
    // sayaçtaki start başka telefonda silindiyse (tehirle programa döndü) bu sayaç da durur
    const rid = rf.ridOf(readTimer());
    const gone = !!rid && liveIn.current && !live.starts.some((x) => x.id === rid);
    if (plan.status === "ap" || gone) stopCount();
  });
  const tracking = (plan.status === "ap" && !!plan.ap?.down) || !!plan.warn || heldGrps(plan.order).some((x) => x.ap.down);
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
  // Renk listesi gelince (siteden ya da yüklenen) bugünün grupları sınıfa kendiliğinden eklenir (Seyhun 2026-11-04); hiçbiri silinmez.
  // Birden çok sınıfta grup, o gruptaki teknelerin kayıt listesindeki sınıfına göre
  const grpKey = (() => {
    if (!plan.sets.length) return "";
    const gm = groupMap(groupsOn(groups, today));
    const byGrp = {};
    for (const [sail, g] of Object.entries(gm)) (byGrp[g] = byGrp[g] || []).push(sail);
    const add = {};
    for (const [g, sails] of Object.entries(byGrp)) {
      const cl = plan.sets.length === 1 ? plan.sets[0].cls : (() => {
        const cs = sails.map((sl) => entries.find((e) => String(e.sail) === sl)?.cls || "").filter(Boolean);
        const lc = (x) => String(x).toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
        return plan.sets.find((x) => cs.some((c) => lc(c).startsWith(lc(x.cls)) || lc(x.cls).startsWith(lc(c))))?.cls || "";
      })();
      const set = plan.sets.find((x) => x.cls === cl);
      if (set && !set.grps.includes(g)) (add[cl] = add[cl] || []).push(g);
    }
    return Object.keys(add).length ? JSON.stringify(add) : "";
  })();
  const grpRef = useRef("");
  useEffect(() => {
    if (!grpKey || grpRef.current === grpKey) return undefined;
    grpRef.current = grpKey;
    const add = JSON.parse(grpKey);
    const t = setTimeout(() => {
      changePlan({ sets: plan.sets.map((x) => (add[x.cls] ? { ...x, grps: [...x.grps, ...add[x.cls]].slice(0, 6) } : x)) });
      toast(`Renk listesinden gruplar eklendi: ${Object.values(add).flat().join(", ")}`);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grpKey]);
  const saveSetup = (sets) => {
    // bekleyen startlar da yeni start sırasına göre dizilir (sınıf sırası, sınıfın içinde grup sırası)
    changePlan({ sets, cls: sets[0]?.cls || "", grps: sets[0]?.grps || [], order: orderBySets(plan.order, sets) });
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
  // Ekrana aç (Seyhun 2026-11-05 "uygulama içinde açılsın, yana kaydırınca geri gidilsin"): Safari'ye atmaz, /canli uygulamada açılır
  const router = useRouter();
  const openScreen = async () => {
    try {
      await ensurePublic(id);
      openInApp(router, `/canli/${id}`);
    } catch (e) {
      toast(e?.message || "Açılamadı");
    }
  };
  const show = async (s) => {
    setBusy("x");
    try {
      await showOnScreen(orgId, id, s);
      setSel(s.kind ? { kind: s.kind, mid: s.mid, src: s.src, ...(s.kind === "boats" ? { grp: s.grp || "" } : {}) } : null);
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
  const addSrc = (k, url = "", name = "") => {
    const u = String(url || "").trim();
    if (u && !ytEmbed(u)) return toast(u.includes("/@") ? "Bu kanal bağlantısı (@ad) açılamıyor. Yayının kendi bağlantısını yapıştır: youtube.com/live/… ya da Studio'daki studio.youtube.com/video/…" : "Bağlantı tanınmadı. Yayının bağlantısını yapıştır: youtube.com/live/…, youtu.be/… ya da studio.youtube.com/video/…");
    const l = addSource(srcList, k).map((x, i, a) => (i === a.length - 1 && u ? { ...x, url: u, ...(name ? { name: String(name).slice(0, 30) } : {}) } : x));
    setAddOpen(false);
    setAddUrl("");
    setSel({ kind: "src", src: l.at(-1).id });
    putSources(l);
  };
  // Günün yayınları (Seyhun 2026-11-06 çoklu kaynak, Liste dışı): anahtarı olan kaynaklara yayın yoksa ya da bittiyse yenisi açılır,
  // link kaynağa yazılır; sayfa açıkken 3 dakikada bir bakılır (yayın kendiliğinden bitince sonraki Go Live için yenisi hazır olur)
  const ytTitle = (x) => [race?.name, x.name].filter(Boolean).join(" · ");
  const prepAt = useRef(0);
  useEffect(() => {
    if (!srcList.some((x) => x.ytStream)) return undefined;
    const run = () => {
      if (Date.now() - prepAt.current < 150e3) return;
      prepAt.current = Date.now();
      ytPrepare(srcList, ytTitle).then(
        (m) => Object.keys(m).length && putSources(srcList.map((x) => (m[x.id] ? { ...x, url: m[x.id] } : x))),
        () => {}
      );
    };
    run();
    const t = setInterval(run, 180e3);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liste ya da yarış adı değişince
  }, [srcList, race?.name]);
  // yeni anahtar: kaynağa yazılır, günün yayını hemen açılır
  const putStream = async (sid, ytStream) => {
    const l = srcList.map((x) => (x.id === sid ? { ...x, ytStream } : x));
    let m = {};
    try {
      m = await ytPrepare(l.filter((x) => x.id === sid), ytTitle);
    } catch {}
    prepAt.current = Date.now();
    putSources(l.map((x) => (m[x.id] ? { ...x, url: m[x.id] } : x)));
    toast("Anahtar hazır: adresi ve anahtarı cihaza gir");
  };
  const putSrc = (sid, p) => {
    const u = String(p.url || "").trim();
    if (u && !ytEmbed(u)) return toast(u.includes("/@") ? "Bu kanal bağlantısı (@ad) açılamıyor. Yayının kendi bağlantısını yapıştır: youtube.com/live/… ya da Studio'daki studio.youtube.com/video/…" : "Bağlantı tanınmadı. Yayının bağlantısını yapıştır: youtube.com/live/…, youtu.be/… ya da studio.youtube.com/video/…");
    putSources(srcList.map((x) => (x.id === sid ? { ...x, url: u } : x)));
  };
  // kaynağın grubu: dokununca bu kaynağa bağlanır (başka kaynaktaysa buraya geçer), yeniden dokununca çözülür
  const putSrcGrp = (sid, k) => {
    const mine = groupsOf(L?.camBy, sid);
    const m = bindCam(L?.camBy, sid, mine.includes(k) ? mine.filter((x) => x !== k) : [...mine, k]);
    setL((p) => (p ? { ...p, camBy: m } : p));
    saveCamBy(orgId, id, m).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
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
  // Konumla parkur (Seyhun 2026-11-03 "hakem botunun yanına gidip koordinatını eklerim"): Buradayım telefonun konumunu o noktaya yazar
  const [ptBusy, setPtBusy] = useState("");
  const putPt = async (k, p) => {
    setCourse((x) => {
      const pts = { ...x.pts };
      if (p) pts[k] = p;
      else delete pts[k];
      return { ...x, pts };
    });
    try {
      await saveCoursePt(orgId, id, today, k, p);
    } catch {
      toast("Kaydedilemedi. İnterneti kontrol et.");
    }
  };
  const hereFor = (k) => {
    if (!navigator.geolocation) return toast("Bu telefonda konum yok.");
    setPtBusy(k);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPtBusy("");
        const acc = Math.round(pos.coords.accuracy || 0);
        putPt(k, { lat: Math.round(pos.coords.latitude * 1e6) / 1e6, lon: Math.round(pos.coords.longitude * 1e6) / 1e6, at: new Date().toISOString() });
        toast(`${PT_LABEL[k]} yazıldı${acc ? ` · ±${acc} m` : ""}${acc > 30 ? ". Konum zayıf, biraz bekleyip yeniden bas" : ""}`);
      },
      () => {
        setPtBusy("");
        toast("Konum alınamadı. Konum iznini aç.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };
  // Sesle parkur (Seyhun 2026-11-05 "ayrı Konuş olmasın, bizim asistanı kullanalım"): ana asistanın bas-konuş düğmesi; Parkur açıkken
  // asistan önce parkura bakar (isler/yarisMedya courseCmd → courseView.apply): "rüzgâr 20 ile 35 arası", "eksen 320", "rota 1 2 3 2 3 finiş",
  // "trapez", "Bronz B kartında". Yazma burada (kart, rota, grup kartı, ölçüm); dönüş söylenecek özet, hata olursa fırlatır.
  const [obsAll, setObsAll] = useState(false);
  // Dönüş: yazılanlar [{ t: başlık, s: ayrıntı, k: parlayan kutu (wind/axis/line/route) }]; yazılamazsa fırlatır
  const applyCourseVoice = (r) =>
    writeCourseVoice(r, {
      course,
      rows: plan.sets.flatMap((x) => x.grps.map((g) => [x.cls, g])),
      putCards: async (k) => (await putCards(k), r.route && setRt(routeText(r.route))),
      putObs: async (list, len) => {
        setCourse((c) => cleanCourse({ ...c, obs: [...c.obs, ...list], ...(len ? { len: { ...(c.len || {}), ...len } } : {}) }));
        await addCourseMany(orgId, id, today, list, len);
      },
    });
  // Sesle yazılanı geri al: parkur yazımdan önceki hâline döner (tek adım)
  const undoCourse = async (prev) => {
    setCourse(cleanCourse(prev));
    setRt(routeText(selCard(cleanCourse(prev)).route));
    await saveCourse(orgId, id, today, prev);
  };
  const [talk, setTalk] = useState(false); // sesle parkur penceresi (CourseTalk)
  const [flash, setFlash] = useState([]); // sesle yazılınca bir an parlayan kutular
  useEffect(() => {
    if (!flash.length) return;
    const t = setTimeout(() => setFlash([]), 1800);
    return () => clearTimeout(t);
  }, [flash]);
  const courseLive = useRef({});
  useEffect(() => {
    courseLive.current = { course, apply: applyCourseVoice };
  });
  if (rtId !== course.sel) {
    setRtId(course.sel);
    setRt(routeText(selCard(course).route));
  }
  const vids = [...live.media].filter((m) => m.kind === "video" && m.url).reverse().slice(0, 6); // yalnız telefonda duran (ph) ekrana gidemez
  const srcOf = (sid) => srcList.find((x) => x.id === sid) || null;
  const selSrc = sel?.kind === "src" ? srcOf(sel.src) : null;
  // "Grubun kamerası" (kind live): ekrandaki yarışın grubuna bağlı kamera (Kameralar), yoksa Kamera 1
  const autoOn = Object.keys(L?.camBy || {}).length > 0;
  // Ekrandaki evre (Seyhun 2026-11-04 "otomatik geçiş neye geçiyor belli değil; yarış öncesi şu video, yarışta şu drone"): canlı ekranla aynı
  // kural (lib/raceRounds evreOf); evre buradan kabaca: gün bitti, start dizisi, yarışta, yarış bitti, tehir, bekleme
  const lastT = [...live.starts].filter((x) => x.day === today).at(-1) || null;
  const scMode = plan.status === "done" ? "summary" : cur && !cur.fin && !cur.void ? (Date.parse(cur.at) > capNow ? "seq" : "race") : lastT && (lastT.fin || lastT.void) && !cur ? "between" : "wait";
  const planAt = plan.day === today && plan.at ? Date.parse(`${today}T${plan.at}:00+03:00`) : NaN;
  const evSoon = scMode === "wait" && (orangeUp(plan, today) || (planAt > capNow && planAt - capNow <= 600e3));
  // kendiliğinden evre (Yayın › Ekran'da elle seçilmediyse ekrandaki), elle seçilen (pre.evre) üstüne yazar
  const evVd = lastT?.void && !cur ? lastT.void : "";
  const evAuto = plan.status === "ap" ? "ap" : evreOf(scMode, "", evSoon, "", { fs: /genel/i.test(evVd), aban: /abandone|iptal/i.test(evVd) });
  const evNow = pre.evre || evAuto;
  // evreye atanan görüntü varsa ekrandaki odur
  const eff = L ? evreScreen(L.screen, pre, evNow) : null;
  const onScreen = eff?.kind ? eff : null;
  // tek evrenin ataması alan alan yazılır (raceLiveStore saveEvre; başka ekranın seçimi ezilmez)
  // öğe sırası, süre ve sol alt senin listene de yazılır (showTpl; sonraki yarışlarda ve sıfırlamadan sonra aynısı)
  const putEv = (k, patch, tpl = true) => {
    const e = { ...pre.ev[k], ...patch, own: true };
    setL((p) => (p ? { ...p, courseShow: { ...p.courseShow, ev: { ...cleanCourseShow(p.courseShow).ev, [k]: e } } } : p));
    saveEvre(orgId, id, k, e).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
    if (tpl && ("items" in patch || "sec" in patch || "side" in patch)) {
      setTpl((t) => ({ ...t, [k]: { items: e.items, sec: e.sec, side: e.side } }));
      saveShowTpl(orgId, k, e).catch(() => {});
    }
  };
  // Varsayılana dön: evrenin ilk hâli (görüntü kalır), senin listen de
  const resetEv = (k) => putEv(k, { items: [...EVRE_DEF[k]], sec: 15, side: SIDE_DEF[k] });
  // Bu yarışta hiç değiştirilmemiş evreye senin listen yazılır (Seyhun 2026-11-05 "kalıcı olarak çıkartılsın, eklensin")
  const tplDone = useRef("");
  useEffect(() => {
    if (!L || !tpl || tplDone.current === id) return;
    tplDone.current = id;
    const todo = EVRES.filter((k) => tpl[k] && !pre.ev[k].own);
    if (todo.length) Promise.resolve().then(() => todo.forEach((k) => putEv(k, tpl[k], false)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, tpl, id]);
  const putVid = (k, v) => putEv(k, { vid: v ? { kind: v.kind || "", src: v.src || "", mid: v.mid || "", ...(v.kind === "boats" ? { zoom: v.zoom ?? 100, grp: v.grp || "" } : {}) } : null });
  const putEvreMan = (k) => {
    setL((p) => (p ? { ...p, courseShow: { ...p.courseShow, evre: k } } : p));
    saveEvreMan(orgId, id, k).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
  };
  const putPin = (item) => {
    setL((p) => (p ? { ...p, courseShow: { ...p.courseShow, pin: item, ...(item ? {} : { one: "" }), scene: "" } } : p));
    savePin(orgId, id, item).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
  };
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
  // Tekneler görünümü (Seyhun 2026-11-03 "tepeden startı ve parkuru, yakınlaşıp uzaklaşmak yönetimden"): ekrandaysa hemen değişir
  const zoomNow = zoom ?? (onScreen?.kind === "boats" ? (onScreen.zoom ?? 100) : 100);
  const pickZoom = (v) => {
    setZoom(v);
    if (onScreen?.kind === "boats") show({ ...onScreen, zoom: v });
  };
  // boats: mid yerine grup (Canlı konum › "Sarı grup tekneler")
  const isOn = (k, mid = "") => onScreen?.kind === k && (k === "rec" ? onScreen.mid === mid : k === "src" ? onScreen.src === mid : k === "boats" ? (onScreen.grp || "") === mid : true);
  const isSel = (k, mid = "") => sel?.kind === k && (k === "rec" ? sel.mid === mid : k === "src" ? sel.src === mid : k === "boats" ? (sel.grp || "") === mid : true);
  const c = withLiveWind(course, live.wind, today);
  const wind = [...c.obs].reverse().find((x) => x.kind === "wind");
  const scene = (() => {
    try {
      return sceneSvg(cardOf(c), selCard(course).route, { W: 960, H: 540, pre: "yp", sea: true, sail: true });
    } catch {
      return "";
    }
  })();
  // "Sarı · 2. yarış" (grup ve grubun kendi yarış numarası)
  const startLabel = (x) => (x ? [x.grp || L?.rounds?.[x.id]?.grp || "", raceName(x)].filter(Boolean).join(" · ") : "");
  // Dönüşlerin yarışı: grup şeridinde seçilen; yoksa yarışta olan en son başlayan grup (geri sayımdaki grup değil, henüz startı yok), yoksa sayacın yarışı
  const racingNow = live.starts.filter((x) => x.day === today && !x.fin && !x.void && Date.parse(x.at) <= capNow);
  const st = (selId && live.starts.find((x) => x.id === selId)) || racingNow.at(-1) || (L ? currentStart(live.starts, L.timer) : null);
  const pickable = [...racingNow].reverse().concat(live.starts.filter((x) => x.day === today && x.fin && !x.void).reverse());
  const entry = st && L ? L.rounds[st.id] : null;
  // startın grubu günün grup listesinde varsa ceza aramasında önce o grup (Seyhun 2026-11-02 "mavi grup listesini veririm")
  const dayGrp = st ? groupMap(groupsOn(groups, st.day)) : {};
  const penMembers = entry?.grp && Object.keys(dayGrp).length ? Object.keys(dayGrp).filter((s) => dayGrp[s] === entry.grp) : null;
  const penOf_ = entry?.pen || {};
  const todays = [...live.starts].filter((x) => x.day === today); // eskiden yeniye (listede 1., 2., …)
  const races = dayRaces({ starts: live.starts, order: plan.order, grpOf: (x) => x.grp || L?.rounds?.[x.id]?.grp || "", liveIds: cur ? [cur.id] : [], today, rdays });
  const nextRow = races.flatMap((r) => r.rows).find((x) => x.state === "next");
  // Tehirde seçilebilen gruplar: geri sayımdaki ve bekleyen (tehirde olmayan) gruplar; tek grup varsa seçim yok
  const apGrps = (() => {
    const t0 = L?.timer && countingAt(capNow) ? live.starts.find((x) => x.id === rf.ridOf(L.timer)) : null;
    const g = [t0 ? t0.grp || L?.rounds?.[t0.id]?.grp || "" : "", ...plan.order.filter((o) => !o.ap).map((o) => o.grp)].filter(Boolean);
    const u = [...new Set(g)];
    return u.length > 1 || (u.length && runningIds(capNow).length) ? u : [];
  })();
  // o an gösterilen öğe ve sıradaki (canlı ekranla aynı showPlan; verisi olmayan atlanır)
  const evHas = { video: !!onScreen || evNow === "start" || evNow === "race", time: true, prog: races.some((r) => r.rows.some((x) => x.state !== "done")), wind: true, course: !!scene, rank: hasSheet || scMode === "between" || live.starts.some((x) => x.fin), next: true };
  const shNow = showPlan({ show: pre, evre: evNow, has: evHas, now: capNow });
  const days = rdays?.length ? rdays : [today];
  const idle = tr.t.end == null && tr.t.left == null;
  const needRace = !!L && !nextRow && idle && plan.status !== "done";
  // Kurulum önce (Seyhun 2026-11-02 "önce sınıfları, sonra grupları seçelim; bir kere seçip kapatalım; sonra süre, program, video… gösterilsin")
  const needSetup = !!L && (setupOpen || !plan.sets.length);
  // Parkur açıkken ana asistan parkura yazar (courseView, isler/yarisMedya)
  const courseOpen = !needSetup && seen("parkur");
  useEffect(() => {
    if (!courseOpen || !id) return;
    setCourseView({ id, day: today, get: () => courseLive.current.course, apply: (r) => courseLive.current.apply(r) });
    return () => setCourseView(null);
  }, [courseOpen, id, today]);
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
    // final grupları açıklandıysa (Altın/Gümüş/Bronz) renk grupları seçilmez (Seyhun 2026-11-05)
    const grpPick = plan.sets.some((x) => x.grps.some(isFinalGrp)) ? GROUP_PICK.filter(isFinalGrp) : GROUP_PICK;
    const defs = { cls: ["Sınıf", CLASS_PICK], grp: ["Grup", grpPick], prep: ["Bayrak", PREP_PICK] };
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
    ["program", "Program", plan.off.includes(planDay) ? "Bugün yok" : dayTime(plan, planDay) ? `İlk ${dayTime(plan, planDay)}` : `${days.length} gün`, false],
    ["parkur", "Parkur", (CARD_TYPES[selCard(course).type] || "").split(" ")[0], false],
    ["sporcu", "Sporcu", entries.length ? `${entries.length}` : "—", false],
    ["belge", "Belgeler", race?.results?.files?.length ? "Sonuç var" : "—", false],
    ["donus", "Dönüş", entry?.route?.length ? `${legsDone}/${entry.route.length}` : entries.length ? `${entries.length} tekne` : "—", false],
  ];
  const monRec = onScreen?.kind === "rec" ? live.media.find((m) => m.id === onScreen.mid) : null;
  const pDay = days.includes(openDay) ? openDay : days.includes(planDay) ? planDay : days[0];
  const groupRows = plan.sets.flatMap((x) => (x.grps.length ? x.grps.map((g) => [x.cls, g]) : [[x.cls, ""]]));
  // Parkur sekmesi: seçili kartla yarışan gruplar, hat avantajı, son ölçümler (rüzgâr · hat · eksen)
  const selWho = (() => {
    if (groupRows.length < 2) return "";
    const on = groupRows.filter(([x, g]) => cardFor(course, x, g).id === course.sel).map(([x, g]) => g || x);
    return on.length ? `${on.join(" ve ")} bu kartla` : "";
  })();
  const bias = (() => {
    try {
      return lineBias(c);
    } catch {
      return null;
    }
  })();
  const cpts = (() => {
    try {
      return coursePoints(c);
    } catch {
      return null;
    }
  })();
  const [typeOpen, setTypeOpen] = useState(false); // Parkur: harita üstündeki kart türü seçimi
  const [ptOpen, setPtOpen] = useState(""); // Parkur: girilmiş konum (Buradayım / Sil)
  const lastOf = (k) => [...c.obs].reverse().find((x) => x.kind === k) || null;
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

  // Ekrandaki yarış: grup şeridinden seçilen, yoksa en son başlayan (sunucu da böyle seçer, /api/canli onAirStart)
  const airStart = live.starts.find((x) => x.id === onAir && !x.void) || currentStart(live.starts.filter((x) => x.day === today), L?.timer);
  // Canlıya alınabilecek yarışlar: bugün süren (yarışta, geri sayımda), sonra bugün bitenler (en yeni önce)
  const airPick = [...live.starts.filter((x) => x.day === today && !x.void && !x.fin)].reverse().concat(live.starts.filter((x) => x.day === today && !x.void && x.fin).reverse());
  const airE = airStart ? L?.rounds?.[airStart.id] || {} : {};
  const airCam = airStart ? srcs.find((c) => c.id === camOf(L?.camBy, airE.cls || "", airE.grp || airStart.grp || "")) : null;
  // Ekranda: canlıysa küçük oynatıcı (sessiz), kayıtsa küçük resmi; Önizleme: seçilen kaynak (yalnız burada)
  const airUrl = onScreen && onScreen.kind !== "rec" ? (onScreen.kind === "live" && airCam?.url ? airCam.url : screenUrl(onScreen, { ...L?.stream, sources: srcList })) : "";
  const monName = monRec ? recName(monRec, live.starts) : onScreen?.kind === "boats" ? `${boatsName(onScreen.grp)} · Canlı konum` : onScreen?.kind === "src" ? srcOf(onScreen.src)?.name || "Canlı" : onScreen?.kind === "live" ? airCam?.name || "Grubun kamerası" : onScreen?.kind === "drone" ? "Drone" : "Video";
  const pvRec = sel?.kind === "rec" ? live.media.find((m) => m.id === sel.mid) : null;
  const pvUrl = selSrc?.url || (sel?.kind === "live" ? airCam?.url || L?.stream.url || "" : "");
  // evrenin görüntüsünün adı ve kapağı (Ekran › Evreler)
  const vidOf = (v) => (!v ? null : v.kind === "src" ? srcOf(v.src) : null);
  const vidName = (k) => {
    const v = pre.ev[k]?.vid;
    if (!v) return "Ekrandaki";
    if (!v.kind) return "Bulanık foto";
    if (v.kind === "src") return vidOf(v)?.name || "Canlı";
    if (v.kind === "live") return "Grubun kamerası";
    if (v.kind === "boats") return boatsName(v.grp);
    const m = live.media.find((x) => x.id === v.mid);
    return m ? recName(m, live.starts) : "Kayıt";
  };
  const sceneThumb = (k) => {
    const v = pre.ev[k]?.vid || (k === evNow ? onScreen : null);
    if (v?.kind === "src") return ytThumb(vidOf(v)?.url, stat[vidOf(v)?.url]?.vid) || "";
    if (v?.kind === "live") return ytThumb(airCam?.url, stat[airCam?.url]?.vid) || "";
    if (v?.kind === "rec") return live.media.find((x) => x.id === v.mid)?.thumb || "";
    return "";
  };
  const pvName = selSrc?.name || (sel?.kind === "live" ? "Grubun kamerası" : sel?.kind === "boats" ? boatsName(sel.grp) : pvRec ? recName(pvRec, live.starts) : "");
  const takeOk = !!sel && (sel.kind === "rec" || sel.kind === "boats" || !!ytEmbed(pvUrl));
  const nLive = srcList.filter((x) => stat[x.url]?.live).length;
  // satırdan başlatma: geri sayım sürmüyor, tehir yok, gün bitmedi
  const canRow = plan.status !== "ap" && plan.status !== "done" && tr.t.left == null && !(cur && Date.parse(cur.at) > capNow);
  // Büyük kart (Seyhun 2026-11-04 "sıradaki yarış büyük kartta, Başlat büyük; hangisi başlatılırsa o büyür, başladıysa sıradaki büyür"):
  // geri sayımdaki grup, yoksa sıradaki bekleyen
  const hero = (() => {
    for (const r of races) for (const x of r.rows) if (x.start && cdRow(x.start.id)) return { x, n: r.n, cd: true };
    if (!canRow) return null;
    // grup çipinden ya da tablodan seçilen bekleyen start, yoksa sıradaki
    for (const r of races) for (const x of r.rows) if (!x.start && x.state !== "ap" && heroPick >= 0 && x.i === heroPick) return { x, n: r.n, cd: false };
    for (const r of races) for (const x of r.rows) if (!x.start && x.state === "next") return { x, n: r.n, cd: false };
    for (const r of races) for (const x of r.rows) if (!x.start && x.state === "wait") return { x, n: r.n, cd: false };
    return null;
  })();
  const heroX = hero?.x || null;
  const heroE = hero ? (hero.cd ? L?.rounds?.[heroX.start.id] || {} : heroX.plan || {}) : {};
  const heroPrep = prepName(heroE?.prep) || "";
  const heroPaused = !!hero?.cd && tr.t.left != null;
  const orangeOn = orangeUp(plan, today);
  // Günün ilk startı henüz verilmediyse ilk start saati (Süre kartında geri sayım: uyarı işareti = start − süre)
  const firstAt = plan.status !== "ap" && plan.status !== "done" && !races.some((r) => r.rows.some((y) => y.start)) ? dayTime(plan, planDay) || plan.at : "";
  // Turuncu bayrak çek / indir: her bayrak işlemi onay sorar (Seyhun kuralı); onaylanınca kayıt bitene kadar düğmede halka
  const askOrange = (up) =>
    confirmIt({
      title: up ? "Turuncu bayrak çekilsin mi?" : "Turuncu bayrak indirilsin mi?",
      text: up ? "Start hattı kuruldu; canlı ekranda start kartı turuncu olur." : "",
      yes: up ? "Çek" : "İndir",
      danger: false,
      run: () => changePlan({ orange: up ? new Date().toISOString() : "" }),
    });
  const heroCount = (() => {
    if (!hero?.x.grp) return 0;
    const gm = groupMap(groupsOn(groups, today));
    return Object.values(gm).filter((g) => g === hero.x.grp).length;
  })();
  // Süre: başlatılabilecek bekleyen startlar (her grubun ilki), yarıştaki gruplar, tablonun sütunları, büyük kartın rota kartı
  const heroOpts = (() => {
    const seen = new Set();
    const out = [];
    for (const r of races) for (const x of r.rows) {
      const k = x.grp || x.plan?.cls || "";
      if (x.start || x.state === "ap" || seen.has(k)) continue;
      seen.add(k);
      out.push({ x, n: r.n });
    }
    return out;
  })();
  const racing = races.flatMap((r) => r.rows.filter((x) => x.start && x.state === "live" && !cdRow(x.start.id)).map((x) => ({ x, n: r.n })));
  const cols = (() => {
    const g = [...groupRows.map(([, gg]) => gg), ...races.flatMap((r) => r.rows.map((x) => x.grp || ""))];
    return [...new Set(g)];
  })();
  const heroCard = heroX ? cardFor(course, heroE?.cls || "", heroX.grp || "") : selCard(course);
  // grubun son dönüşü: "2. şamandıra · 9/14 döndü", "Finiş · 3/14 bitirdi", yoksa start saati
  const roundTxt = (s) => {
    const e = L?.rounds?.[s.id];
    const route = e?.route || [];
    const legs = e?.legs || [];
    let last = -1;
    route.forEach((_, k) => {
      if ((legs[k] || []).length) last = k;
    });
    if (last < 0) return `Start ${hm(s.at)} · dönüş yok`;
    const m = route[last];
    const n = legs[last].length;
    const tot = (legs[0] || []).length;
    return `${m === "F" ? "Finiş" : markName(m)} · ${last && tot ? `${n}/${tot}` : n} ${m === "F" ? "bitirdi" : "döndü"}`;
  };
  // Kural bayrağı varsayılan olur (Seyhun 2026-11-05): bu sınıfın bekleyen bütün startları ve yeni yarışlar bu bayrakla
  const setPrep = (x, f) => {
    const cl = x.plan?.cls || "";
    changePlan({ prep: f, order: plan.order.map((o) => (o.cls === cl ? { ...o, prep: f } : o)) });
  };
  const grpName = (k) => { const [c, g] = k.split("|"); return g || c; };
  // Finiş penceresi (Seyhun 2026-11-05): ilk tekne finişe yazılınca ya da "İlk finiş"e basılınca 15 dk açılır (±5 dk); süre bitince yarış
  // kendiliğinden biter, bitirmeyen ve başka cezası olmayan teknelere DNF yazılır (grubun listesi, yoksa dönüşte görülenler)
  const putStarts = (fn) => change((l) => { const next = fn(l.starts); saveStarts(orgId, id, next).catch(() => {}); return { starts: next }; });
  const endRace = (s) => (upRow(s.id) ? raceFinish(flow) : putStarts((l) => finishRace(l, s.id, Date.now(), rdays)));
  const winTick = () => {
    for (const x of finishSteps({ starts: live.starts, rounds: L.rounds, groups, today, now: capNow })) {
      if (x.k === "open") putStarts((l) => openWin(l, x.s.id, x.at));
      else if (x.k === "end") endRace(x.s);
      else {
        if (upRow(x.s.id)) raceFinish(flow); // pencere sayfa kapalıyken bittiyse sayaç da durur
        putStarts((l) => l.map((y) => (y.id === x.s.id ? { ...y, dnf: true } : y)));
        if (x.pen) setPickOf(x.s.id, { pen: x.pen });
      }
    }
  };
  useEffect(() => {
    if (!L || !capNow) return;
    const t = setTimeout(() => winTick(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capNow, L, live.starts]);

  const apSig = signalOf(apSigId(plan));

  return (
    <Board.Provider value={board ? slots : null}>
    <main className={`masa${board && !needSetup ? " board" : ""} mx-auto max-w-[30rem] px-5 md:max-w-[44rem] pb-[calc(env(safe-area-inset-bottom)+7rem)]`}>
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
          <button type="button" onClick={() => setMenu(true)} aria-label="Diğer işler" data-press className="ck-glass flex size-12 shrink-0 items-center justify-center rounded-full text-[1.25rem] font-bold leading-none">
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
              {/* bayrak düğmesindeki bayraklar (raceSignals flagSvg): AP, AP üzeri H, AP üzeri 6… (Seyhun 2026-11-04 "tehir 6 çektim, yalnız Tehir yazıyor") */}
              <FlagIcons ids={apSig.flags} />
              <b className="min-w-0 flex-1 truncate text-[1rem] font-semibold">{plan.status === "ap" ? [apSig.short, plan.ap?.down ? `iniş ${trHm(plan.ap.down)}` : apSig.hours ? "" : "belirsiz"].filter(Boolean).join(" · ") : "Tehir indi"}</b>
              {plan.status === "ap" && plan.ap?.down ? <b className="shrink-0 text-[1.375rem] font-bold tabular-nums">{mmss(Math.max(0, Math.ceil((Date.parse(plan.ap.down) - (tick || capNow)) / 1000)))}</b> : null}
              {/* Tehir çekildikten sonra düzeltme (Seyhun 2026-11-03 "hatalı bir şey olursa değişim yapılabilmeli"): iniş, yer, inince, sebep */}
              {plan.status === "ap" ? (
                <button type="button" data-press onClick={() => setAp({ min: null, why: plan.ap?.why || AP_WHY[0], land: !!plan.ap?.land, auto: plan.ap?.auto !== false, hours: plan.ap?.hours || 0, edit: true })} className="masa-b gl">
                  Düzelt
                </button>
              ) : null}
              {plan.status !== "ap" && plan.warn ? <b className="shrink-0 text-[1.375rem] font-bold tabular-nums">{mmss(Math.max(0, Math.ceil((Date.parse(plan.warn) - (tick || capNow)) / 1000)))}</b> : null}
              {plan.status !== "ap" && plan.warn ? (
                <button type="button" onClick={() => changePlan({ warn: "" })} className="masa-b gl">
                  Bekle
                </button>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-12">
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-white/65">
                {plan.status === "ap" ? [plan.ap?.land ? "Karada" : "Denizde", plan.ap?.why].filter(Boolean).join(" · ") : plan.order.length ? "Uyarı işaretinde geri sayım kendiliğinden başlar" : "Önce yarışı oluştur"}
              </span>
              {/* İnince geri sayım kendiliğinden mi (Seyhun 2026-11-03 seçilebilir); tehir çekiliyken de değiştirilir. Denizde 1 dk, karada 60 dk */}
              {plan.status === "ap" ? (
                <button type="button" aria-pressed={!!plan.ap?.auto} onClick={() => changePlan({ ap: { ...plan.ap, auto: !plan.ap?.auto } })} className="masa-b gl">
                  {plan.ap?.auto ? `İnince ${apGap(plan.ap?.land)} dk sonra geri sayım` : "Geri sayımı sen başlatırsın"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {needSetup ? (
          <Setup sets={plan.sets} guess={raceClasses(race)} onSave={saveSetup} onCancel={plan.sets.length ? () => setSetupOpen(false) : null} />
        ) : needFlag ? (
          <FlagPick no={nextRow?.n || 1} again={!!nextRow?.retry} sets={[{ cls: nextPlan.cls, grps: nextPlan.grp ? [nextPlan.grp] : [] }]} value="" onPick={(g) => (editRow(0, { prep: g }), setRetryPick(true))} />
        ) : (
          <>
          {(made || retryPick) && idle ? (
            <button type="button" onClick={undoRace} data-press className="masa-b gl mt-3 gap-1.5">
              <span aria-hidden="true">‹</span>
              {`Geri · ${prepName(nextPlan?.prep || plan.prep) || "Bayrak"}`}
            </button>
          ) : null}
          </>
        )}
      </section>

      <div className={`relative -mx-5 space-y-6 bg-bg px-5 pb-1 ${slim ? "pt-2" : "-mt-6 rounded-t-[1.75rem] pt-5"}`}>
        {/* Yayın masası (Seyhun 2026-11-02, masa/B-koyu-masa.png): sekmeler tek kartta, altında kısa durum; iş düğmeleri altta sabit */}
        {needSetup || board ? null : <MasaTabs value={tab} onChange={setTab} tabs={tabInfo} />}
        {!needSetup && seen("sure") ? (
          <Pane k="sure">
        {/* Süre (Seyhun 2026-11-05 örnek yayin-tasarim/sure-yeni/ornek.png onaylandı): üstte yarıştaki grupların küçük şeritleri (durum, süre;
            dokununca Bitti · Bayrak · Dönüş · Abandone); ortada başlatılacak grubun büyük kartı (grup çipleri, kural bayrağı ve rota kartı seçili
            kalır, "Değiştir"; süre, turuncu, Başlat); start verilince grup üstteki şeritlere iner, sıradaki grup büyür. Altta yarış × grup tablosu.
            Ekranda kartı ve kameralar Ekran sekmesinde. */}
        <div className="masa-sure space-y-5">
        {racing.length ? (
          <section>
            <Head title="Yarışta" right={`${racing.length} grup`} />
            <div className="space-y-2">
              {racing.map(({ x, n }) => {
                const s = x.start;
                const open = pickId === s.id;
                const up = upRow(s.id);
                return (
                  <div key={s.id} className={`sure-mini${open ? " open" : ""}`} style={{ "--g": (x.grp && groupColor(x.grp)) || "var(--mut)" }}>
                    <button type="button" onClick={() => setPickId(open ? "" : s.id)} className="sure-mini-h" data-press>
                      <span className="min-w-0 flex-1 leading-tight">
                        <b className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{[x.grp || L?.rounds?.[s.id]?.cls || "Start", `${n}. yarış`].join(" · ")}</span>
                          {airStart?.id === s.id ? <span className="masa-onair-tag">Ekranda</span> : null}
                        </b>
                        <small>{roundTxt(s)}</small>
                      </span>
                      <em>{mmss(up ? upSec(tr.t.end, tr.now) : Math.max(0, Math.floor((nowS - Date.parse(s.at)) / 1000)))}</em>
                    </button>
                    {s.fw ? (
                      <div className="sure-win">
                        <span className="min-w-0 flex-1">
                          Finiş penceresi <WinLeft fw={s.fw} />
                        </span>
                        {open ? (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => putStarts((l) => moveWin(l, s.id, Date.now(), -5))}>
                              −5 dk
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => putStarts((l) => moveWin(l, s.id, Date.now(), 5))}>
                              +5 dk
                            </Button>
                            <Button size="sm" onClick={() => endRace(s)}>
                              Bitir
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {open ? (
                      <div className="sure-acts">
                        {s.fw ? null : (
                          <Button size="sm" onClick={() => putStarts((l) => openWin(l, s.id, Date.now()))}>
                            İlk finiş
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => (setFlagFor(s.id), setFlagOpen(true))}>
                          Bayrak
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => (setSelId(s.id), goTab("donus"))}>
                          Dönüş
                        </Button>
                        <Button size="sm" variant="secondary" className="text-rec" onClick={() => setFlagPick({ id: "N", rid: s.id })}>
                          Abandone
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
        {hero ? (
          <section className="sure-hero">
            <Head title="Başlatılacak" />
              <div className={`masa-hero g${hero.cd ? " cd" : ""}`} style={{ "--g": (heroX.grp && groupColor(heroX.grp)) || "#2a4a7a" }} aria-live="polite">
                <div className="masa-hero-h">
                  <span className="masa-hero-bd">{hero.cd ? (heroPaused ? "Durdu" : "Geri sayım") : "Sıradaki"}</span>
                  <span>{[`${hero.n}. yarış`, hero.cd ? (heroPrep ? `${heroE.prep} çekili` : "") : heroE?.cls].filter(Boolean).join(" · ")}</span>
                  {!hero.cd ? (
                    <button type="button" className="sure-more" aria-label="Diğer" aria-pressed={chg === "more"} onClick={() => setChg(chg === "more" ? "" : "more")} data-press>
                      ⋯
                    </button>
                  ) : null}
                </div>
                <div className="masa-hero-n">
                  <span className="size-3.5 shrink-0 rounded-full" style={{ background: heroX.grp ? groupColor(heroX.grp) : "var(--mut)" }} aria-hidden="true" />
                  <b>{heroX.grp ? `${heroX.grp} grup` : heroE?.cls || "Start"}</b>
                  <small>{!hero.cd && heroCount ? `${heroCount} tekne` : ""}</small>
                </div>
                {hero.cd ? (
                  <>
                    <div className="masa-hero-t">{mmss(Math.max(0, heroPaused ? tr.t.left : tr.rem))}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" onClick={heroPaused ? resumeCd : pauseCd}>
                        {heroPaused ? "Devam" : "Dur"}
                      </Button>
                      <Button variant="danger" onClick={() => openAp()}>
                        Tehir
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      <Button size="sm" variant="secondary" disabled={heroPaused || tr.rem <= 60} onClick={() => shiftCd(tr.t.end - 60000)}>
                        −1 dk
                      </Button>
                      <Button size="sm" variant="secondary" disabled={heroPaused} onClick={() => shiftCd(Date.now() + Math.round(tr.rem / 60) * 60000)}>
                        Eşitle
                      </Button>
                      <Button size="sm" variant="secondary" disabled={heroPaused} onClick={() => shiftCd(tr.t.end + 60000)}>
                        +1 dk
                      </Button>
                      <Button size="sm" variant="secondary" className="text-rec" onClick={() => raceCancel(flow)}>
                        İptal
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {chg === "more" ? (
                      <div className="sure-set">
                        <span>
                          <b>Bu startı sil</b>
                        </span>
                        <button type="button" data-press onClick={() => (setChg(""), setHeroPick(-1), changePlan({ order: plan.order.filter((_, k) => k !== heroX.i) }))}>
                          Sil
                        </button>
                      </div>
                    ) : null}
                    {heroOpts.length > 1 ? (
                      <div className="sure-pick" aria-label="Grup">
                        {heroOpts.map(({ x, n }) => (
                          <button key={x.key} type="button" data-press aria-pressed={x.i === heroX.i} onClick={() => (setChg(""), setHeroPick(x.i))}>
                            <i style={{ background: (x.grp && groupColor(x.grp)) || "var(--mut)" }} aria-hidden="true" />
                            {[x.grp || x.plan?.cls || "Start", n !== hero.n ? n : ""].filter(Boolean).join(" ")}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {/* Kural bayrağı ve rota kartı seçili kalır (Seyhun 2026-11-05 "çok alan kaplamasın, Değiştir yazarız") */}
                    <div className="sure-set">
                      <span className="sure-art">{heroE?.prep ? <FlagArt p={heroE.prep} /> : null}</span>
                      <span>
                        <small>Kural bayrağı</small>
                        <b>{heroE?.prep ? (heroE.prep === "Kara" ? "Siyah" : heroE.prep) : "Seçilmedi"}</b>
                      </span>
                      <button type="button" data-press aria-pressed={chg === "prep"} onClick={() => setChg(chg === "prep" ? "" : "prep")}>
                        Değiştir
                      </button>
                    </div>
                    {chg === "prep" ? (
                      <div className="sure-opts five">
                        {PREP_PICK.map((f) => (
                          <button key={f} type="button" data-press aria-pressed={heroE?.prep === f} onClick={() => (setPrep(heroX, f), setChg(""))}>
                            <span className="sure-art">
                              <FlagArt p={f} />
                            </span>
                            <small>{f === "Kara" ? "Siyah" : f}</small>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="sure-set">
                      <span className="sure-art card">{heroCard.id}</span>
                      <span>
                        <small>Rota kartı</small>
                        <b>{[`Kart ${heroCard.id}`, CARD_TYPES[heroCard.type] || "", routeText(heroCard.route || [])].filter(Boolean).join(" · ")}</b>
                      </span>
                      {course.cards?.length > 1 ? (
                        <button type="button" data-press aria-pressed={chg === "card"} onClick={() => setChg(chg === "card" ? "" : "card")}>
                          Değiştir
                        </button>
                      ) : null}
                    </div>
                    {chg === "card" ? (
                      <div className="sure-opts">
                        {course.cards.map((k) => (
                          <button key={k.id} type="button" data-press aria-pressed={k.id === heroCard.id} onClick={() => (setChg(""), k.id !== heroCard.id && putCards({ by: { ...course.by, [cardKey(heroE?.cls || "", heroX.grp || "")]: k.id } }, `${heroX.grp || heroE?.cls || "Start"}: Kart ${k.id}`))}>
                            <b>{k.id}</b>
                            <small>{CARD_TYPES[k.type] || ""}</small>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {firstAt ? <FirstStart day={planDay} at={firstAt} dur={tr.t.dur || 300} /> : null}
                    <div className="masa-hero-d">
                      {[300, 240, 120, 60].map((d) => (
                        <button key={d} type="button" data-press aria-pressed={tr.t.dur === d} onClick={() => chooseDur(d)}>
                          {d / 60}
                          <small>dk</small>
                        </button>
                      ))}
                    </div>
                    {orangeOn ? (
                      <div className="masa-oup">
                        <span className="masa-ofl" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <b>Turuncu çekili</b>
                          <small>{`${hm(plan.orange)}'den beri`}</small>
                        </span>
                        <button type="button" data-press className="masa-b gl" onClick={() => askOrange(false)}>
                          İndir
                        </button>
                      </div>
                    ) : (
                      <Button variant="secondary" className="masa-hero-or" onClick={() => askOrange(true)}>
                        <span className="masa-ofl" aria-hidden="true" />
                        Turuncu bayrağı çek
                      </Button>
                    )}
                    <Button className="masa-hero-go mt-2" onClick={() => (setChg(""), setHeroPick(-1), startRow(heroX.i))}>
                      {`Başlat · ${heroX.grp || heroE?.cls || "Start"}`}
                    </Button>
                  </>
                )}
              </div>
          </section>
        ) : null}
        <section>
          <Head title="Bugün" right={plan.status === "done" ? "Gün bitti" : plan.status === "none" ? "Bugün yarış yok" : plan.status === "ap" ? "Start ertelendi" : plan.at ? `İlk start ${plan.at}` : ""} />
          {races.length ? (
            // Yarış × grup tablosu (Seyhun 2026-11-05 "1. yarış Mavi, 1. yarış Sarı… net görmeliyim"): satır yarış, sütun grup; bekleyen kutuya
            // dokununca o start büyük karta gelir, başlamışa dokununca işleri (yarışta) ya da dönüşleri (bitti) açılır
            <div className="sure-grid" style={{ "--cols": cols.length }}>
              <div className="sure-gr head">
                <span>Yarış</span>
                {cols.map((g) => (
                  <span key={g || "-"}>
                    {g ? <i style={{ background: groupColor(g) || "var(--mut)" }} aria-hidden="true" /> : null}
                    {g || "Start"}
                  </span>
                ))}
              </div>
              {races.map((r) => (
                <div key={r.n} className="sure-gr">
                  <span>{`${r.n}.`}</span>
                  {cols.map((g) => {
                    const x = r.rows.filter((y) => (y.grp || "") === g).at(-1);
                    if (!x) return <span key={g || "-"} />;
                    const s = x.start;
                    const cd = !!s && cdRow(s.id);
                    const t =
                      x.state === "done" ? [raceTime(s), "bitti"]
                      : x.state === "void" ? ["—", s.void === "Genel geri çağırma" ? "genel geri" : "abandone"]
                      : cd ? [`−${mmss(Math.max(0, tr.t.left != null ? tr.t.left : tr.rem))}`, tr.t.left != null ? "durdu" : "geri sayım"]
                      : s ? [mmss(upRow(s.id) ? upSec(tr.t.end, tr.now) : Math.max(0, Math.floor((nowS - Date.parse(s.at)) / 1000))), "yarışta"]
                      : x.state === "ap" ? ["tehir", ""]
                      : x.i === heroX?.i && !hero?.cd ? ["sıradaki", x.plan?.prep === "Kara" ? "Siyah" : x.plan?.prep || ""]
                      : ["bekliyor", ""];
                    const cls = x.state === "done" ? "ok" : x.state === "void" ? "void" : cd ? "cd" : s ? "live" : x.state === "ap" ? "ap" : x.i === heroX?.i && !hero?.cd ? "nx" : "";
                    const tap = () => (s ? (x.state === "live" && !cd ? setPickId(s.id) : x.state === "done" ? (setSelId(s.id), goTab("donus")) : null) : x.state !== "ap" && canRow ? (setChg(""), setHeroPick(x.i)) : null);
                    return (
                      <button key={g || "-"} type="button" onClick={tap} className={cls} style={{ "--g": (g && groupColor(g)) || "#2a4a7a" }}>
                        <b>{t[0]}</b>
                        {t[1] ? <small>{t[1]}</small> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}
          {plan.status === "ap" ? <p className={`${card} mt-2 px-4 py-2.5 text-[0.875rem] font-semibold text-warn`}>{apText(plan)}</p> : null}
          {/* Start sırası görünür (Seyhun 2026-11-04 "grup sıralamasını nereden değiştiriyoruz?"): sıra burada yazar, Değiştir kurulumu açar */}
          {groupRows.length > 1 ? (
            <div className={`${card} mt-2 flex items-center gap-3 px-4 py-2`}>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[0.8125rem] font-semibold text-mut">Start sırası</span>
                <span className="flex min-w-0 items-center gap-1.5 truncate text-[0.9375rem] font-semibold">
                  {groupRows.map(([cl, g], k) => (
                    <span key={`${cl}|${g}`} className="flex shrink-0 items-center gap-1">
                      {k ? <span className="text-mut">·</span> : null}
                      {g ? <span className="size-2.5 rounded-full" style={{ background: groupColor(g) }} aria-hidden="true" /> : null}
                      {g || cl}
                    </span>
                  ))}
                </span>
              </span>
              <Button size="sm" variant="secondary" full={false} onClick={() => (setSetupOpen(true), window.scrollTo({ top: 0 }))}>
                Değiştir
              </Button>
            </div>
          ) : null}
        </section>
        </div>
        {plan.sig && signalOf(plan.sig.id)?.kind !== "prep" ? (
          <div className={`${card} flex items-center gap-3 px-4 py-2.5`}>
            <span className="masa-flags" aria-hidden="true">
              {signalOf(plan.sig.id).flags.map((f) => (
                <i key={f} dangerouslySetInnerHTML={{ __html: flagSvg(f) }} />
              ))}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block truncate font-semibold">{signalOf(plan.sig.id).short}</b>
              <span className="block truncate text-[0.8125rem] text-mut">{`Ekranda · ${trHm(plan.sig.at)}`}</span>
            </span>
            <Button size="sm" variant="secondary" full={false} onClick={lowerSig}>
              İndir
            </Button>
          </div>
        ) : null}
        <MasaBar>
              {plan.status === "ap" ? (
                <Button onClick={() => lowerAp()}>Tehiri indir</Button>
              ) : !countingAt(capNow) && heldGrps(plan.order).length ? (
                // tek gruba tehir çekiliyse alttaki düğme onu indirir (Seyhun 2026-11-04 "tehiri indir dediğimde yine tehir çekme açılıyor")
                <Button onClick={lowerHeld}>
                  {`Tehiri indir · ${heldGrps(plan.order).map((x) => x.grp).join(", ")}`}
                </Button>
              ) : countingAt(capNow) ? (
                // start dizisi başladıysa tehir bayrağı hazırda (Seyhun 2026-11-03 19:28); yine onay sorar
                <Button variant="danger" onClick={() => openAp()}>
                  <span className="masa-fl" aria-hidden="true" dangerouslySetInnerHTML={{ __html: flagSvg("AP") }} />
                  Tehir
                </Button>
              ) : (
                <Button variant="secondary" onClick={addRace}>
                  + Yarış
                </Button>
              )}
              <Button variant="secondary" onClick={() => setFlagOpen(true)}>
                Bayrak
              </Button>
              {plan.status === "done" ? null : (
                <Button variant="secondary" onClick={() => (askEnd ? (setAskEnd(false), changePlan({ day: planDay, status: "done", orange: "", next: plan.next || { day: tomorrow, at: dayTime(plan, tomorrow) || plan.at } })) : setAskEnd(true))}>
                  {askEnd ? "Emin misin?" : "Günü bitir"}
                </Button>
              )}
            </MasaBar>
          </Pane>
        ) : null}
        {!needSetup && seen("program") ? (
          <Pane k="program">
        {/* Program (Seyhun 2026-11-04 "çok karışık, zor; yeniden tasarla"): üstte günler (+ Gün ekle), altta seçili günün kartı: Yarış Var/Yok,
            tek İlk start saati (günler farklıysa "Her güne"), canlı ekranda görünen programın maddeleri (dokun: düzelt/sil, + ekle), o günün
            yapılan yarışları (dokun: Sil). Bekleyen startlar Süre'de. "Programı ekle" alttan açılır (fotoğraf, PDF ya da yazı → yapay zekâ) */}
        <div className="masa-days">
          {days.map((d, k) => {
            const ds = live.starts.filter((x) => x.day === d);
            const nRaces = new Set(ds.filter((x) => !x.void).map((x) => x.n)).size;
            const off = plan.off.includes(d);
            return (
              <button key={d} type="button" aria-pressed={pDay === d} onClick={() => (setDelId(""), setAgEdit(null), setDayAsk(false), setOpenDay(d))} className={`masa-day${off ? " off" : ""}`}>
                <small>{d === today ? "BUGÜN" : `${k + 1}. GÜN`}</small>
                <b>{dayLong(d)}</b>
                <span>{off ? "Yarış yok" : [dayTime(plan, d) || "--:--", nRaces ? `${nRaces} yarış` : ""].filter(Boolean).join(" · ")}</span>
              </button>
            );
          })}
          {days.length < 10 ? (
            <button type="button" onClick={addDay} className="masa-day add">
              <b aria-hidden="true">+</b>
              <span>Gün ekle</span>
            </button>
          ) : null}
        </div>
        {(() => {
          const d = pDay;
          const ds = live.starts.filter((x) => x.day === d);
          const off = plan.off.includes(d);
          const items = plan.agenda?.[d] || [];
          const ed = agEdit?.d === d ? agEdit : null;
          const differs = days.some((x) => x !== d && !plan.off.includes(x) && dayTime(plan, x) !== dayTime(plan, d));
          const canDrop = days.length > 1 && !!rdays?.length && (d === days[0] || d === days.at(-1)) && !ds.length;
          const editor = (
            <div key="ed" className="border-b border-line last:border-0">
              <div className={row}>
                <input type="time" value={ed?.at || ""} onChange={(e) => setAgEdit((x) => ({ ...x, at: e.target.value }))} aria-label="Maddenin saati" className="masa-time" />
                <input value={ed?.text || ""} maxLength={40} autoFocus onChange={(e) => setAgEdit((x) => ({ ...x, text: e.target.value }))} placeholder="Ne var?" aria-label="Madde" className="masa-text" />
              </div>
              <div className="grid grid-cols-2 gap-2 px-4 pb-3">
                <Button variant="secondary" onClick={() => (ed.i < 0 ? setAgEdit(null) : saveAg(d, items.filter((_, k) => k !== ed.i)))}>
                  {ed?.i < 0 ? "Vazgeç" : "Sil"}
                </Button>
                <Button disabled={!ed?.text.trim()} onClick={() => saveAg(d, ed.i < 0 ? [...items, { at: ed.at, text: ed.text }] : items.map((y, k) => (k === ed.i ? { at: ed.at, text: ed.text } : y)), ed)}>
                  Kaydet
                </Button>
              </div>
            </div>
          );
          return (
            <>
              <section>
                <div className={`${card} overflow-hidden`}>
                  <div className={`${row} border-b border-line`}>
                    <span className="flex-1 font-semibold">Yarış</span>
                    <div className="masa-seg">
                      <button type="button" aria-pressed={!off} onClick={() => off && toggleOff(d)}>
                        Var
                      </button>
                      <button type="button" aria-pressed={off} onClick={() => !off && toggleOff(d)}>
                        Yok
                      </button>
                    </div>
                  </div>
                  {off ? null : (
                    <div className={`${row} border-b border-line last:border-0`}>
                      <span className="flex-1 font-semibold">İlk start</span>
                      {differs && dayTime(plan, d) ? (
                        <Button size="sm" variant="secondary" full={false} onClick={() => setAllTimes(dayTime(plan, d))}>
                          Her güne
                        </Button>
                      ) : null}
                      <TimeIn value={dayTime(plan, d)} onSave={(v) => setDayTime(d, v)} aria-label="Bu günün ilk start saati" className="masa-time" />
                    </div>
                  )}
                  {canDrop ? (
                    <div className="p-3">
                      <Button variant={dayAsk ? "danger" : "secondary"} onClick={() => (dayAsk ? dropDay(d) : setDayAsk(true))}>
                        {dayAsk ? "Emin misin?" : "Günü kaldır"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </section>
              {/* Programın maddeleri (antrenör toplantısı, ilk start, ödül töreni…): canlı ekranda Program'da görünen; plan.agenda?.[d] */}
              <section>
                <Head title="Program" onAdd={ed?.i === -1 ? null : () => setAgEdit({ d, i: -1, at: "", text: "" })} addLabel="Madde ekle" />
                <div className={`${card} overflow-hidden`}>
                  {items.map((x, i) =>
                    ed?.i === i ? (
                      editor
                    ) : (
                      <button key={`ag${i}`} type="button" onClick={() => setAgEdit({ d, i, at: x.at, text: x.text })} className={`${row} border-b border-line last:border-0`}>
                        <span className="w-12 shrink-0 text-[0.9375rem] font-semibold tabular-nums text-mut">{x.at || "—"}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{x.text}</span>
                      </button>
                    ),
                  )}
                  {ed?.i === -1 ? editor : null}
                  {!items.length && ed?.i !== -1 ? <div className={`${row} font-semibold text-mut`}>Madde yok</div> : null}
                </div>
              </section>
              {ds.length ? (
                <section>
                  <Head title="Yapılan yarışlar" right={`${ds.length}`} />
                  <div className={`${card} overflow-hidden`}>
                    {ds.map((x) => {
                      const g = x.grp || L?.rounds?.[x.id]?.grp || "";
                      const open = delId === x.id && cur?.id !== x.id;
                      return (
                        <div key={x.id} className="border-b border-line last:border-0">
                          <button type="button" aria-expanded={open} onClick={() => setDelId(open ? "" : x.id)} className={row}>
                            {g ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(g) }} aria-hidden="true" /> : null}
                            <span className={`min-w-0 flex-1 truncate font-semibold ${x.void ? "text-mut" : ""}`}>{[raceTitle(x), g].filter(Boolean).join(" · ")}</span>
                            <span className="shrink-0 text-[0.875rem] tabular-nums text-mut">{[hm(x.at), cur?.id === x.id ? "Sürüyor" : x.fin && !x.void ? raceTime(x) : ""].filter(Boolean).join(" · ")}</span>
                          </button>
                          {open ? (
                            <div className="px-4 pb-3">
                              <Button variant="danger" onClick={() => dropStart(x.id)}>
                                Yarışı sil
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </>
          );
        })()}
        <section>
          <Head title="Canlı ekran" />
          <div className={`${card} overflow-hidden`}>
            <div className={row}>
              <span className="flex-1 font-semibold">Ertesi güne geçer</span>
              <TimeIn value={plan.showAt} onSave={(v) => changePlan({ showAt: v })} aria-label="Ekranın yeni güne geçeceği saat" className="masa-time" />
            </div>
          </div>
        </section>
        <MasaBar>
          <Button onClick={() => setImpOpen(true)}>Programı ekle</Button>
        </MasaBar>
        <Sheet open={impOpen} onClose={() => setImpOpen(false)} title="Programı ekle" navy>
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
        </Sheet>
          </Pane>
        ) : null}
        {/* Ekran sekmesi canlı ekrana taşındı (Seyhun 2026-11-06 "ekranı kendi canlı yayınımdan yöneteyim"; /canli LiveMasa) */}
        {!needSetup && seen("parkur") ? (
          <Pane k="parkur">
        {/* Parkur (Seyhun 2026-11-04 örnek parkur-pro onaylandı): büyük harita (sol üstte kart A · B · +, sağ üstte tür), altında üç gösterge
            Rüzgâr · Eksen · Hat, rota şeridi START → F + Düzelt; Gruplar tek satır (dokun: grubun kartı sıradakine geçer); Konumlar 6 kutu
            (girilmeyene dokun: Buradayım; girilene dokun: Buradayım / Sil); Ölçümler son üç satır, Tümü */}
        <section>
          <div className={`${card} overflow-hidden`}>
            <div className="relative">
              {scene ? <div className="[&>svg]:block" dangerouslySetInnerHTML={{ __html: scene }} /> : <p className="px-4 pb-8 pt-20 text-center text-[0.875rem] text-mut">Rüzgâr ya da parkur ölçümü girince kart çizilir</p>}
              <div className="masa-seg absolute left-2.5 top-2.5">
                {course.cards.map((x) => (
                  <button key={x.id} type="button" aria-pressed={x.id === course.sel} aria-label={`Kart ${x.id}`} onClick={() => pickCard(x.id)}>
                    {x.id}
                  </button>
                ))}
                <button type="button" aria-label="Yeni kart" onClick={newCard}>
                  +
                </button>
              </div>
              <button type="button" data-press aria-label="Kart türü" aria-expanded={typeOpen} onClick={() => setTypeOpen((v) => !v)} className="masa-b gl absolute right-2.5 top-2.5 bg-black/45">
                {(CARD_TYPES[selCard(course).type] || CARD_TYPES.std).split(" ")[0]}
              </button>
              {typeOpen ? (
                <div className="absolute right-2.5 top-[3.75rem] z-10 grid gap-1.5 rounded-[0.875rem] bg-[#0e1829]/95 p-1.5 shadow-lg">
                  {Object.entries(CARD_TYPES).map(([t, n]) => (
                    <button key={t} type="button" data-press aria-pressed={selCard(course).type === t} className="masa-b justify-start" onClick={() => (setTypeOpen(false), setType(t))}>
                      {n.split(" ")[0]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="masa-inst">
              <div className={flash.includes("wind") ? "fl" : ""}>
                <small>Rüzgâr</small>
                <b>
                  {wind ? degText(wind) : "—"}
                  {wind ? <em>{dirShort(wind.deg)}</em> : null}
                </b>
                <span>{wind ? [wind.kn != null ? `${wind.kn} kn` : "", wind.gust != null ? `sağanak ${wind.gust}` : "", wind.kn == null && wind.gust == null ? hm(wind.at) : ""].filter(Boolean).join(" · ") : "Ölçüm yok"}</span>
              </div>
              <div className={flash.includes("axis") ? "fl" : ""}>
                <small>Eksen</small>
                <b>{lastOf("axis") ? degText(lastOf("axis")) : "—"}</b>
                <span>{lastOf("axis") && wind ? `Rüzgâr ${axisOff(wind.deg, lastOf("axis").deg)}` : lastOf("axis") ? hm(lastOf("axis").at) : "Ölçüm yok"}</span>
              </div>
              <div className={flash.includes("line") ? "fl" : ""}>
                <small>Hat</small>
                <b className={bias?.end ? "g" : ""}>{bias?.end ? (bias.end === "pin" ? "Pin" : "Komite") : bias ? "Dik" : "—"}</b>
                <span>{bias?.end ? `+${bias.deg}° avantaj` : bias ? "Avantaj yok" : "Ölçüm yok"}</span>
              </div>
            </div>
            <div className={`masa-legs${flash.includes("route") ? " fl" : ""}`}>
              {rtEdit ? (
                <input autoFocus value={rt} onChange={(e) => setRt(e.target.value.slice(0, 40))} placeholder="1 2 3 F" aria-label="Rota" className="h-12 min-w-0 flex-1 rounded-[0.875rem] bg-[var(--chip)] px-3 text-[1rem] font-bold tabular-nums tracking-[0.06em] outline-none" />
              ) : (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-y-1.5" aria-label={`Rota ${routeText(cleanRoute(rt)) || "yok"}`}>
                  <span className="lp s">START</span>
                  {cleanRoute(rt).map((s, i) => (
                    <span key={i} className="lg">
                      <i />
                      <span className={`lp${s === "F" ? " f" : ""}`}>{s}</span>
                    </span>
                  ))}
                  {!cleanRoute(rt).length ? <span className="ml-2 text-[0.875rem] font-semibold text-mut">Rota yok</span> : null}
                </div>
              )}
              <Button
                size="sm"
                variant="secondary"
                full={false}
                onClick={() => {
                  if (!rtEdit) return setRtEdit(true);
                  if (cleanRoute(rt).length) setRtEdit(false);
                  return saveRoute();
                }}
              >
                {rtEdit ? "Kaydet" : "Düzelt"}
              </Button>
            </div>
          </div>
        </section>
        {groupRows.length > 1 && course.cards.length > 1 ? (
          <section>
            {/* Hangi grup hangi kartta (Seyhun 2026-11-05 "alt kısım çok karışık"): her grup bir satır, yanında kart seçimi */}
            <Head title="Hangi grup hangi kartta" />
            <div className={`${card} overflow-hidden`}>
              {groupRows.map(([cl, g]) => {
                const k = cardFor(course, cl, g);
                return (
                  <div key={cardKey(cl, g)} className="flex items-center gap-2.5 border-b border-line px-4 py-2 last:border-b-0">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: g ? groupColor(g) : "var(--mut)" }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-bold">{g ? `${g}${plan.sets.length > 1 ? ` · ${cl}` : ""}` : cl}</span>
                    <div className="masa-seg">
                      {course.cards.map((x) => (
                        <button key={x.id} type="button" aria-pressed={x.id === k.id} aria-label={`${g || cl} Kart ${x.id}`} onClick={() => x.id !== k.id && putCards({ by: { ...course.by, [cardKey(cl, g)]: x.id } }, `${g || cl}: Kart ${x.id}`)}>
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
          <Head title="Konumlar" right={ptOpen ? PT_LABEL[ptOpen] : "Dokun: Buradayım"} />
          <div className="masa-pts">
            {PT_ROWS.map((k) => {
              const p = course.pts[k];
              const off = cpts?.off?.[k];
              return (
                <button key={k} type="button" data-press aria-pressed={ptOpen === k} disabled={!!ptBusy} className={`masa-pt ${p ? (off ? "w" : "on") : "no"}`} onClick={() => (p ? setPtOpen(ptOpen === k ? "" : k) : hereFor(k))}>
                  <small>{PT_SHORT[k]}</small>
                  <b>{ptBusy === k ? "…" : p ? (off ? `${Math.abs(off)}°` : "✓") : "—"}</b>
                </button>
              );
            })}
          </div>
          {ptOpen && course.pts[ptOpen] ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="secondary" disabled={!!ptBusy} onClick={() => (setPtOpen(""), hereFor(ptOpen))}>
                Buradayım
              </Button>
              <Button variant="danger" onClick={() => (setPtOpen(""), putPt(ptOpen, null))}>
                Sil
              </Button>
            </div>
          ) : null}
        </section>
        <section>
          <div className="mb-1.5 flex items-center justify-between gap-3 px-1 text-[0.8125rem] font-semibold text-mut">
            <span>{obsAll ? "Ölçümler" : "Son ölçüm"}</span>
            {course.obs.length > 1 ? (
              <button type="button" onClick={() => setObsAll((v) => !v)} className="masa-b">
                {obsAll ? "Kapat" : "Tümü ›"}
              </button>
            ) : null}
          </div>
          {course.obs.length ? (
            <div className={`${card} overflow-hidden`}>
              {[...course.obs]
                .reverse()
                .slice(0, obsAll ? undefined : 1)
                .map((o) => (
                  <div key={o.id} className="flex items-center gap-3 border-b border-line px-4 py-1.5 text-[0.9375rem] last:border-b-0">
                    <span className="w-12 shrink-0 text-[0.8125rem] font-semibold tabular-nums text-mut">{hm(o.at)}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{`${obsTitle(o)} · ${obsValue(o)}`}</span>
                    {obsAll ? (
                      <button type="button" onClick={() => dropObs(o)} className="masa-b red">
                        Sil
                      </button>
                    ) : null}
                  </div>
                ))}
            </div>
          ) : (
            <p className={`${card} px-4 py-3 text-[0.875rem] text-mut`}>Ölçüm yok. Ölçüm ekle ya da asistana söyle.</p>
          )}
          {course.cards.length > 1 ? (
            <button type="button" onClick={dropCard} className="masa-b red mt-3">
              {`Kart ${course.sel}'i sil`}
            </button>
          ) : null}
        </section>
        <MasaBar>
          <Button variant="secondary" onClick={() => setAdd(0)}>
            Ölçüm ekle
          </Button>
          <span className="masa-orb">
            <VoiceLight state={talk ? "listening" : "idle"} size="size-12" compact onTap={() => setTalk(true)} onHold={() => setTalk(true)} />
          </span>
        </MasaBar>
        <CourseTalk open={talk} onClose={() => setTalk(false)} course={course} apply={applyCourseVoice} undo={undoCourse} onWrote={setFlash} />
          </Pane>
        ) : null}
        {!needSetup && seen("sporcu") ? (
          <Pane k="sporcu">
            {/* Sporcu (Seyhun 2026-11-03): gruplar, sporcu listesi, gün gün renk listesi, sonuçlar; Dönüşler bu listeyi kullanır */}
            <AthletesTab orgId={orgId} raceId={id} plan={plan} onSets={(sets) => changePlan({ sets, cls: sets[0]?.cls || "", grps: sets[0]?.grps || [] })} entries={entries} groups={groups} today={today} days={days} />
            <MasaBar>
              <Link href={`/athletes/races/${id}/sonuclar`} className="flex h-12 flex-1 items-center justify-center rounded-[0.875rem] border border-line bg-[var(--chip)] text-[0.9375rem] font-semibold active:scale-[0.98]">
                Sonuç yükle
              </Link>
              <Button onClick={() => setList(true)}>Liste yükle</Button>
            </MasaBar>
          </Pane>
        ) : null}
        {!needSetup && seen("belge") ? <Pane k="belge"><DocsTab orgId={orgId} race={race} onRace={setRace} onShow={() => (putPin("rank"), toast("Genel sıralama ekranda"))} showing={shNow.item === "rank"} /></Pane> : null}
        {!needSetup && seen("donus") ? (
          <Pane k="donus">
        {/* Grup şeridi (Seyhun 2026-11-04 aynı anda üç grup): Dönüşler, Ceza ve Sesle gir seçili gruba yazar; önce yarışta olanlar, sonra bugün bitenler */}
        {pickable.length > 1 ? (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" aria-label="Grup">
            {pickable.map((x) => (
              <button key={x.id} type="button" aria-pressed={st?.id === x.id} onClick={() => setSelId(x.id)} className="masa-b gap-2" data-press>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(x.grp || L?.rounds?.[x.id]?.grp || "") || "var(--mut)" }} aria-hidden="true" />
                {[startLabel(x), x.fin ? "bitti" : ""].filter(Boolean).join(" · ")}
              </button>
            ))}
          </div>
        ) : null}
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
          </Pane>
        ) : null}
        {/* Tekne takibi (Seyhun 2026-11-02): teknedeki telefonların konumu, şamandıra yanından geçince dönüş (features/tracking).
            Sekme değişince de takılı kalır (algılama sayfa açıkken sürer), yalnız Dönüşler'de görünür */}
        <Pane k="track">
        <section className={!needSetup && seen("donus") ? "" : "hidden"}>
          <Head title="Tekne takibi" />
          <TrackPanel orgId={orgId} raceId={id} starts={liveStarts(live.starts, L?.timer, today).map((x) => ({ ...x, grp: x.grp || L?.rounds?.[x.id]?.grp || "" }))} rounds={L?.rounds || {}} groupOf={groupMap(groupsOn(groups, today))} course={course} />
        </section>
        </Pane>
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
      <FlagSheet
        open={flagOpen || !!flagPick}
        pick={flagPick}
        onPick={(x) => (signalOf(x.id)?.kind === "ap" && !signalOf(x.id).end ? raiseFlag(x.id) : setFlagPick(flagFor ? { ...x, rid: flagFor } : x))}
        onClose={() => (setFlagPick(null), setFlagOpen(false), setFlagFor(""))}
        onBack={() => setFlagPick(null)}
        onRaise={() => flagPick && raiseFlag(flagPick.id, flagPick.rid || "")}
        onLower={(g) => (lowerGrp(g), setFlagOpen(false))}
        ctx={{ held: heldGrps(plan.order).map((x) => x.grp), counting: countingAt(capNow), racing: runningIds(capNow).length > 0, apUp: plan.status === "ap", at: plan.at, prep: plan.order[0]?.prep || plan.prep || "", one: !!flagFor, oneName: flagFor ? startLabel(live.starts.find((x) => x.id === flagFor)) : "", ridName: flagPick?.rid ? startLabel(live.starts.find((x) => x.id === flagPick.rid)) : "" }}
      />
      {/* Tehir (Seyhun 2026-11-03 "alt çubuktan yukarı açılsın, kare belirgin düğmeler: İner, Yer, İnince, Sebep, Tamam") */}
      <Sheet open={!!ap && (plan.status !== "ap" || !!ap.edit)} onClose={() => setAp(null)} title={ap?.edit ? "Tehiri düzelt" : "Tehir"} navy>
        {ap ? (
          <div className="space-y-4 pb-3">
            {/* Kimin için (Seyhun 2026-11-04 "tek gruba tehir"): bütün gün ya da yalnız bir grup (öbür gruplar sürer) */}
            {!ap.edit && apGrps.length ? (
              <div>
                <div className="masa-aplab">Kimin için</div>
                <div className="masa-apgrid">
                  {["", ...apGrps].map((g) => (
                    <button key={g || "-"} type="button" data-press aria-pressed={(ap.grp || "") === g} onClick={() => setAp({ ...ap, grp: g })} className="masa-ap">
                      <b className="sm">{g || "Tüm gruplar"}</b>
                      <small>{g ? "yalnız bu grup" : "bütün gün"}</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <div className="masa-aplab">İner</div>
              <div className="masa-apgrid">
                {[...AP_MIN, 0].map((m) => (
                  <button key={m} type="button" data-press aria-pressed={ap.min === m} onClick={() => setAp({ ...ap, min: m, hours: 0 })} className="masa-ap">
                    <b>{m === 0 ? "?" : m < 60 ? m : m / 60}</b>
                    <small>{m === 0 ? "Belirsiz" : m < 60 ? "dk sonra" : "saat sonra"}</small>
                  </button>
                ))}
              </div>
            </div>
            {/* Denizde (AP): inince 1 dk sonra uyarı işareti; Karada (AP üstünde H): inince en az 60 dk sonra (Seyhun 2026-11-04) */}
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
            {ap.grp ? null : (
            <div>
              <div className="masa-aplab">İnince</div>
              <div className="masa-apgrid two">
                {[[true, `${apGap(ap.land)} dk sonra`, "geri sayım kendiliğinden"], [false, "Ben başlatırım", "geri sayım elle"]].map(([v, t, f]) => (
                  <button key={String(v)} type="button" data-press aria-pressed={ap.auto !== false === v} onClick={() => setAp({ ...ap, auto: v })} className="masa-ap">
                    <b>{t}</b>
                    <small>{f}</small>
                  </button>
                ))}
              </div>
            </div>
            )}
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
            <p className="text-[0.875rem] text-mut">{ap.edit && ap.min == null ? [plan.ap?.down ? `İniş ${trHm(plan.ap.down)} (değişmez)` : "İniş belirsiz (değişmez)", ap.auto === false ? "Geri sayımı sen başlatırsın" : `İnince ${apGap(ap.land)} dk sonra geri sayım`].join(" · ") : [ap.hours ? `${ap.hours} saat tehir` : "", ap.live ? "Sayaç durur" : "", ap.min ? `İniş ${trHm(new Date((tick || capNow) + ap.min * 60e3).toISOString())}` : "İniş belirsiz, Tehiri indir ile iner", ap.grp ? `Yalnız ${ap.grp}; inince Başlat sende` : ap.auto === false ? "Geri sayımı sen başlatırsın" : `İnince ${apGap(ap.land)} dk sonra geri sayım`].filter(Boolean).join(" · ")}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setAp(null)}>
                Vazgeç
              </Button>
              <Button className="flex-1" onClick={ap.edit ? fixAp : () => postpone(ap)}>
                {ap.edit ? "Kaydet" : "Tehir çek"}
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
      {/* Canlı kaynak ekle (Seyhun 2026-11-03 video-sekme/ornek.png): tür + YouTube bağlantısı + Ekle; ad kendiliğinden (Drone 2) */}
      {/* Evrenin ataması (Seyhun 2026-11-04): görüntü (Ekrandaki, bulanık foto, canlı kaynak, tekneler, kayıt) ve gösterilecekler sırası
          (Yukarı / Çıkar, altta Ekle), her birinin süresi; seçilen hemen kaydedilir, yalnız o evrenin alanı yazılır */}
      <Sheet open={!!scOpen} onClose={() => setScOpen("")} title={scOpen ? EVRE_NAME[scOpen] : ""} navy>
        {scOpen ? (
          <div className="space-y-3 px-4 pb-5">
            <p className="px-1 text-[0.8125rem] font-semibold text-mut">{EVRE_WHEN[scOpen]}</p>
            <div className={`${card} overflow-hidden`}>
              <button type="button" onClick={() => setVidPick((v) => !v)} aria-expanded={vidPick} className={row}>
                <span className="min-w-0 flex-1 font-semibold">Görüntü</span>
                <span className="min-w-0 max-w-[60%] truncate text-[0.875rem] font-semibold text-mut">{vidName(scOpen)}</span>
                <span className="text-mut" aria-hidden="true">{vidPick ? "⌃" : "›"}</span>
              </button>
              {vidPick
                ? [
                    [null, "Ekrandaki", "Ekrana aldığın"],
                    [{ kind: "" }, "Bulanık foto", ""],
                    ...(autoOn ? [[{ kind: "live" }, "Grubun kamerası", airCam?.name || ""]] : []),
                    ...srcList.map((x) => [{ kind: "src", src: x.id }, x.name, stat[x.url]?.live ? "Yayında" : x.url ? "" : "Bağlantı yok"]),
                    ...(fleetGrps.length ? fleetGrps : [""]).map((g) => [{ kind: "boats", grp: g }, boatsName(g), "Canlı konum"]),
                    ...vids.map((m) => [{ kind: "rec", mid: m.id }, recName(m, live.starts), m.dur ? mmss(m.dur) : ""]),
                  ].map(([v, t, sub]) => {
                    const cv = pre.ev[scOpen].vid;
                    const on = !v ? !cv : !!cv && cv.kind === v.kind && (cv.src || "") === (v.src || "") && (cv.mid || "") === (v.mid || "") && (cv.grp || "") === (v.grp || "");
                    return (
                      <button key={`${v?.kind ?? "x"}${v?.src || v?.mid || v?.grp || ""}`} type="button" aria-pressed={on} onClick={() => (putVid(scOpen, v), setVidPick(false))} className={`${row} border-t border-line`}>
                        <span className="min-w-0 flex-1 truncate font-semibold">{t}</span>
                        {sub ? <span className="shrink-0 text-[0.8125rem] font-semibold text-mut">{sub}</span> : null}
                        <span className={`masa-rd${on ? " on" : ""}`} aria-hidden="true" />
                      </button>
                    );
                  })
                : null}
            </div>
            <div>
              {/* Gösterilecekler (Seyhun 2026-11-05 "doğru düzgün butonlar, ekleme kolay"): üstte sıradakiler (Yukarı, Çıkar), altta eklenmeyenler
                  tek dokunuşla Ekle; değişiklik bütün yarışlarda kalır */}
              <Head title="Gösterilecekler" right="sırayla" />
              <div className={`${card} overflow-hidden`}>
                {pre.ev[scOpen].items.map((k, i, a) => (
                  <div key={k} className="masa-it">
                    <i>{i + 1}</i>
                    <span>
                      {ITEM_NAME[k]}
                      {scOpen === evNow && !evHas[k] ? <small>Veri yok, atlanır</small> : null}
                    </span>
                    {i > 0 ? (
                      <button type="button" data-press className="masa-b sm" onClick={() => putEv(scOpen, { items: [...a.slice(0, i - 1), k, a[i - 1], ...a.slice(i + 1)] })}>
                        Yukarı
                      </button>
                    ) : null}
                    <button type="button" data-press className="masa-b sm red" onClick={() => putEv(scOpen, { items: a.filter((x) => x !== k) })}>
                      Çıkar
                    </button>
                  </div>
                ))}
                {!pre.ev[scOpen].items.length ? <p className="masa-it-no">{scOpen === "start" || scOpen === "race" ? "Boş · görüntü gösterilir" : "Boş · süre gösterilir"}</p> : null}
                {SHOW_ITEMS.some((k) => !pre.ev[scOpen].items.includes(k)) ? (
                  <>
                    <div className="masa-it-h">Eklenmeyenler</div>
                    {SHOW_ITEMS.filter((k) => !pre.ev[scOpen].items.includes(k)).map((k) => (
                      <div key={k} className="masa-it off">
                        <i>+</i>
                        <span>{ITEM_NAME[k]}</span>
                        <button type="button" data-press className="masa-b sm add" onClick={() => putEv(scOpen, { items: [...pre.ev[scOpen].items, k] })}>
                          Ekle
                        </button>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>
            </div>
            <div>
              <Head title="Sol alt" />
              <div className="grid grid-cols-3 gap-1.5">
                {SIDES.map((k) => (
                  <button key={k} type="button" data-press aria-pressed={pre.ev[scOpen].side === k} className="masa-tog text-center" onClick={() => putEv(scOpen, { side: k })}>
                    {SIDE_NAME[k]}
                  </button>
                ))}
              </div>
            </div>
            {pre.ev[scOpen].items.length > 1 ? (
              <div>
                <Head title="Her biri" />
                <div className="grid grid-cols-5 gap-1.5">
                  {ITEM_SECS.map((n) => (
                    <button key={n} type="button" data-press aria-pressed={pre.ev[scOpen].sec === n} className="masa-tog text-center" onClick={() => putEv(scOpen, { sec: n })}>
                      {`${n} sn`}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {pre.ev[scOpen].items.join() !== EVRE_DEF[scOpen].join() || pre.ev[scOpen].sec !== 15 || pre.ev[scOpen].side !== SIDE_DEF[scOpen] ? (
              <Button variant="secondary" full onClick={() => (resetEv(scOpen), toast(`${EVRE_NAME[scOpen]} varsayılana döndü`))}>
                Varsayılana dön
              </Button>
            ) : null}
            {scOpen === evNow && pre.evre ? (
              <Button variant="secondary" full onClick={() => (putEvreMan(""), setScOpen(""))}>
                Otomatiğe dön
              </Button>
            ) : scOpen !== evNow ? (
              <Button full onClick={() => (putEvreMan(scOpen), setScOpen(""), toast(`${EVRE_NAME[scOpen]} ekranda`))}>
                Bu evreye geç
              </Button>
            ) : null}
          </div>
        ) : null}
      </Sheet>
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Canlı kaynak ekle">
        <div className="px-4 pb-5">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(SRC_KINDS).map(([k, t]) => (
              <button key={k} type="button" data-press aria-pressed={addKind === k} className="masa-tog text-center" onClick={() => setAddKind(k)}>
                {t}
                <small>{addSource(srcList, k).at(-1).name}</small>
              </button>
            ))}
          </div>
          <input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="YouTube canlı yayın bağlantısı" inputMode="url" className="mt-3 h-11 w-full rounded-[0.6875rem] bg-[var(--chip)] px-3 text-[0.9375rem] outline-none" />
          <button type="button" onClick={() => (setAddOpen(false), setHowOpen(true))} className="mt-2.5 text-[0.875rem] font-semibold text-[#7fb6ff]">
            Nasıl bağlanır
          </button>
          {addOpen && <MyChannel used={srcList.map((x) => x.url)} onPick={(u) => addSrc(addKind, u)} />}
          {addOpen && <NearCams race={race} onPick={(u, n) => addSrc("camera", u, n)} />}
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAddOpen(false)}>
              Vazgeç
            </Button>
            <Button className="flex-[1.6]" onClick={() => addSrc(addKind, addUrl)}>
              Ekle
            </Button>
          </div>
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
            ["Ekrana aç", () => (setMenu(false), openScreen())],
            ["Linki kopyala", () => (setMenu(false), copy())],
            ["Sınıf ve gruplar", () => (setMenu(false), setSetupOpen(true), window.scrollTo({ top: 0 }))],
            // Örnek yarış (Seyhun 2026-11-02): tasarımı görmek için Sarı grup örneği, veriye dokunmaz
            ["Örnek yarışı aç", () => (setMenu(false), openInApp(router, "/canli/ornek"))],
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
      <AddSheet open={add !== null} pick0={add || 0} c={c} onClose={() => setAdd(null)} onAdd={addObs} onVoice={() => (setAdd(null), setTalk(true))} />
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
      <RoundsScreen open={voice} onClose={() => (setVoice(false), reload())} orgId={orgId} raceId={id} startId={st?.id || ""} onStart={setSelId} />
      {list && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
              <EntriesView onClose={() => setList(false)} orgId={orgId} raceId={id} rows={entries} setRows={setEntries} groups={groups} setGroups={setGroups} />
            </div>,
            document.body,
          )
        : null}
      {/* Tek sayfa panosu: sütunlar, her bölümün başlığı (sekmenin adı ve kısa durumu) ve yeri; bölümlerin içeriği sekmelerdekinin aynısı
          (Pane ile buraya taşınır). Canlı ekran küçük, Mac'te sağ sütunun en üstünde, iPad'de ikinci sütunun üstünde */}
      {board && !needSetup ? (
        <div className="masa-board">
          <nav className="masa-side" aria-label="Sekmeler">
            {tabInfo.map(([k, name, sub, dot]) => (
              <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} data-press>
                <b>{name}</b>
                <small>
                  {dot ? <i aria-hidden="true" /> : null}
                  {sub}
                </small>
              </button>
            ))}
          </nav>
          <div className="masa-col">
            {[tab, ...(tab === "donus" ? ["track"] : [])].map((k) => (
              <section key={k} className={`masa-pn${k === "sure" ? " wide" : ""}`} aria-label={tabInfo.find((x) => x[0] === k)?.[1] || ""}>
                <div
                  className="masa-pnb space-y-6"
                  ref={(el) => {
                    if (el) setSlots((m) => (m[k] === el ? m : { ...m, [k]: el }));
                  }}
                />
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </main>
    </Board.Provider>
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
  const v = vid || ytId(u);
  return v ? (vid ? `https://i.ytimg.com/vi/${v}/hqdefault_live.jpg?m=${Math.floor(Date.now() / 60000)}` : `https://i.ytimg.com/vi/${v}/hqdefault.jpg`) : "";
};
// Sekmeler ekranın altında sabit çubuk (Seyhun 2026-11-04 "sekme butonlarını alta alalım, sekmedeki butonlar sekme çubuğunun üstünde;
// telefonda, iPad'de rahat"): başparmakla erişilir, sekmenin iş düğmeleri (MasaBar) hemen üstünde; klavye açılınca gizlenir (data-pagebar)
// Düğme çubuğu sekme çubuğuna bitişik (Seyhun 2026-11-04 "arada boşluk var, kaldıralım"): sekme çubuğunun gerçek yüksekliği ölçülür,
// --masa-tb (masa.css .masa-bar bottom) tahmin yerine bu değer olur; ev çizgisi (safe-area) yüksekliğin içinde
function MasaTabs({ value, onChange, tabs }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const st = document.body.style;
    const set = () => st.setProperty("--masa-tb", `${Math.max(0, Math.round(el.getBoundingClientRect().height) - 1)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el, { box: "border-box" }); // ev çizgisi payı (padding) değişince de ölçülür
    return () => (ro.disconnect(), st.removeProperty("--masa-tb"));
  }, []);
  return (
    <nav ref={ref} data-pagebar="" className="masa-tabs" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} aria-label="Sekmeler">
      {tabs.map(([k, name, sub, dot]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)} data-press>
          <b>{name}</b>
          <small>
            {dot ? <i aria-hidden="true" /> : null}
            {sub}
          </small>
        </button>
      ))}
    </nav>
  );
}
// Sekmenin iş düğmeleri: ekranın altında sabit (en çok üç, ana iş pembe)
// Bayrak penceresi (Seyhun 2026-11-03 "bütün kuralları, bayrakları tıklayarak; hepsinde onay, pat pat yapılmasın"): o ana uyan bayraklar;
// dokununca altta onay (bayrak, anlamı, sesi) → Çek. Yalnız Abandone düğmesinden ya da hazır Tehir'den gelince doğrudan onay açılır.
const FLAG_ROWS = {
  tehir: ["AP", "AP/H", "AP/A"],
  abandone: ["N", "N/H", "N/A", "V"],
  rota: ["S", "C", "C+sancak", "C+iskele", "C+eksi", "C+arti", "M"],
  geri: ["X", "FS"],
  diger: ["L", "Y"],
};
function FlagIcons({ ids, size = "md" }) {
  return (
    <span className={`masa-flags ${size}`} aria-hidden="true">
      {ids.map((f) => (
        <i key={f} dangerouslySetInnerHTML={{ __html: flagSvg(f) }} />
      ))}
    </span>
  );
}
function FlagSheet({ open, pick, onPick, onClose, onBack, onRaise, onLower, ctx }) {
  const groups = [];
  // ctx.one: yalnız bir yarış için (Süre satırının Bayrak kısa yolu): tehir, hazırlık ve genel işaretler yok, abandone yalnız N
  if (ctx.one) groups.push(["Abandone", ["N"]], ["Rota", FLAG_ROWS.rota], ["Geri çağırma", FLAG_ROWS.geri]);
  else if (ctx.racing) groups.push(["Abandone", FLAG_ROWS.abandone], ["Rota", FLAG_ROWS.rota], ["Geri çağırma", FLAG_ROWS.geri]);
  // tehir çekiliyken yalnız AP üzeri A (bugün yarış yok); tehirin kendisi Tehiri indir ile iner
  if (!ctx.one) groups.unshift(["Tehir", ctx.apUp ? ["AP/A"] : FLAG_ROWS.tehir]);
  const hours = !ctx.one && !ctx.apUp && !ctx.counting && !ctx.racing && /^\d\d:\d\d$/.test(ctx.at || "");
  const prep = !ctx.one && !ctx.counting && !ctx.racing;
  const s = pick ? signalOf(pick.id) : null;
  const info = s ? (s.hours && ctx.at ? `Start ${ctx.at} yerine ${addHours(ctx.at, s.hours) || "yarın"}. ${s.info}` : pick.rid && ctx.ridName ? (s.kind === "void" ? `${ctx.ridName} abandone edilir. Start alanına dönülür.` : `${ctx.ridName}: ${s.info}`) : s.info) : "";
  const tile = (id, label) => {
    const x = signalOf(id);
    return (
      <button key={id} type="button" data-press aria-pressed={pick?.id === id} className="masa-flagt" onClick={() => onPick({ id })}>
        <FlagIcons ids={x.flags} />
        <b>{label || x.short}</b>
      </button>
    );
  };
  return (
    <Sheet open={open} onClose={onClose} title={ctx.one && ctx.oneName ? `Bayrak · ${ctx.oneName}` : "Bayrak çek"} navy>
      <div className="space-y-3 pb-3">
        {/* tehirdeki gruplar: buradan indirilir (Tehir bayrağına dokununca yeniden tehir penceresi açılmasın) */}
        {!ctx.one && ctx.held?.length ? (
          <div>
            <div className="masa-aplab">Tehirde</div>
            <div className="masa-flaggrid">{ctx.held.map((g) => (
              <button key={g} type="button" data-press className="masa-flagt" onClick={() => onLower(g)}>
                <FlagIcons ids={["AP"]} />
                <b>{`İndir · ${g}`}</b>
              </button>
            ))}</div>
          </div>
        ) : null}
        {groups.map(([n, ids]) => (
          <div key={n}>
            <div className="masa-aplab">{n}</div>
            <div className="masa-flaggrid">{ids.map((id) => tile(id))}</div>
          </div>
        ))}
        {hours ? (
          <div>
            <div className="masa-aplab">Saatli tehir</div>
            <div className="masa-flaggrid five">{SIGNALS.filter((x) => x.hours).map((x) => (
              <button key={x.id} type="button" data-press aria-pressed={pick?.id === x.id} className="masa-flagt sm" onClick={() => onPick({ id: x.id })}>
                <FlagIcons ids={[x.flags[1]]} size="sm" />
                <b>{`${x.hours} sa`}</b>
              </button>
            ))}</div>
          </div>
        ) : null}
        {prep ? (
          <div>
            <div className="masa-aplab">Hazırlık (sıradaki start)</div>
            <div className="masa-flaggrid five">{["P", "I", "Z", "U", "Kara"].map((id) => (
              <button key={id} type="button" data-press aria-pressed={pick?.id === id || (!pick && ctx.prep === id)} className="masa-flagt sm" onClick={() => onPick({ id })}>
                <FlagIcons ids={[id]} size="sm" />
                <b>{id === "Kara" ? "Siyah" : id}</b>
              </button>
            ))}</div>
          </div>
        ) : null}
        {ctx.one ? null : (
          <div>
            <div className="masa-aplab">Diğer</div>
            <div className="masa-flaggrid">{[...(ctx.racing ? [] : ["V"]), ...FLAG_ROWS.diger].map((id) => tile(id))}</div>
          </div>
        )}
        {s ? (
          <div className="masa-flagc">
            <div className="flex items-start gap-3">
              <FlagIcons ids={s.flags} size="lg" />
              <div className="min-w-0 flex-1">
                <b className="block text-[1.0625rem]">{s.name}</b>
                <p className="mt-1 text-[0.875rem] leading-snug text-fg2">{info}</p>
                {soundText(s) ? <small className="mt-1 block font-bold text-[#ffd23f]">{soundText(s)}</small> : null}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={!ctx.one && (pick?.rid || pick?.id === "AP") ? onClose : onBack}>
                Vazgeç
              </Button>
              <Button className="flex-1" onClick={onRaise}>
                Çek
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
// Saat kutusu (Seyhun 2026-11-04 "dakikayı ayarlarken gönderiliyor; OK'ye basınca gönderilmeli"): yazarken yalnız kutuda değişir,
// klavyede OK / Enter ya da kutudan çıkınca bir kez kaydedilir
function TimeIn({ value, onSave, ...p }) {
  const [draft, setDraft] = useState(null);
  const save = () => {
    if (draft != null && draft !== value && /^\d\d:\d\d$/.test(draft)) onSave(draft);
    setDraft(null);
  };
  return <input {...p} type="time" value={draft ?? value ?? ""} onChange={(e) => setDraft(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />;
}
// Alt düğme çubuğu ekranın dibine oturur (Seyhun 2026-11-04 "altta niye boşluk kalıyor"): iPhone'un ev çizgisi için bırakılan
// boşluk yarıya indi (masa.css .masa-barin), çubuk sayfayla aynı genişlikte
// İlk start (Seyhun 2026-11-04 "ilk start kaç dakika kaldı, saati ne; 11 dediğimde 10.55'te uyarı işareti, sınıf bayrağı çekilir"):
// start saati ve uyarı işareti saati (start − seçili süre); büyük sayaç uyarı işaretine, yani Başlat'a kalan süre. Zamanı gelince "Şimdi Başlat".
// Finiş penceresine kalan (saniye saniye)
function WinLeft({ fw }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <b>{mmss(Math.max(0, Math.ceil((Date.parse(fw) - now) / 1000)))}</b>;
}
function FirstStart({ day, at, dur }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const startMs = Date.parse(`${day}T${at}:00+03:00`);
  if (!startMs) return null;
  const warnMs = startMs - dur * 1000;
  const warnHm = new Date(warnMs + 3 * 3600e3).toISOString().slice(11, 16);
  const left = Math.ceil((warnMs - now) / 1000);
  const late = left <= 0;
  const big = late ? "Şimdi" : left >= 3600 ? `${Math.floor(left / 3600)} sa ${Math.floor((left % 3600) / 60)} dk` : mmss(left);
  return (
    <div className={`masa-first${late ? " now" : left <= 120 ? " soon" : ""}`}>
      <div>
        <small>İlk start</small>
        <b>{at}</b>
        <span>{`Uyarı işareti ${warnHm}`}</span>
      </div>
      <div className="r">
        <small>{late ? "Uyarı işareti zamanı" : "Başlat'a"}</small>
        <b>{big}</b>
        <span>{late ? "Başlat'a bas" : `${dur / 60} dk geri sayım`}</span>
      </div>
    </div>
  );
}
// Pano (iPad, Mac): 48rem'den solda menü, sağda seçili sekme
const BOARD_Q = "(min-width: 48rem)";
const mqSubs = {};
const subMq = (q) =>
  (mqSubs[q] ||= (cb) => {
    const m = window.matchMedia(q);
    m.addEventListener("change", cb);
    return () => m.removeEventListener("change", cb);
  });
// Panoda bölüm içeriği kendi sütunundaki yerine taşınır (portal: durum kaybolmaz); telefonda olduğu yerde kalır
const Board = createContext(null);
function Pane({ k, children }) {
  const slots = useContext(Board);
  if (!slots) return children;
  return slots[k] ? createPortal(children, slots[k]) : null;
}
function MasaBar({ children }) {
  // panoda bölümün altında yapışık durur (o bölüm görünürken düğmeler elde), ekranın altına sabitlenmez
  if (useContext(Board)) return <div className="masa-pbar flex gap-2">{children}</div>;
  return (
    <div data-pagebar="" className="masa-bar fixed inset-x-0 bottom-0 z-30">
      <div className="masa-barin mx-auto flex max-w-[30rem] gap-2 px-4 pt-2 md:max-w-[44rem]">{children}</div>
    </div>
  );
}
// Ekrandaki ad (Seyhun 2026-11-04 "sağ alttaki yarışmanın adını editleyebilmeliyim; başlık ve alt satır gibi ayıralım"):
// canlı ekranın sağ altında başlık tek satır, alt satır küçük. Başlık boşsa yarışın adı yazar. Kaydet'e basınca gider.
function ScreenName({ plan, name, onSave }) {
  const [t, setT] = useState(null);
  const [s, setS] = useState(null);
  const title = t ?? plan.title;
  const sub = s ?? plan.sub;
  const dirty = title.trim() !== plan.title || sub.trim() !== plan.sub;
  const inp = "h-11 w-full rounded-[0.6875rem] bg-[var(--chip)] px-3 text-[0.9375rem] font-semibold outline-none";
  return (
    <section>
      <Head title="Ekrandaki ad" />
      <div className={`${card} grid gap-2 p-3`}>
        <input className={inp} value={title} maxLength={40} placeholder={name || "Başlık"} aria-label="Başlık" onChange={(e) => setT(e.target.value)} />
        <input className={inp} value={sub} maxLength={60} placeholder="Alt satır" aria-label="Alt satır" onChange={(e) => setS(e.target.value)} />
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() =>
            onSave(title.trim(), sub.trim()).then(() => {
              setT(null);
              setS(null);
            })
          }
        >
          Kaydet
        </Button>
      </div>
    </section>
  );
}

function Head({ title, right = "", onAdd = null, addLabel = "Ekle", busy = false }) {
  return (
    <div className={`mb-1.5 flex justify-between gap-3 px-1 text-[0.8125rem] font-semibold text-mut ${onAdd ? "items-center" : "items-baseline"}`}>
      <span className="min-w-0 truncate">
        {title}
        {right ? <em className={`ml-1.5 not-italic ${onAdd ? "text-ok" : ""}`}>{right}</em> : null}
      </span>
      {/* Ekleme başlığın yanında (Seyhun 2026-11-03 "kaynak eklemeyi canlı kaynaklar yazısının yanında artı koyarak") */}
      {onAdd ? (
        <button type="button" data-press aria-label={addLabel} disabled={busy} onClick={onAdd} className="masa-plus">
          +
        </button>
      ) : null}
    </div>
  );
}

// Yarışın kurulumu (Seyhun 2026-11-02 "önce bu yarış için sınıfları, sonra uygulanacak grupları seçelim; bunlar fix, bir kere seçip
// kapatalım; ayarlardan değiştirebilelim"): 1 Sınıf (birden çok) → 2 Gruplar (sınıf sınıf; grup yoksa boş) → Kaydet. Geri ile bir adım geri.
// Canlı ekranın sağ kartında elle gösterilen (Seyhun 2026-11-03 14:41 yayın grafiği: parkur alanını yönetimden elle açarım)
// Konumla girilen noktalar (lib/courseCard.js coursePoints)
const PT_ROWS = ["komite", "pin", "m1", "m2", "m3", "fin"];
const PT_SHORT = { komite: "Komite", pin: "Pin", m1: "1", m2: "2", m3: "3", fin: "Finiş" };
// Eksenin rüzgâra göre farkı: "+5°" / "−3°" / "aynı"
const axisOff = (w, a) => {
  const d = Math.round((((w - a) % 360) + 540) % 360 - 180);
  return d ? `${d > 0 ? "+" : "−"}${Math.abs(d)}°` : "aynı";
};
const PT_LABEL = { komite: "Komite", pin: "Pin", m1: "1 (orsa)", m2: "2 (apaz)", m3: "3 (pupa)", m4: "4", fin: "Finiş" };
const STEPS = ["Sınıflar", "Gruplar"];
const bigBtn = "flex h-12 w-full items-center justify-center rounded-[1.125rem] bg-white text-[1.125rem] font-semibold text-[#0b1a33] shadow-[0_3px_0_rgba(0,0,0,.35)] active:translate-y-0.5 active:shadow-none disabled:opacity-40";
const backBtn = "ck-glass flex h-12 shrink-0 items-center justify-center rounded-[1.125rem] px-5 text-[1.0625rem] font-semibold";
function Setup({ sets, guess = [], onSave, onCancel }) {
  // yarışın sınıfı biliniyorsa seçili gelir, doğrudan grup adımı (gruplar çoğu zaman ilk gün renk listesiyle belli olur)
  const [step, setStep] = useState(() => (!sets.length && guess.length ? 2 : 1));
  const [clss, setClss] = useState(() => (sets.length ? sets.map((x) => x.cls) : guess));
  const [grps, setGrps] = useState(() => Object.fromEntries(sets.map((x) => [x.cls, x.grps])));
  const starts = clss.reduce((n, c) => n + Math.max(1, (grps[c] || []).length), 0);
  // seçilenler seçim sırasıyla (sınıf sırası, sınıfın içinde grup sırası = start sırası)
  const cur = clss.map((c) => ({ cls: c, grps: grps[c] || [] }));
  const flat = raceOrder({ sets: cur });
  const moveUp = (k) => {
    const n = setsUp(cur, k);
    setClss(n.map((x) => x.cls));
    setGrps((d) => ({ ...d, ...Object.fromEntries(n.map((x) => [x.cls, x.grps])) }));
  };
  const chip = (on) => `flex h-12 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.9375rem] font-semibold ${on ? "bg-white text-[#0b1a33]" : "ck-glass text-white/85"}`;
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[1.0625rem] font-semibold">Yarışın sınıfları ve grupları</p>
        <ol className="flex items-center gap-1.5 text-[0.8125rem] font-semibold">
          {STEPS.map((x, i) => (
            <li key={x} className={`rounded-full px-2.5 py-1 ${i + 1 === step ? "bg-white text-[#0b1a33]" : i + 1 < step ? "ck-glass text-white" : "text-white/40"}`}>
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
                <button key={c} type="button" aria-pressed={on} onClick={() => setClss((l) => (on ? l.filter((x) => x !== c) : [...l, c]))} className={`flex h-12 items-center gap-2.5 rounded-[0.875rem] px-3.5 text-left text-[1rem] font-semibold ${on ? "bg-white text-[#0b1a33]" : "ck-glass text-white/70"}`}>
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 text-[0.75rem] ${on ? "border-[#0b1a33] bg-[#0b1a33] text-white" : "border-white/40"}`} aria-hidden="true">
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
                  {[...GROUP_PICK, ...(grps[c] || []).filter((g) => !GROUP_PICK.includes(g))].map((g) => {
                    const on = (grps[c] || []).includes(g);
                    return (
                      <button key={g} type="button" aria-pressed={on} onClick={() => setGrps((d) => ({ ...d, [c]: on ? (d[c] || []).filter((x) => x !== g) : finalsFirst([...(d[c] || []), g]) }))} className={chip(on)}>
                        <span className="size-2.5 rounded-full" style={{ background: groupColor(g) }} aria-hidden="true" />
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* Start sırası (Seyhun 2026-11-04 "sarı, mavi, kırmızı diye sıralamak istiyorum"): seçim sırasıyla gelir, "Öne al" ile değişir;
              sınıfın ilk grubunda "Öne al" bütün sınıfı öne alır */}
          {flat.length > 1 ? (
            <div className="ck-glass rounded-[0.875rem] p-3">
              <p className="mb-1 text-[0.9375rem] font-semibold">Start sırası</p>
              {flat.map((x, k) => (
                <div key={`${x.cls}|${x.grp}`} className="flex h-11 items-center gap-2.5">
                  <b className="w-5 shrink-0 text-center tabular-nums text-white/60">{k + 1}</b>
                  {x.grp ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(x.grp) }} aria-hidden="true" /> : null}
                  <span className="min-w-0 flex-1 truncate font-semibold">{[x.grp, clss.length > 1 || !x.grp ? x.cls : ""].filter(Boolean).join(" · ")}</span>
                  {k ? (
                    <button type="button" onClick={() => moveUp(k)} className="ck-glass h-9 shrink-0 rounded-full px-3.5 text-[0.875rem] font-semibold" data-press>
                      Öne al
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className={backBtn}>
              ‹ Geri
            </button>
            <button type="button" onClick={() => onSave(cur)} className={bigBtn}>
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
          <button key={g} type="button" aria-pressed={value === g} onClick={() => onPick(g)} data-press className={`flex flex-col items-center gap-2 rounded-[1rem] p-3 ${value === g ? "bg-white text-[#0b1a33]" : "ck-glass text-white"}`}>
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
