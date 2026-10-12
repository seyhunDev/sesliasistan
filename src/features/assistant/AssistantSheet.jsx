"use client";

import { applyFixes, loadFixes } from "@/lib/sttFixes";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { useTts } from "@/features/speech/TtsProvider";
import { Thread } from "@/features/add/Thread";
import { useSpeech } from "@/hooks/useSpeech";
import { assigneesInText, fixNames, namesToUids, uidsToNames } from "@/lib/names";
import { check, firstNeed } from "@/features/add/drafts";
import { rel, todayStr } from "@/lib/utils/format";
import { seriesDates } from "@/lib/repeat";
import { shareGroup } from "@/lib/cancelPlan";
import { pastTense } from "@/lib/assistTasks";
import { WaitLines, useWaitLines } from "./WaitLines";
import { ASK_EMPTY, PAST_MS, asksToClear, remember } from "@/lib/convoContext";
import { canSeeAthletes } from "@/features/athletes/access";
import { ATT_LABEL } from "@/features/athletes/assistAttendance";
import { raceNames } from "@/features/athletes/raceNames";
import { loadRaces } from "@/features/athletes/races";
import { athleteNames, byId, isActive, loadAthletes } from "@/features/athletes/data";
import { useCall } from "@/features/call/CallProvider";
import { useNameIndex } from "@/features/athletes/names";
import { useKind } from "@/features/auth/useKind";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { PAGES, describeAction, isCloseNow, isEnd } from "@/lib/assistantLocal";
import { RecordList } from "./RecordList";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useChat } from "@/features/chat/ChatProvider";
import { Avatar } from "@/features/chat/bits";
import { unglue } from "@/lib/speech/normalize";
import { GROUPS, canReceipts, isAthleteSide, waPhone } from "@/lib/kinds";
import { extraNote } from "@/lib/steps";
import { PersonCard } from "@/features/people/PersonCard";
import { EventCard } from "@/features/events/EventCard";
import { InvCard } from "@/features/inventory/InvCard";
import { RECORD_TO, waTo } from "./isler/ortak";
import * as is_kayit from "./isler/kayit";
import * as is_mesaj from "./isler/mesaj";
import * as is_kisi from "./isler/kisi";
import * as is_yaris from "./isler/yaris";
import * as is_yoklama from "./isler/yoklama";
import * as is_gunluk from "./isler/gunluk";
import * as is_etkinlik from "./isler/etkinlik";
import * as is_envanter from "./isler/envanter";
import * as is_fitness from "./isler/fitness";
import * as is_para from "./isler/para";
import * as is_alisveris from "./isler/alisveris";
import * as is_ders from "./isler/ders";
import * as is_komutlar from "./isler/komutlar";
import * as by_cevap from "./beyin/cevap";
import * as by_gorevListesi from "./beyin/gorevListesi";
import * as by_yapayZeka from "./beyin/yapayZeka";
import * as by_yonlendirme from "./beyin/yonlendirme";

const SILENCE_MS = 0; // Otomatik kapanma kapalı
// Dokun-konuş-dokun-gönder (Seyhun, 2026-10-06: "ChatGPT, Claude gibi; şimdilik canlı dinleme yok"): küreye dokununca
// dinler, söylenen ekranda yazılır, yeniden dokununca gönderilir. Cevaptan sonra ya da yapay zeka düşünürken mikrofon
// kendiliğinden açılmaz, sessizlikte kendiliğinden gönderilmez. Eller serbest sohbete dönmek için true.
const HANDS_FREE = false;
// Eller serbest sohbette: konuşma bitince (bu kadar sessizlikte) söylenen kendiliğinden gönderilir; kısa duraksama kesmez
const ENDPOINT = HANDS_FREE ? 1500 : 0; // canlı yazı yolunda konuşma bitişi (devam edilirse öncekine eklenir)
const listenOpts = (auto) => (HANDS_FREE ? { autoStop: SILENCE_MS, auto, endpoint: ENDPOINT, handsFree: true } : {});
const clock = () => Date.now(); // konuşma kuyruğu zamanlaması (olay anında çağrılır)
const EMPTY = { show: [], pending: null, nav: "", chat: "", share: "", att: null, engine: "", awaiting: false, races: [], person: null, event: null };
// Biten adım geçmiş zamanla yazılır ("Yoklama kaydediliyor" → "Yoklama kaydedildi")
const PAST = [[/ekleniyor$/, "eklendi"], [/yükleniyor$/, "yüklendi"], [/eşleştiriliyor$/, "eşleştirildi"], [/kaydediliyor$/, "kaydedildi"], [/hazırlanıyor$/, "hazırlandı"], [/inceleniyor$/, "incelendi"], [/gönderiliyor$/, "gönderildi"], [/alınıyor$/, "alındı"]];
const pastOf = (s) => pastTense(PAST.reduce((t, [re, to]) => t.replace(re, to), s));
// Sohbeti bitiren sözler ("bitir", "kapat", "tamam teşekkürler", "şimdilik bu kadar")
const KIND_ICON = { plan: "cal", task: "task", note: "note" };

// Ekrandan kalkan konuşma (keepPast): son 12 tur, taslak ve hafızayla birlikte, saklandığı an
const recentPast = (p) => Date.now() - p.at < PAST_MS;
const pastSnap = (prev, list, msgDraft, memo) => ({ turns: [...prev, ...list.filter((t) => t && !t.pre)].slice(-12), at: Date.now(), msgDraft, memo });

export function AssistantSheet({ open, onClose, seed, onLive, onAct, slot }) {
  const ctx = {}; // taşınan işlerin bağlamı (sonda doldurulur)
  const router = useRouter();
  const path = usePathname();
  const toast = useToast();
  const tts = useTts();
  const { profile } = useAuth();
  const { openBirthday } = useBirthday();
  const { plans, tasks, notes, receipts, birthdays, lessons = [], myUid: dataUid, toggleTask, updateRecord, deleteRecord, deleteSeries, rejectDelete, markPaid, members, allMembers, isStaff, saveDrafts, saveBirthday, addReply, isLocked } = useData();
  // Çalışan adları (ana hesap): ses çevirisine ipucu, yapay zekaya sorumlu atama ve "kimde ne iş var" soruları için
  const staff = isStaff ? [] : members;
  const staffNames = staff.map((m) => m.name).filter(Boolean);
  // Yarış adları (zor yazılanlar): ses çevirisine ipucu. Hafıza bir kez kayıtlı yarışlardan doldurulur.
  const racer = canSeeAthletes(profile?.email);
  const raceOrg = racer ? profile?.orgId : "";
  // Kayıtlı yarışlar: "D'Azur yarışına git" doğru yarışı açsın diye (asistan her açıldığında tazelenir)
  const races = useRef([]);
  useEffect(() => {
    if (raceOrg && open) loadRaces(raceOrg).then((l) => (races.current = l), () => {});
  }, [raceOrg, open]);
  // Kulüp özeti (ana yapay zekaya; lib/ai/clubDigest.js): sporcular, bu ayın aidatı, açık faturalar, envanter. Asistan
  // açılınca en çok 3 dakikada bir okunur (aidat 2, fatura 1 belge, envanter 1 sorgu; sporcular zaten bellekte)
  const club = useRef({ at: 0 });
  const owner = !isStaff && profile?.role === "owner";
  useEffect(() => {
    const org = profile?.orgId;
    if (!open || !org || isStaff || Date.now() - club.current.at < 3 * 60e3) return;
    const ym = todayStr().slice(0, 7);
    const at = Date.now();
    club.current.at = at;
    const data = (r) => (r.exists() ? r.data() : null);
    Promise.all([
      racer ? loadAthletes().then((d) => { const cls = byId(d.classes); return d.athletes.filter(isActive).map((a) => ({ studentName: a.studentName, cls: cls[a.currentClassId] || "" })); }).catch(() => []) : [],
      owner ? Promise.all([getDoc(doc(db, "orgs", org, "dues", "settings")), getDoc(doc(db, "orgs", org, "dues", ym))]).then(([c, m]) => ({ cfg: data(c), month: data(m), ym })).catch(() => null) : null,
      owner ? getDoc(doc(db, "orgs", org, "invoiceIndex", "open")).then((r) => data(r)?.list || []).catch(() => []) : [],
      owner ? getDocs(collection(db, "orgs", org, "inventories")).then((q) => q.docs.map((d) => d.data())).catch(() => []) : [],
    ]).then(([athletes, dues, invoices, inventories]) => {
      if (club.current.at === at) club.current = { at, athletes, dues, invoices, inventories };
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // Açık yarış sayfası (/athletes/races/<id>): yarış adı söylenmeden yapılan işler bu yarışa yazılır
  const hereRace = /^\/athletes\/races\/([\w-]+)$/.exec(path || "")?.[1];
  const curRace = hereRace && hereRace !== "new" ? hereRace : "";
  const attHere = path === "/athletes/attendance"; // yoklama sayfası: "Ali ve Zeynep geldi" yoklamadır
  const invPage = (path || "").startsWith("/inventory"); // envanter sayfaları: "2 şamandıra kayboldu" envanterdir
  const invHere = /^\/inventory\/([\w-]+)$/.exec(path || "")?.[1] || "";
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openMeeting } = useMeeting();
  const [text, setText] = useState("");
  const [turns, setTurns] = useState([]);
  const [used, setUsed] = useState(() => new Set()); // dokunulan sonuç düğmeleri ("<tur>:<tür>")
  const [phase, setPhase] = useState("idle"); // idle | thinking | preparing
  const [voice, setVoice] = useState(false);
  const [heard, setHeard] = useState("");
  const [cards, setCards] = useState(EMPTY);
  const [error, setError] = useState("");
  // Uzun işlemlerde yapılan adımlar panelde görünür: [{ label, st: "run" | "done" | "fail" }]
  const [steps, setSteps] = useState([]);
  const stepTo = (label) => (setSteps((p) => [...p.map((x) => (x.st === "run" ? { ...x, st: "done" } : x)), ...(label ? [{ label, st: "run" }] : [])]));
  const stepsEnd = (ok = true) => setSteps((p) => p.map((x) => (x.st === "run" ? { ...x, st: ok ? "done" : "fail" } : x)));
  const { idx: nameIdx } = useNameIndex();
  const [booting, setBooting] = useState(false); // mikrofonla açıldı, dinleme başlıyor
  // Tür sayfasından açıldıysa ("plan" | "task" | "note"): ilk cümle o türde kayda çevrilir
  const preferRef = useRef("");
  const [prefer, setPrefer] = useState("");
  // Açık ekran (sohbet ya da kayıt konuşması): { title, to, rec: { kind, id }, text } — asistan bu konuşmayı bilir,
  // alıcı söylenmeden "yaz/cevap ver" denirse mesaj buraya gider
  const focusRef = useRef(null);
  const sentOk = useRef(false); // bu konuşmada gerçekten mesaj gönderildi mi ("gönderdin mi?" sorusuna doğru cevap için)
  const askTo = useRef(null); // "Ekibe ne yazayım?" sorulduysa alıcı: sonraki cümle mesaj olur
  // Tek mesajda sıralı işler ("Gökhan'a yaz, takvime ekle, notlara liste hazırla"): sıradaki adımlar.
  // Bir adım bitince (mesaj gönderildi/vazgeçildi, kayıt eklendi/vazgeçildi) sıradaki başlar.
  const queue = useRef([]);
  const heldQ = useRef(null); // mesaj taslağı değiştirilirken sıradaki adımlar burada bekler
  const askAll = useRef(""); // sıralı işte mesajın içeriği soruldu: cevap tüm istekle yeniden sorulur
  const [focus, setFocus] = useState(null);
  const [drafts, setDrafts] = useState([]); // panelde hazırlanan yeni kayıtlar (bilgi tamamsa hemen kaydedilir)
  const [saved, setSaved] = useState([]); // az önce kaydedilenler: [{ kind, id, title, meta }] (kartta yalnız Düzenle)
  const convo = useRef(false); // sesli sohbet: her cevaptan sonra mikrofon kendiliğinden açılır
  // Canlı akış: yanıtı beklenen son sesli istek. Yanıt gelmeden konuşmaya devam edilirse yenisiyle birleştirilip yeniden gönderilir.
  const inflight = useRef(null);
  // Yanıt geldiğinde kullanıcı konuşmaya devam ediyordu: yanıt burada bekler. Söylenen gelirse öncekiyle birleşip yeniden
  // sorulur (bu atılır); dinleme metinsiz biterse (gürültü, öksürük) bekleyen yanıt uygulanır
  const parked = useRef(null);
  const holdIfTalking = (fn) => {
    if (!inflight.current || !sp.talking()) return false;
    parked.current = fn;
    return true;
  };
  const runId = useRef(0);
  // Asistanla kişi ekleme (yalnız ana hesap): { draft, step: "ask" | "confirm" | "saved" | "undo", ask, dups, uid }
  const personFlow = useRef(null);
  // Asistanla etkinlik planı: yer/zaman sorulduysa { text, turns } (sonraki cümle cevap; sessiz kalınırsa genel plan)
  const eventFlow = useRef(null);
  const invFlow = useRef(null); // envanter: silme onayı bekleniyor { org, id, name, kind, ask: [ürün] }
  const attAsk = useRef(null); // yoklamada "Kimi ekleyeyim?" soruldu: { text } (ilk cümle; cevap yalnız ad)
  const athAsk = useRef(false); // "Yeni sporcunun adı soyadı ne?" soruldu: sonraki cümle ad
  const okFlow = useRef(null); // geri alınamayan iş onay bekliyor (arama, sporcu silme, aidat hatırlatması): { yes(viaVoice) }
  const logFlow = useRef(null); // antrenman günlüğü: { ask, text } tarih soruldu · { date, time } az önce yazıldı, eksikler söylenebilir
  const turnCount = useRef(0);
  const raceChoices = useRef([]); // "Hangisi?" diye sorulan yarışlar: sonraki cümle "ikincisi", "Foça olan" olabilir
  const skipRace = useRef(false); // yarış sayfasında yarışla ilgisiz çıkan cümle bir kez yarışa gitmeden sorulur
  const startedFor = useRef(null); // geliştirme modunda (Strict Mode) açılış iki kez çalışmasın
  const ctrl = useRef(null);
  const live = useRef({});

  // Mesaj alıcıları: sohbet rehberindeki kişiler (ana hesap "ana hesap" adıyla da bulunur)
  const { people: chatPeople = [], send: chatSend, uid: myUid, groupIds = [], chats = [], createGroup } = useChat() || {};
  const { startCall, busy: callBusy } = useCall() || {}; // "Ali'yi ara": uygulama içi sesli arama
  const contacts = chatPeople.map((p) => ({ name: p.name || "", aliases: p.role === "owner" ? ["ana hesap", "patron"] : [], p })).filter((c) => c.name);
  // Mesajlar'da kurulan gruplar (üyesi olduklarım) da alıcıdır
  const myGroups = chats.filter((c) => c.type === "group" && c.name).map((c) => ({ id: c.id, name: c.name }));
  // Kişilerde olup uygulamada hesabı olmayanlar (yalnız ana hesap): telefonu varsa mesaj WhatsApp'la gider
  const waPeople = members.filter((m) => m.account === false && m.name && waPhone(m.phone) && !contacts.some((c) => c.name === m.name)).map((m) => ({ name: m.name, wa: waPhone(m.phone) }));
  const contactNames = [
    ...(focus?.rec ? [`${RECORD_TO} (kayıt)`] : []),
    ...groupIds.map((g) => `${GROUPS[g].name} (grup)`),
    ...myGroups.filter((g) => !groupIds.some((x) => GROUPS[x].name === g.name)).map((g) => `${g.name} (grup)`),
    ...contacts.map((c) => (c.p.role === "owner" ? `${c.name} (ana hesap)` : c.name)),
    ...waPeople.map((w) => `${w.name} (WhatsApp)`),
  ];

  const myKind = useKind();
  const firstName = (profile?.name || "").split(" ")[0];
  // WhatsApp gruba metinle açılan bağlantı vermiyor; davet bağlantısı (chat.whatsapp.com) üye olunan grubu iPhone'da açmıyor
  // (Seyhun denedi, 2026-10-06). Bu yüzden WhatsApp metin hazır açılır (wa.me/?text=), grup WhatsApp'ın listesinden seçilir.
  const WA_PICK = "WhatsApp açılınca listeden grubu seç (üstte yoksa ara); mesaj hazır gelir, gönder'e dokun";
  const by = { name: profile?.name ?? "Kullanıcı" };
  const find = (kind, id) => ({ plan: plans, task: tasks, note: notes }[kind] || []).find((x) => x.id === id);
  const busy = phase !== "idle";

  // Ses çevirisinin kelime listesi: çalışanlar, mesaj kişileri, sporcular (sporcu adları bu cihazda saklı, ek okuma yok).
  // Canlı yazı ve son yazı bu adları doğru yazar ("Uğraz" → "Uraz"; Seyhun: "kelimeler düzeltilmiş gösterilsin", 2026-10-09)
  const athNames = useMemo(() => (open && racer ? athleteNames() : []), [open, racer]);
  const sttNames = [...new Set([...staffNames, ...contacts.map((c) => c.name), ...athNames])].slice(0, 60);
  const sp = useSpeech({
    noLevel: true, // ses seviyesi dalgaya (ListenWave) doğrudan gider; burada saniyede 10 yeniden çizim olmasın
    names: sttNames,
    terms: racer ? raceNames().slice(0, 12) : [],
    onFinal: (raw, mode) => {
      const tx = applyFixes(fixNames(unglue(raw), staffNames), loadFixes()); // "san ver" → "Sanver"; yapay zekanın önceki düzeltmeleri (sttFixes)
      if (mode === "edit") setText((p) => (p ? `${p} ${tx}` : tx));
      else if (isEnd(tx)) finish(); // "kapat", "tamam kapat": bekleyen istekle birleşmez, sessizce kapanır
      else if (inflight.current) {
        // Kullanıcı yanıt gelmeden konuşmaya devam etti: bekleyen isteği bırak, öncekiyle birleştirip yeniden gönder
        const merged = `${inflight.current} ${tx}`.replace(/\s+/g, " ").trim();
        inflight.current = null;
        parked.current = null;
        cancelRun();
        setTurns((p) => (p.at(-1)?.role === "user" ? p.slice(0, -1) : p));
        run(merged, true);
      } else run(text ? `${text} ${tx}` : tx, true);
    },
    onFail: (m) => toast(m),
    onMiss: () => {
      const f = parked.current;
      parked.current = null;
      if (f) setTimeout(f, 0);
    },
  });
  // heardNow: o an duyulan (yanıt gelirken hâlâ konuşuyor mu); spStatus: mikrofon durumu
  live.current = { open, text, heardNow: `${sp.finalText}${sp.interim}`.trim(), spStatus: sp.status };
  const listening = sp.status === "listening";
  const transcribing = sp.status === "transcribing";

  // Sesli sohbette cevaptan sonra dinlemeye devam (15 sn konuşulmazsa mikrofon durur, sohbet açık kalır)
  // Kısa gecikme: cevap aynı anda hazırlandıysa (yerel komut) yazı kutusunun temizlenmiş hali okunsun
  const startAuto = () =>
    HANDS_FREE &&
    setTimeout(() => {
      if (live.current.open && !live.current.text) sp.start({ autoStop: SILENCE_MS, auto: true, quiet: true, endpoint: ENDPOINT, handsFree: true });
    }, 150);
  // Kısa cevap beklenen soru (yoklamada "Kimi ekleyeyim?"): soru sesle sorulduysa okununca mikrofon bir kez kendiliğinden
  // açılır, ad söylenip susunca gönderilir (dokunmak gerekmez); 8 sn konuşulmazsa kapanır
  const listenOnce = () =>
    setTimeout(() => {
      if (live.current.open && !live.current.text && live.current.spStatus === "idle") sp.start({ auto: true, quiet: true, autoStop: 8000, endpoint: 1500, handsFree: true });
    }, 150);
  // Yapay zeka düşünürken de dinle: kullanıcı devam ederse söylediği öncekine eklenir
  const listenWhileThinking = () =>
    HANDS_FREE &&
    setTimeout(() => {
      // Okunacak cevap varken açılmaz (mikrofon açılınca konuşma susar; akışta gelen cevap kesilmesin)
      if (sayQ.current.busy || sayQ.current.items.length) return;
      if (live.current.open && live.current.spStatus === "idle" && inflight.current) sp.start({ auto: true, quiet: true, endpoint: ENDPOINT, handsFree: true });
    }, 120);

  function cancelRun() {
    runId.current += 1;
    aiLesson.current = null; // vazgeçilen ya da kapatılan iş öğrenilmez
    planLearn.current = null;
    ctrl.current?.abort();
    setPhase("idle");
  }

  // Yanıtı akışa ekler, kartları günceller, sesli okur. Sesli sohbetteyse okuma bitince mikrofon yeniden açılır
  // (kullanıcı "bitir" diyene ya da kapatana kadar sohbet sürer).
  // Konuşma kuyruğu: ön cevap, akışta tamamlanan cümleler ve yanıtın kalanı sırayla okunur (biri ötekini kesmez).
  // Sesli yanıt kapalıysa tts.speakThen hemen döner, kuyruk anında boşalır. Dışarıdan susturulursa (mikrofon açıldı)
  // takılı kalmaz: bir süredir konuşma yoksa kuyruk sıfırlanır.
  const sayQ = useRef({ busy: false, items: [], gen: 0, since: 0 });
  const speakingRef = useRef(false);
  useEffect(() => {
    speakingRef.current = tts.speaking;
  }, [tts.speaking]);
  const pumpSay = () => {
    const q = sayQ.current;
    const it = q.items.shift();
    if (!it) {
      q.busy = false;
      return;
    }
    q.busy = true;
    q.since = clock();
    const g = q.gen;
    tts.speakThen(it.text, () => {
      if (g !== sayQ.current.gen) return;
      it.after?.();
      pumpSay();
    });
  };
  const enqueueSay = (text, after) => {
    const q = sayQ.current;
    if (q.busy && !speakingRef.current && clock() - q.since > 1500) q.busy = false; // susturuldu: takılmasın
    q.items.push({ text, after });
    if (!q.busy) pumpSay();
  };
  const clearSay = () => (sayQ.current = { busy: false, items: [], gen: sayQ.current.gen + 1, since: 0 });
  const draftSrc = useRef(""); // taslakları doğuran cümle (öğrenme kaydı ve "Düzenle" için; sohbetin ilk cümlesi değil)
  const streamSaid = useRef(""); // akışta okunmak üzere kuyruğa giren metin (yanıt gelince yalnız kalanı okunur)
  const [streamText, setStreamText] = useState(""); // akışta gelen yanıt (kelime kelime)
  const [work, setWork] = useState(""); // beklerken görünen iş: "Mesaj hazırlanıyor", "Plan hazırlanıyor"… (ön cevaptan, lib/precue.js; liste lib/assistTasks.js)
  const [workPhase, setWorkPhase] = useState(""); // iş bitince (boşta) yazı silinsin: önceki iş başka akışta görünmesin
  if (phase === "idle" && workPhase !== "idle") {
    setWorkPhase("idle");
    if (work) setWork("");
  } else if (phase !== "idle" && workPhase === "idle") setWorkPhase(phase);

  // İşler bitince (son işten sonra) asistan "Başka bir isteğin var mı?" diye sorar; "yok/hayır" denirse kapanır
  const askedMore = useRef(false);
  const invAsk = useRef(null); // "Hangi fatura?" soruldu: { op }
  // Bu sohbette hazırlanan son mesaj taslağı { to, label, text, wa, state, age }: yapay zekaya bağlam olarak gider,
  // "şunu da ekle", "saati 10 yap" onu değiştirir (lib/convoContext.js). Sohbet kapanınca sıfırlanır.
  const msgDraft = useRef(null);
  function done(...a) {
    return by_cevap.done(ctx, ...a);
  }
  // Sıralı görev zinciri (lib/chain.js): "yarışı oluştur, sonra Instagram'da gönderi hazırla, sonra aidata nakit yaz…".
  // Her iş kendi akışında yapılır; soru sorulursa cevap beklenir, iş bitince (cevap okunduktan sonra) sıradakine geçilir.
  const chain = useRef([]); // sırada bekleyen cümleler
  const chainGen = useRef(0); // sohbet kapanınca bekleyen geçiş iptal olur
  const chainStep = useRef(false); // şu an çalışan cümle zincirden geldi (açık sayfa onu yutmasın)
  const planNow = useRef(""); // görev listesinde şu an yapılan işin adı
  const planCutN = useRef(0); // listeye sığmayan iş sayısı (en çok PLAN_MAX iş yapılır; sonda söylenir)
  const planIdx = useRef(-1); // görev listesinde şu an yapılan işin sırası (✓/✗ bu satıra konur)
  const planKind = useRef(""); // şu an yapılan işin türü (race, post…)
  const raceFailed = useRef(false); // listede yarış oluşturulamadı: ona bağlı gönderi yapılmaz (denetim B15)
  const planFails = useRef([]); // yapılamayan işler (listenin sonunda "elle yap" denir)
  // Yerelde öğrenme yalnız başarılı işten (Seyhun, 2026-10-09): yapay zekanın görev listesi ({ say, tasks, ok }) ve ana
  // yapay zekanın sonucu ({ x, l }) iş ✓ bitince öğrenme deposuna yazılır; ✗, vazgeç ya da kapatmada yazılmaz
  const planLearn = useRef(null);
  const aiLesson = useRef(null);
  const chainRace = useRef(""); // zincirde açılan / değişen yarış: "bunun için gönderi hazırla"
  const [plan, setPlan] = useState([]); // görev listesi: [{ label, st: wait | run | done | fail }]
  const planOn = useRef(false); // görev listesi sürüyor
  const raceFollow = useRef(null); // yeni yarışta tarih / sporcu soruldu: { id, n }
  // Sohbet hafızası: az önce konuşulan yarış, kişi, sporcu, gönderi, kayıt (convoContext `remember`); sohbet kapanınca sıfırlanır
  const memo = useRef({});
  const memoSet = (key, value) => (memo.current = remember(memo.current, key, value));
  // Önceki konuşma: küreye yeniden basınca ya da kapatıp açınca ekran temiz başlar, yapay zekanın bağlamı sürer
  // (Seyhun: "önceki sohbeti de göndermemiz gerekiyor ki ona göre devamını getirelim", 2026-10-09). Ekrandan kalkan turlar,
  // açık mesaj taslağı ve sohbet hafızası PAST_MS boyunca saklanır; her istekte geçmişin başına eklenir
  const past = useRef({ turns: [], at: 0, msgDraft: null, memo: {} });
  const pastOn = () => recentPast(past.current);
  const pastTurns = () => (pastOn() ? past.current.turns : []);
  function keepPast(list) {
    past.current = pastSnap(pastTurns(), list, msgDraft.current, memo.current);
  }
  // Tek bekleyen soru: yeni bir soru sorulunca öncekiler kapanır (sonraki cümle yalnız son soruya cevap sayılır)
  const ASK_REFS = { attName: attAsk, raceChoice: raceChoices, to: askTo, log: logFlow, person: personFlow, invoice: invAsk, ok: okFlow, athlete: athAsk, raceFollow, event: eventFlow, inv: invFlow };
  function waitFor(kind = "") {
    asksToClear(kind).forEach((k) => (ASK_REFS[k].current = ASK_EMPTY[k]));
  }
  const speaking = useRef(false);
  useEffect(() => {
    speaking.current = tts.speaking;
  });
  function nextInChain(...a) {
    return by_gorevListesi.nextInChain(ctx, ...a);
  }

  function reply(...a) {
    return by_cevap.reply(ctx, ...a);
  }

  function park(...a) {
    return by_cevap.park(ctx, ...a);
  }

  // ---- Panelde yeni kayıt: taslak kartlar, "kaydet" deyince kaydedilir ----
  const canAssign = !isStaff && members.length > 0;
  const withAssignees = ({ assignTo, ...x }, t = "") => {
    if (!canAssign) return x;
    const names = Array.isArray(assignTo) && assignTo.length ? assignTo : assigneesInText(t, staffNames);
    if (names.length) return { ...x, assignees: namesToUids(names, members) };
    return Array.isArray(assignTo) ? { ...x, assignees: [] } : x;
  };
  function draftSay(...a) {
    return is_kayit.draftSay(ctx, ...a);
  }
  function startDrafts(...a) {
    return is_kayit.startDrafts(ctx, ...a);
  }
  function refineDrafts(...a) {
    return is_kayit.refineDrafts(ctx, ...a);
  }
  function createAs(...a) {
    return is_kayit.createAs(ctx, ...a);
  }
  // Bilgisi tamam taslak (eksik soru yok, başlık/tarih var) sormadan kaydedilir; kartta yalnız Düzenle kalır
  // Kayıt sorulmadan yapıldığı için yapay zekanın soru ve "oluşturuyorum/ekliyorum" cümleleri atılır
  // (önceden "Akşam 8 için planı oluşturuyorum, onaylıyor musun? Ekledim: …" okunuyordu); yalnız ek bilgi kalır
  const extra = (m) => extraNote(m);
  const ready = (list) => list.length > 0 && !firstNeed(list) && list.every((d) => !check(d));
  function saveDraftsNow(...a) {
    return is_kayit.saveDraftsNow(ctx, ...a);
  }
  function dropDrafts(...a) {
    return is_kayit.dropDrafts(ctx, ...a);
  }
  function editDraftsFull(...a) {
    return is_kayit.editDraftsFull(ctx, ...a);
  }

  // Sayfayı aç: panel açık kalır, sohbet sürer
  // Sayfa açılınca panel küçülür (tam ekran panelin arkasında kalmasın); sohbet sürer
  // Sayfayı bu hesap açabilir mi (yoklama: sporcu yetkisi, kişiler: ana hesap, fiş: fiş ekleyebilen, yoklamam: sporcu/veli)
  const canOpen = (page) => {
    const need = PAGES[page]?.need;
    if (need === "athletes") return canSeeAthletes(profile?.email);
    if (need === "athleteSide") return isAthleteSide(myKind);
    if (need === "owner") return !isStaff;
    if (need === "receipts") return canReceipts(myKind);
    return !!PAGES[page];
  };
  function openNav(...a) {
    return by_yonlendirme.openNav(ctx, ...a);
  }
  function openChatAt(...a) {
    return by_yonlendirme.openChatAt(ctx, ...a);
  }
  function leave(...a) {
    return by_cevap.leave(ctx, ...a);
  }
  function failNow(...a) {
    return by_cevap.failNow(ctx, ...a);
  }

  function openRace(...a) {
    return is_yaris.openRace(ctx, ...a);
  }

  function goRace(...a) {
    return is_yaris.goRace(ctx, ...a);
  }

  function runStep(...a) {
    return by_gorevListesi.runStep(ctx, ...a);
  }
  function nextStep(...a) {
    return by_gorevListesi.nextStep(ctx, ...a);
  }

  function go(...a) {
    return by_gorevListesi.go(ctx, ...a);
  }

  function handle(...a) {
    return by_yapayZeka.handle(ctx, ...a);
  }

  function runNow(...a) {
    return by_yapayZeka.runNow(ctx, ...a);
  }
  function askDelete(...a) {
    return by_yapayZeka.askDelete(ctx, ...a);
  }
  function openRecord(...a) {
    return by_yonlendirme.openRecord(ctx, ...a);
  }

  function flowOf(...a) {
    return by_gorevListesi.flowOf(ctx, ...a);
  }
  function startPlan(...a) {
    return by_gorevListesi.startPlan(ctx, ...a);
  }
  function sayRace(...a) {
    return by_gorevListesi.sayRace(ctx, ...a);
  }
  function askTasks(...a) {
    return by_gorevListesi.askTasks(ctx, ...a);
  }

  function run(...a) {
    return by_yonlendirme.run(ctx, ...a);
  }

  function askAI(...a) {
    return by_yapayZeka.askAI(ctx, ...a);
  }

  function runLocal(...a) {
    return by_yonlendirme.runLocal(ctx, ...a);
  }

  function resolveTo(...a) {
    return is_mesaj.resolveTo(ctx, ...a);
  }
  function prepareSend(...a) {
    return is_mesaj.prepareSend(ctx, ...a);
  }
  const setSendText = (t) => {
    if (msgDraft.current) msgDraft.current = { ...msgDraft.current, text: t }; // kartta elle düzeltilen metin de bağlama gider
    setCards((c) => (c.pending?.send ? { ...c, pending: { send: { ...c.pending.send, text: t } } } : c));
  };

  function confirmPending(...a) {
    return is_mesaj.confirmPending(ctx, ...a);
  }

  function cancelPending(...a) {
    return is_mesaj.cancelPending(ctx, ...a);
  }

  // ---- Kişi ekleme (yalnız ana hesap): bilgiler toplanır, eksikler sorulur, mükerrer bakılır, özet kartında onaylanır ----
  // Hesap açılmaz; kaydedince "Hesap da açalım mı?" sorulur ve kişi kartı hesap ekranında açılır (kullanıcı adı/şifreyi kişi görür).
  const personCard = (f) => ({ draft: f.draft, step: f.step, dups: f.dups || [], uid: f.uid || "", acc: f.acc || null });
  function startPerson(...a) {
    return is_kisi.startPerson(ctx, ...a);
  }
  function stepPerson(...a) {
    return is_kisi.stepPerson(ctx, ...a);
  }
  function continuePerson(...a) {
    return is_kisi.continuePerson(ctx, ...a);
  }
  function personSave(...a) {
    return is_kisi.personSave(ctx, ...a);
  }
  function personCancel(...a) {
    return is_kisi.personCancel(ctx, ...a);
  }
  function personAccount(...a) {
    return is_kisi.personAccount(ctx, ...a);
  }
  function personOpenAccount(...a) {
    return is_kisi.personOpenAccount(ctx, ...a);
  }
  function personEdit(...a) {
    return is_kisi.personEdit(ctx, ...a);
  }
  function personUndoAsk(...a) {
    return is_kisi.personUndoAsk(ctx, ...a);
  }
  function personUndo(...a) {
    return is_kisi.personUndo(ctx, ...a);
  }

  function runShopAdd(...a) {
    return is_alisveris.runShopAdd(ctx, ...a);
  }
  function runShopMark(...a) {
    return is_alisveris.runShopMark(ctx, ...a);
  }
  function runInvoice(...a) {
    return is_para.runInvoice(ctx, ...a);
  }

  function askOk(...a) {
    return by_cevap.askOk(ctx, ...a);
  }
  function saveHereRace(...a) {
    return is_yaris.saveHereRace(ctx, ...a);
  }
  function runExtra(...a) {
    return is_komutlar.runExtra(ctx, ...a);
  }
  function runMore(...a) {
    return is_komutlar.runMore(ctx, ...a);
  }

  function runResults(...a) {
    return is_yaris.runResults(ctx, ...a);
  }

  function runDebt(...a) {
    return is_para.runDebt(ctx, ...a);
  }

  function runPayee(...a) {
    return is_para.runPayee(ctx, ...a);
  }

  function runShopRead(...a) {
    return is_alisveris.runShopRead(ctx, ...a);
  }

  function runAttendance(...a) {
    return is_yoklama.runAttendance(ctx, ...a);
  }
  // Yapay zekanın "Mustafa (2 kişi)" diye yazdığı belirsiz adlar: "2 Mustafa var: … Hangisi?" ve seçenekler (denetim B17)
  const AMB = /\(\d+\s*kişi\)/u;
  function sameIn(...a) {
    return is_yaris.sameIn(ctx, ...a);
  }
  function runRace(...a) {
    return is_yaris.runRace(ctx, ...a);
  }
  function startPost(...a) {
    return is_yaris.startPost(ctx, ...a);
  }
  function runPost(...a) {
    return is_yaris.runPost(ctx, ...a);
  }
  function runLog(...a) {
    return is_gunluk.runLog(ctx, ...a);
  }
  function runEvent(...a) {
    return is_etkinlik.runEvent(ctx, ...a);
  }
  function runInventory(...a) {
    return is_envanter.runInventory(ctx, ...a);
  }
  function invDelete(...a) {
    return is_envanter.invDelete(ctx, ...a);
  }
  function eventDelete(...a) {
    return is_etkinlik.eventDelete(ctx, ...a);
  }
  // Soru sorulduktan sonra mikrofon açılıp hiç konuşulmadan kapandıysa: genel plan
  useEffect(() => {
    turnCount.current = turns.length;
  }, [turns.length]);
  useEffect(() => {
    const f = eventFlow.current;
    if (!f || !open) return;
    if (listening) {
      if (f.turns == null) f.turns = turnCount.current;
      return;
    }
    if (f.turns == null || transcribing || busy) return;
    const t = setTimeout(() => {
      if (eventFlow.current !== f || live.current.spStatus !== "idle" || turnCount.current !== f.turns) return;
      eventFlow.current = null;
      runEvent(f.text, true, true, "Cevap gelmedi, genel bir plan yaptım. ");
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, transcribing, busy, open]);

  function runFitness(...a) {
    return is_fitness.runFitness(ctx, ...a);
  }

  function runFood(...a) {
    return is_fitness.runFood(ctx, ...a);
  }

  function runSchedule(...a) {
    return is_ders.runSchedule(ctx, ...a);
  }

  function restAfterAtt(...a) {
    return is_yoklama.restAfterAtt(ctx, ...a);
  }

  function saveAtt(...a) {
    return is_yoklama.saveAtt(ctx, ...a);
  }
  function undoAtt(...a) {
    return is_yoklama.undoAtt(ctx, ...a);
  }

  function stopPlan(...a) {
    return by_gorevListesi.stopPlan(ctx, ...a);
  }
  function abort(...a) {
    return by_cevap.abort(ctx, ...a);
  }

  function finish(...a) {
    return by_cevap.finish(ctx, ...a);
  }

  const docked = open; // tek görünüm: açıkken konuşma hep kubbede
  // Sahneye canlı durum: dinliyor mu, ne duyuldu, son cevap, düşünüyor mu
  const lastReply = [...turns].reverse().find((x) => x.role === "assistant")?.text || "";
  const heardNow = `${sp.finalText || ""}${sp.interim || ""}`.trim();
  // Şu an yapılan iş (kubbede kürenin altında, ortada): sürmekte olan adım, işin yazısı ("WhatsApp mesajı hazırlanıyor")
  // ya da isteğin kendisinden yazı ("Cumhuriyet yarışı oluşturuluyor"); ses yazıya çevrilirken yazı yok. Yanıt akarken yok.
  const stepNow = steps.find((x) => x.st === "run")?.label || "";
  // Beklerken sıralı yazılar (adım sürmüyorsa): işin adı hemen, yanıt gecikirse hazır yazılar sırayla (WaitLines.jsx)
  const waiting = (busy || transcribing) && !streamText && !(transcribing && heardNow); // ara adımlar (stepTo) görünmez, yerine sıralı yazılar
  // Görev listesi sürerken süren iş listede parlıyor: aynı ad bilgi alanında ikinci kez yazılmaz
  const planRun = plan.some((x) => x.st === "run");
  // Durum satırı işin adından; kullanıcının sözünden kelime almaz (söz alttaki kutuda zaten yazıyor, iki yerde görünmesin)
  const wait = useWaitLines(waiting && !(planRun && busy), busy ? work : "", !busy && transcribing);
  const workNow = (busy || transcribing) && !streamText && !(transcribing && heardNow) ? stepNow || wait?.now || "" : "";
  // Canlı yazıda (Chrome) "kapat" duyulunca konuşma bitişi beklenmez: dinleme hemen durur, asistan sessizce kapanır
  useEffect(() => {
    if (open && listening && isCloseNow(heardNow)) finish();
  }, [open, listening, heardNow]); // eslint-disable-line react-hooks/exhaustive-deps
  // heard yalnız o an duyulan: gönderilen söz zaten balon olarak akışta (yanıt beklenirken açılan mikrofonda yeniden gösterilmez)
  useEffect(() => {
    onLive?.({ open, docked, listening, transcribing, busy, heard: heardNow, said: heard, draft: text, lastReply, speaking: tts.speaking, booting, talked: turns.length > 0, status: workNow });
  }, [onLive, open, docked, listening, transcribing, busy, heardNow, heard, text, lastReply, tts.speaking, booting, turns.length, workNow]);
  // Sahnenin düğmeleri buradaki işleri çağırır
  const stageListen = () => {
    convo.current = true;
    // Küreye yeniden basınca ekran temiz başlar (eski konuşma bir an görünüp kaybolmasın); bir soruya cevap beklenmiyorsa.
    // Kalkan konuşma yapay zekaya geçmiş olarak gitmeye devam eder (keepPast)
    const lastAsk = [...turns].reverse().find((t) => t.role === "assistant" && !t.pre)?.text || "";
    const asking = cards.awaiting || cards.pending || drafts.length || planOn.current || (!askedMore.current && /\?\s*$/.test(lastAsk));
    if (!asking && turns.length && phase === "idle") {
      keepPast(turns);
      setTurns([]);
      setCards(EMPTY);
      setSteps([]);
      setPlan([]);
      setError("");
    }
    setHeard("");
    clearSay();
    tts.stop();
    sp.start(listenOpts(false));
  };
  useEffect(() => {
    onAct?.({
      listen: stageListen,
      stop: () => sp.stop("send"),
      // Konuşma kutusu (Seyhun'un örneği): ■ dinlemeyi durdurur, söylenen kutuda kalır (gönderilmez); ↑ kutudakini gönderir;
      // × dinlemeyi de kutudakini de siler. draft: kutuda bekleyen söz (yeniden konuşulursa başına eklenir)
      edit: () => sp.stop("edit"),
      send: () => {
        const t = text.trim();
        setText("");
        if (t) run(t, true);
      },
      takeDraft: () => {
        const t = text;
        setText("");
        return t;
      },
      cancel: () => {
        sp.cancel();
        setText("");
      },
      abort: () => {
        sp.cancel();
        cancelRun();
      },
      close: () => finish(false),
    });
  });
  useEffect(() => {
    if (!open) return;
    document.body.dataset.asst = "dock";
    return () => delete document.body.dataset.asst;
  }, [open]);

  useEffect(() => {
    if (!booting) return;
    if (sp.status !== "idle") {
      setBooting(false);
      return;
    }
    const t = setTimeout(() => setBooting(false), 1500); // mikrofon açılamadıysa normal ekrana dön
    return () => clearTimeout(t);
  }, [booting, sp.status]);

  useEffect(() => {
    if (!open) {
      cancelRun();
      sp.cancel();
      startedFor.current = null;
      setBooting(false);
      // Kapanma animasyonu bitince temizle: bir sonraki açılışta eski konuşma görünmesin (yapay zekanın bağlamında kalır)
      keepPast(turns);
      msgDraft.current = null;
      const t = setTimeout(() => {
        setTurns([]);
        setUsed(new Set());
        setDrafts([]);
        setSaved([]);
        setCards(EMPTY);
        setText("");
        setHeard("");
        setError("");
        setPhase("idle");
      }, 350);
      return () => clearTimeout(t);
    }
    if (startedFor.current === seed?.id) return;
    const cont = seed?.cont && startedFor.current !== null;
    startedFor.current = seed?.id;
    preferRef.current = seed?.prefer || "";
    setPrefer(seed?.prefer || "");
    focusRef.current = seed?.focus || null;
    askTo.current = null;
    sentOk.current = false;
    setFocus(seed?.focus || null);
    // Panel zaten açıktı (alttaki "Konuş"/"Yaz"): sohbet sıfırlanmaz, kaldığı yerden devam
    if (cont) {
      if (seed?.text) run(seed.text, !!seed.voice);
      else if (seed?.listen) {
        convo.current = true;
        sp.start(listenOpts(true));
      }
      return;
    }
    convo.current = !!(seed?.listen || seed?.voice);
    msgDraft.current = null;
    setDrafts([]);
    setSaved([]);
    setText("");
    setTurns([]);
    setUsed(new Set());
    setCards(EMPTY);
    setPhase("idle");
    setHeard("");
    setError("");
    setVoice(!!seed?.voice);
    if (seed?.text) run(seed.text, !!seed.voice, true);
    else if (seed?.listen) {
      setBooting(true);
      sp.start(listenOpts(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed?.id]);

  // Yapay zeka aynı kaydı birden çok kez gösterebilir: her kayıt bir kez listelenir
  const shownOf = (show = []) =>
    show
      .filter((x, i, a) => a.findIndex((y) => y.kind === x.kind && y.id === x.id) === i)
      .map((x) => ({ kind: x.kind, rec: find(x.kind, x.id) }))
      .filter((x) => x.rec);
  // Cevabın altındaki sonuç düğmeleri; dokunulan düğme soluklaşır ("used")
  const markLink = (i, k) => setUsed((u) => (u.has(`${i}:${k}`) ? u : new Set(u).add(`${i}:${k}`)));
  const linkCls = (i, k) => (used.has(`${i}:${k}`) ? " opacity-55" : "");
  const turnLinks = (t, i, embedded) => {
    const l = t.links;
    if (!l) return null;
    const shown = shownOf(l.show);
    return (
      <>
        {shown.length > 0 && (
          <RecordList
            items={shown}
            plans={plans}
            onToggle={toggleTask}
            onOpen={(kind, id) => {
              if (!embedded) park();
              openAdd({ edit: { kind, id } });
            }}
          />
        )}
        {l.share && (
          <button
            type="button"
            onClick={() => (markLink(i, "share"), shareGroup(l.share))}
            className={`fade-in mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-ok text-[0.875rem] font-semibold text-white active:scale-[.98]${linkCls(i, "share")}`}
          >
            <Icon name="whatsapp" className="size-4" /> {used.has(`${i}:share`) ? "WhatsApp'ta açıldı · yeniden" : "WhatsApp grubunda aç"}
          </button>
        )}
        {l.chat && (
          <button
            type="button"
            onClick={() => {
              markLink(i, "chat");
              finish(false);
              router.push(`/messages?c=${l.chat}`);
            }}
            className={`fade-in mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-bg text-[0.875rem] font-semibold active:scale-[.98]${linkCls(i, "chat")}`}
          >
            <Icon name="chat" className="size-4" /> Sohbeti aç
          </button>
        )}
        {l.nav && PAGES[l.nav] && (
          <button type="button" onClick={() => (markLink(i, "nav"), go(l.nav, ""))} className={`fade-in mt-3 h-10 w-full rounded-xl bg-bg text-[0.875rem] font-semibold active:scale-[.98]${linkCls(i, "nav")}`}>
            {PAGES[l.nav].label} sayfasını aç
          </button>
        )}
      </>
    );
  };
  const askObj = cards.awaiting
    ? {
      chips: cards.pending?.actions || cards.pending?.att ? [{ label: "Onayla", onPick: () => confirmPending() }, { label: "Vazgeç", onPick: () => cancelPending() }] : (cards.picks || []).map((n) => ({ label: n, onPick: () => (sp.cancel(), say(n)) })), // mesaj kartının kendi düğmeleri var
      onMic: () => sp.start({ autoStop: SILENCE_MS }),
      hint: "",
    }
    : null;
  const say = (t) => run(t, false);
  const draftMeta = (d) =>
    [
      d.type === "plan" ? "Plan" : d.type === "task" ? "Görev" : "Not",
      d.date && rel(d.date),
      d.type === "plan" && (d.time || (d.allDay ? "tüm gün" : "")),
      d.type === "plan" && d.repeat === "week" && !d.endDate && `her hafta (${seriesDates(d.date, d.repeatUntil).length} hafta)`,
      d.place,
      d.assignees?.length && `→ ${uidsToNames(d.assignees, members).map((n) => n.split(" ")[0]).join(", ")}`,
    ]
      .filter(Boolean)
      .join(" · ");

  // Konuşma akışı: tam panelde ve sahnenin içinde aynı (embedded: sahnede; tanıtım yazısı yok, panel küçülmez)
  // İşler yapılırken söylenen cümle alttaki kutuda yazar; üstte ayrıca balon olarak gösterilmez (Seyhun'un seçimi, 2026-10-09)
  const hideSaid = docked && busy && turns.at(-1)?.role === "user" && !turns.at(-1)?.chip;
  const convoView = (embedded) => (
    <>
        {!embedded && turns.length === 0 && !listening && !busy && !transcribing && (
          <div className="pt-3">
            {/* Hazır örnek düğmeleri yok: öneriler, hızlı öğrenme verisi hazır olunca gelecek */}
            <p className="text-[0.8125rem] text-mut">
              {prefer
                ? `Yeni ${{ plan: "plan", task: "görev", note: "not" }[prefer] || "kayıt"}: söyle ya da yaz, ben hazırlayayım; sonra “kaydet” de. Soru da sorabilirsin.`
                : "Arka arkaya isteyebilirsin; bitince “bitir” de."}
            </p>
          </div>
        )}

        <Thread turns={hideSaid ? turns.slice(0, -1) : turns} engine={cards.engine} tts={tts} ask={askObj} canFix={false} onFix={() => { }} extra={(t, i) => turnLinks(t, i, embedded)} />

        {/* Cevabın yeri: gelene kadar sıralı durum yazıları (Seyhun: "hızlıysa hemen göster, uzun sürerse hazır yazıları
            sırayla göster; sade, hafif soluk, parlayan", 2026-10-09). Yanıt akmaya başlayınca ya da adımlar görünürken yok */}
        {wait && <WaitLines lines={wait} onCancel={embedded ? null : transcribing && !busy ? sp.cancel : abort} />}

        {/* Akışta gelen yanıt: kelime kelime; bitince yerini asıl yanıt alır */}
        {busy && streamText && (
          <div className="mt-3.5" aria-live="polite">
            <p className="min-w-0 pr-6 text-[1.0625rem] leading-relaxed tracking-[-.005em]">
              {streamText}
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-acc" aria-hidden="true" />
            </p>
          </div>
        )}

        {/* Görev listesi (tek cümlede birden çok iş): yalnız işlerin adı ve sonucu; ara adımlar (sporcular yükleniyor…) görünmez.
            Biten iş soluk ve işaretli, süren iş parlıyor, sıradakiler silik (Seyhun, 2026-10-09) */}
        {plan.length > 0 && (
          <ol className="fade-in mt-3 space-y-1.5 text-[0.9375rem]" aria-label="Görev listesi">
            {plan.map((x, i) => (
              <li key={i} className={`flex items-center gap-2 ${x.st === "run" ? "font-medium" : x.st === "done" ? "text-mut" : x.st === "fail" ? "text-rec" : x.st === "skip" ? "text-mut/60 line-through" : "text-mut/50"}`}>
                <span className="grid size-4 shrink-0 place-items-center">
                  {x.st === "done" ? <Icon name="check" className="size-4 text-acc [stroke-width:2.5]" /> : x.st === "skip" ? <Icon name="x" className="size-3.5 text-mut/60 [stroke-width:2.5]" /> : x.st === "fail" ? <Icon name="x" className="size-4 [stroke-width:2.5]" /> : <span className={`size-1.5 rounded-full ${x.st === "run" ? "bg-acc" : "bg-mut/40"}`} />}
                </span>
                <span className={`min-w-0 truncate ${x.st === "run" ? "work-text" : ""}`}>{x.label}</span>
              </li>
            ))}
          </ol>
        )}

        {/* Onay: geri alınamayan iş (arama, sporcu silme, aidat hatırlatması); sesle "evet / vazgeç" de olur */}
        {cards.ok && (
          <div className="fade-in mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const f = okFlow.current;
                okFlow.current = null;
                setTurns((p) => [...p, { role: "user", text: cards.ok.label, chip: true }]);
                f?.yes(voice);
              }}
              className="h-10 flex-1 rounded-xl bg-acc text-[0.875rem] font-semibold text-white active:scale-[.98]"
            >
              {cards.ok.label}
            </button>
            <button
              type="button"
              onClick={() => {
                okFlow.current = null;
                setTurns((p) => [...p, { role: "user", text: "Vazgeç", chip: true }]);
                done("Tamam, vazgeçtim.", { engine: "local" }, voice);
              }}
              className="h-10 flex-1 rounded-xl bg-card text-[0.875rem] font-semibold ring-1 ring-line active:scale-[.98]"
            >
              Vazgeç
            </button>
          </div>
        )}

        {/* Yoklama sonucu: kimler ne işaretlendi; kaydedildiyse Geri al */}
        {cards.att && (
          <div className="fade-in mt-3 overflow-hidden rounded-2xl ring-1 ring-acc/30">
            <p className="flex items-center justify-between bg-acc/[.06] px-3 py-2 text-[0.75rem] font-semibold uppercase tracking-wide text-acc">
              <span>Yoklama · {new Date(`${cards.att.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" })}</span>
              <span>{cards.att.saved ? "kaydedildi" : "onay bekliyor"}</span>
            </p>
            <ul className="max-h-56 divide-y divide-line overflow-y-auto">
              {Object.entries(cards.att.changes).map(([id, v]) => (
                <li key={id} className="flex items-center justify-between gap-2 px-3 py-2 text-[0.875rem]">
                  <span className="truncate">{cards.att.names[id]}</span>
                  <span className={`shrink-0 font-semibold ${v === "present" ? "text-ok" : v === "absent" ? "text-rec" : v === "excused" ? "text-amber-700" : "text-mut"}`}>{ATT_LABEL[v] || "temizlendi"}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-1.5 border-t border-line p-2">
              {cards.att.saved ? (
                <button type="button" onClick={() => undoAtt(cards.att)} className="h-9 rounded-xl bg-bg px-3 text-[0.8125rem] font-semibold text-rec active:scale-[.98]">
                  Geri al
                </button>
              ) : (
                <button type="button" onClick={() => confirmPending()} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-acc text-[0.8125rem] font-semibold text-white active:scale-[.98]">
                  <Icon name="check" className="size-4" /> Kaydet
                </button>
              )}
              <button type="button" onClick={() => (!embedded && park(), router.push(PAGES.attendance.path))} className="ml-auto h-9 rounded-xl px-3 text-[0.8125rem] font-semibold text-acc active:bg-bg">
                Yoklamayı aç
              </button>
            </div>
          </div>
        )}

        {/* Asistanla kişi ekleme: bilgiler, mükerrer uyarısı, onay; kaydedildiyse hesap aç / geri al */}
        {cards.person && (
          <PersonCard
            p={cards.person}
            onSave={() => (setTurns((p) => [...p, { role: "user", text: "Kaydet", chip: true }]), personSave())}
            onEdit={personEdit}
            onCancel={() => (["undo", "account"].includes(cards.person.step) ? continuePerson("vazgeç") : personCancel())}
            onAccount={() => (cards.person.step === "account" ? personOpenAccount() : personAccount())}
            onUndo={() => (cards.person.step === "undo" ? personUndo() : personUndoAsk())}
          />
        )}

        {/* Asistanla etkinlik planı: soru sorulurken "Genel plan yap"; kaydedilince Aç / Sil */}
        {cards.event && (
          <EventCard
            e={cards.event}
            onGeneral={() => {
              const text = cards.event.text;
              eventFlow.current = null;
              setTurns((p) => [...p, { role: "user", text: "Genel plan yap", chip: true }]);
              runEvent(text, false, true);
            }}
            onOpen={() => (!embedded && park(), router.push(`/events/${cards.event.id}`))}
            onDelete={() => eventDelete(cards.event)}
          />
        )}

        {/* Envanter: yapılanlardan sonra Envanteri aç; silme sorulurken Sil / Vazgeç */}
        {cards.inv && (
          <InvCard
            v={cards.inv}
            onOpen={() => (!embedded && park(), router.push(`/inventory/${cards.inv.id}`))}
            onDelete={() => invFlow.current && (setTurns((p) => [...p, { role: "user", text: "Sil", chip: true }]), invDelete(invFlow.current))}
            onKeep={() => {
              invFlow.current = null;
              setTurns((p) => [...p, { role: "user", text: "Vazgeç", chip: true }]);
              done("Tamam, silmedim.", { engine: "local" });
            }}
          />
        )}

        {error && (
          <div className="fade-in mt-3 rounded-2xl bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
            <p className="flex items-center gap-2 text-[0.875rem] font-semibold"><Icon name="alert" className="size-4" /> Şu an yanıt veremedim</p>
            <p className="mt-0.5 text-[0.8125rem] opacity-90">{error}</p>
            <button type="button" onClick={() => run(heard, voice, true)} className="mt-2 h-9 rounded-xl bg-amber-900 px-3 text-[0.8125rem] font-semibold text-white active:scale-95">Tekrar dene</button>
          </div>
        )}

        {/* Panelde hazırlanan yeni kayıtlar */}
        {drafts.length > 0 && (
          <div className="fade-in mt-3 overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_10px_28px_-16px_rgba(38,40,44,.3)]">
            <ul className="divide-y divide-line">
              {drafts.map((d) => (
                <li key={d._id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc"><Icon name={KIND_ICON[d.type]} className="size-[1.125rem]" /></span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.875rem] font-semibold">{d.title || d.body || "Başlıksız"}</b>
                    <small className="block truncate text-[0.75rem] text-mut">{draftMeta(d)}</small>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-1.5 px-2.5 pb-2.5">
              <button type="button" onClick={() => saveDraftsNow(false)} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-acc text-[0.9375rem] font-semibold text-white transition active:scale-[.98]">
                <Icon name="check" className="size-[1.125rem]" /> Kaydet
              </button>
              <button type="button" onClick={editDraftsFull} className="h-11 rounded-full bg-bg px-4 text-[0.875rem] font-semibold transition active:scale-[.98]">Düzenle</button>
              <button type="button" onClick={() => dropDrafts(false)} aria-label="Vazgeç" className="grid size-11 place-items-center rounded-full text-mut transition active:bg-bg"><Icon name="x" className="size-[1.125rem]" /></button>
            </div>
          </div>
        )}

        {/* Az önce kaydedilenler: yalnız Düzenle (değişiklik sesle de söylenebilir) */}
        {saved.length > 0 && !drafts.length && (
          <div className="fade-in mt-3 overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_10px_28px_-16px_rgba(38,40,44,.3)]">
            <ul className="divide-y divide-line">
              {saved.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                    <Icon name={KIND_ICON[x.type]} className="size-[1.125rem]" />
                    <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-ok text-white ring-2 ring-card"><Icon name="check" className="size-2.5 [stroke-width:3]" /></span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.875rem] font-semibold">{x.title}</b>
                    <small className="block truncate text-[0.75rem] text-mut">{x.meta}</small>
                  </span>
                  <button type="button" onClick={() => { park(); openAdd({ edit: { kind: x.kind, id: x.id } }); }} className="h-9 shrink-0 rounded-full bg-bg px-3.5 text-[0.8125rem] font-semibold transition active:scale-[.98]">Düzenle</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {cards.pending?.send && (
          <div className="fade-in mt-3 overflow-hidden rounded-2xl ring-1 ring-acc/30">
            <p className="flex items-center gap-2.5 bg-acc/[.06] px-3 py-2">
              <Avatar name={cards.pending.send.label} icon={cards.pending.send.team ? cards.pending.send.icon : null} size="size-8" text="text-[0.75rem]" tone={cards.pending.send.team ? "bg-acc text-white" : undefined} />
              <span className="min-w-0 flex-1">
                <small className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-acc">Mesaj · onayını bekliyor</small>
                <b className="block truncate text-[0.9375rem] font-semibold">{cards.pending.send.label}</b>
              </span>
            </p>
            <textarea
              value={cards.pending.send.text}
              onChange={(e) => setSendText(e.target.value)}
              aria-label="Gönderilecek mesaj"
              rows={2}
              className="block max-h-48 w-full resize-none bg-card px-3.5 py-3 text-[1rem] leading-snug outline-none [field-sizing:content] focus:bg-bg"
            />
            <div className="flex gap-2 border-t border-line p-2">
              {cards.pending.send.wa ? (
                <a
                  href={waTo(cards.pending.send.wa, cards.pending.send.text)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    setTurns((p) => [...p, { role: "user", text: "WhatsApp'ta gönder", chip: true }]);
                    setCards((c) => ({ ...c, pending: null, awaiting: false }));
                    if (!nextStep(false, "WhatsApp'ta açtım. ")) done(`WhatsApp'ta ${cards.pending.send.label} için açtım; orada gönder'e dokun.`, { engine: "local" });
                  }}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98]"
                >
                  <Icon name="whatsapp" className="size-4" /> {"WhatsApp'ta gönder"}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    // WhatsApp grubuna da istendiyse: dokunuşla WhatsApp paylaşımı hemen açılır (grup orada seçilir), uygulamadaki gruba da gönderilir
                    const p = cards.pending.send;
                    const wa = p.team && (p.alsoWa || p.waOnly);
                    if (wa) shareGroup(p.text);
                    confirmPending(false, wa);
                  }}
                  disabled={!cards.pending.send.text.trim()}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-40"
                >
                  <Icon name={cards.pending.send.waOnly ? "whatsapp" : "up"} className="size-4" /> {cards.pending.send.waOnly ? "WhatsApp'ta aç" : cards.pending.send.team && cards.pending.send.alsoWa ? "Gönder + WhatsApp" : "Gönder"}
                </button>
              )}
              {cards.pending.send.team && !cards.pending.send.waOnly && (
                <button type="button" onClick={() => shareGroup(cards.pending.send.text)} aria-label="WhatsApp ile paylaş" className="grid h-11 place-items-center rounded-xl bg-bg px-3 text-ok active:scale-[.98]">
                  <Icon name="whatsapp" className="size-5" />
                </button>
              )}
              <button type="button" onClick={() => cancelPending()} className="h-11 rounded-xl bg-bg px-4 text-[0.9375rem] font-semibold text-mut active:scale-[.98]">
                Vazgeç
              </button>
            </div>
            <p className="border-t border-line px-3 py-1.5 text-[0.75rem] text-mut">Metne dokunup düzeltebilir ya da sesle değişiklik söyleyebilirsin.{cards.pending.send.wa ? " Bu kişi uygulamada değil; mesaj WhatsApp'ta hazır açılır." : cards.pending.send.waOnly ? ` Yalnız WhatsApp grubuna. ${WA_PICK}.` : cards.pending.send.team && cards.pending.send.alsoWa ? ` Uygulamadaki gruba gider, WhatsApp da açılır. ${WA_PICK}.` : cards.pending.send.team ? " WhatsApp grubuna da göndermek için yeşil düğmeye dokun." : ""}</p>
          </div>
        )}

        {cards.pending?.actions && (
          <div className="fade-in mt-3 rounded-2xl bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
            <p className="text-[0.8125rem] font-semibold">Onayına sunuyorum</p>
            <ul className="mt-1 space-y-0.5 text-[0.8125rem]">
              {cards.pending.actions.map((a, i) => <li key={i}>• {describeAction(a, find(a.kind, a.id))}</li>)}
            </ul>
          </div>
        )}

        {cards.races?.length > 0 && (
          <div className="fade-in mt-3 grid gap-2">
            {cards.races.map((r) => (
              <button key={r.id} type="button" onClick={() => goRace(r)} className="flex h-11 items-center gap-2 rounded-xl bg-bg px-3 text-left text-[0.875rem] font-semibold active:scale-[.98]">
                <Icon name="flag" className="size-4 shrink-0 text-acc" />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <small className="shrink-0 text-[0.75rem] font-normal text-mut">{r.startDate ? rel(r.startDate) : ""}</small>
              </button>
            ))}
          </div>
        )}

    </>
  );

  // Tek görünüm: konuşma alttaki yeşil kubbenin (TabBar › Dome) içindeki yuvaya çizilir; ayrı pencere yok
  // Taşınan işler (isler/, beyin/) bileşenin durumuna ve yardımcılarına ctx ile ulaşır; her çizimde yenilenir
  // eslint-disable-next-line react-hooks/refs -- ref nesneleri yalnız iletilir; .current olaylarda okunur
  Object.assign(ctx, { AMB, addReply, aiLesson, allMembers, askAI, askAll, askDelete, askOk, askTasks, askTo, askedMore, athAsk, attAsk, attHere, birthdays, by, callBusy, canAssign, canOpen, cancelPending, cancelRun, cards, chain, chainGen, chainRace, chainStep, chatSend, clearSay, club, confirmPending, contactNames, contacts, continuePerson, convo, createAs, createGroup, ctrl, curRace, dataUid, deleteRecord, deleteSeries, done, draftMeta, draftSay, draftSrc, drafts, dropDrafts, enqueueSay, eventFlow, extra, failNow, find, finish, firstName, flowOf, focusRef, go, goRace, groupIds, handle, heard, heldQ, holdIfTalking, inflight, invAsk, invDelete, invFlow, invHere, invPage, isLocked, isStaff, leave, lessons, listenOnce, listenWhileThinking, live, logFlow, markPaid, members, memo, memoSet, msgDraft, myGroups, myKind, myUid, nameIdx, nextInChain, nextStep, notes, okFlow, onClose, openAdd, openBirthday, openChatAt, openMeeting, openNav, openRace, openReceipt, openRecord, owner, park, parked, past, pastOn, pastTurns, path, personAccount, personCancel, personCard, personFlow, personOpenAccount, personSave, personUndo, personUndoAsk, planCutN, planFails, planIdx, planKind, planLearn, planNow, planOn, plans, preferRef, prepareSend, profile, queue, raceChoices, raceFailed, raceFollow, raceOrg, racer, races, ready, receipts, refineDrafts, rejectDelete, reply, resolveTo, restAfterAtt, router, run, runAttendance, runDebt, runEvent, runExtra, runFitness, runFood, runId, runInventory, runInvoice, runLocal, runLog, runMore, runNow, runPayee, runPost, runRace, runResults, runSchedule, runShopAdd, runShopMark, runShopRead, runStep, sameIn, saveAtt, saveBirthday, saveDrafts, saveDraftsNow, saveHereRace, sayQ, sayRace, sentOk, setCards, setDrafts, setError, setHeard, setPhase, setPlan, setPrefer, setSaved, setSteps, setStreamText, setText, setTurns, setVoice, setWork, skipRace, sp, speaking, speakingRef, staff, staffNames, startAuto, startCall, startDrafts, startPerson, startPlan, startPost, stepPerson, stepTo, stepsEnd, stopPlan, streamSaid, tasks, toast, toggleTask, tts, turns, updateRecord, waPeople, waitFor, withAssignees });
  return slot ? createPortal(<div className="pb-1 text-[1rem]">{convoView(true)}</div>, slot) : null;
}
