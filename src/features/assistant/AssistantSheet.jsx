"use client";

import { useEffect, useRef, useState } from "react";
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
import { interpretText } from "@/services/aiService";
import { carry, check, firstNeed, fresh, isBlank, pub, tidy } from "@/features/add/drafts";
import { rel, todayStr } from "@/lib/utils/format";
import { applyRepeat, seriesDates } from "@/lib/repeat";
import { shareGroup } from "@/lib/cancelPlan";
import { waGroupFor } from "@/lib/waGroups";
import { precue } from "@/lib/precue";
import { inventoryWork, pastTense, taskOf } from "@/lib/assistTasks";
import { WaitLines, useWaitLines } from "./WaitLines";
import { askAssistant } from "@/services/assistantService";
import { ASK_EMPTY, DRAFT_AGE, asksToClear, draftFor, editPrecue, historyFor, isDraftEdit, isPronoun, memoFor, remember, sameTo } from "@/lib/convoContext";
import { buildDigest } from "@/lib/ai/digest";
import { clubDigest } from "@/lib/ai/clubDigest";
import { cached as cachedWeather, dayHours, loadWeather, wantsWeather, weatherDigest } from "@/features/weather/weather";
import { canSeeAthletes, wantsAttendance } from "@/features/athletes/access";
import { ATT_LABEL, applyAttendance, attSummary, parseAttendance } from "@/features/athletes/assistAttendance";
import { findRaceAi, runRaceCommand, wantsRace } from "@/features/athletes/assistRace";
import { raceNames } from "@/features/athletes/raceNames";
import { loadRaces } from "@/features/athletes/races";
import { byId, createAthlete, deleteAthlete, isActive, loadAthletes, setArchived } from "@/features/athletes/data";
import { linkMember, unlinkMembers } from "@/features/athletes/memberSync";
import { absentNotifyCommand, athleteCommand, athleteOpenCommand, birthdayDeleteCommand, callCommand, duesCommand, groupCreateCommand, hotelAddCommand, incomeCommand, invoiceTaskCommand, personDeleteCommand, raceHereCommand, receiptPayCommand, shopClearCommand } from "@/lib/assistMore";
import { cleanResults } from "@/lib/raceResults";
import { emptyBudget } from "@/features/athletes/budget";
import { totalTL } from "@/lib/receipts";
import { addDays } from "@/lib/utils/format";
import { useCall } from "@/features/call/CallProvider";
import { canCall } from "@/lib/call";
import { unpaidRoster } from "@/lib/duesRemind";
import { feeOf } from "@/lib/dues";
import { addRacePlan, cleanHotels, deleteRace, raceHotels, saveRace, telOf } from "@/features/athletes/races";
import { POST_ASK_KEY, RACE_KEY, raceWithAthletes, wantsPost, wantsPostImage } from "@/features/posts/postModel";
import { postHandler } from "@/features/posts/posts";
import { findRace, nearest, pickChoice, raceAsk, raceJobHere, raceRef, rankRaces, sure, wantsRaceOpen } from "@/features/athletes/raceNav";
import { useNameIndex } from "@/features/athletes/names";
import { LISTS, addItems, clearDone, listsFor, removeItem, splitItems, toggleItem } from "@/features/shop/shop";
import { matchShop, shopCommand } from "@/features/shop/shopWords";
import { useKind } from "@/features/auth/useKind";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { noteDonePatch, noteReopenPatch } from "@/lib/noteState";
import { KIND, PAGES, buildPatch, describeAction, isCloseNow, isEnd, isNo, isNoMore, isYes, lastCreated, localQuery, looksLikeCreate, undoLast } from "@/lib/assistantLocal";
import { brainCommand, localCommand } from "@/lib/commands";
import { labelFromAI, labelFromCommand, labelFromItems } from "@/lib/brain/model";
import { countHit, guess as brainGuess, record } from "@/lib/brain/store";
import { RecordList } from "./RecordList";
import { parseBirthday } from "@/lib/birthdayParse";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { dmId, useChat, sendErrorText } from "@/features/chat/ChatProvider";
import { Avatar } from "@/features/chat/bits";
import { confirmWord, matchGroup, messageIntent } from "@/lib/ai/messageRules";
import { matchPerson } from "@/lib/names";
import { GROUPS, KIND_LABEL, canReceipts, groupOfKind, isAthleteSide, kindOf, validUsername, waPhone } from "@/lib/kinds";
import { authFetch } from "@/lib/authFetch";
import { money } from "@/lib/bankSheet";
import { localNavigate } from "@/lib/nav";
import { fromMessage } from "@/lib/ai/assistant";
import { quickAnswer } from "@/lib/ai/rules";
import { isMulti, isQuestion, jobsIn, extraNote, keepNotes, messageFirst, taskList, wantsNote, wantsRecord, waMode } from "@/lib/steps";
import { applyAnswer, changes, findDuplicates, formatPhone, loginIn, nextQuestion, suggestLogin, summarySay, wantsPerson } from "@/features/people/assistPerson";
import { askOpen, createPerson, newPassword, openAccount, readPerson, removePerson } from "@/features/people/personActions";
import { PersonCard } from "@/features/people/PersonCard";
import { isDrop, kindFromText, wantsEvent } from "@/features/events/eventWords";
import { attLine, bareLog, canLog, isLogAnswer, logReply, looksLikeLog, missingOf, wantsLog } from "@/lib/trainingLog";
import { askLog, saveLog, syncAttendance } from "@/features/training/logAi";
import { askPlan, deleteEvent, saveEvent } from "@/features/events/events";
import { countsText } from "@/features/events/eventModel";
import { EventCard } from "@/features/events/EventCard";
import { InvCard } from "@/features/inventory/InvCard";
import { dropInvFile } from "@/features/inventory/invFiles";
import { applyOps, dropItem, itemLabel, statsText, pickInv } from "@/features/inventory/invModel";
import { askInventory, changeInventory, createInventory, lastInv, loadInventories, setLastInv } from "@/features/inventory/inventory";
import { isDrop as invDrop, wantsInventory } from "@/features/inventory/invWords";
import { amountText, invoiceCommand, pickInvoice } from "@/lib/invoices";
import { deleteInvoice, ensureTask, loadInvoices, setPaid as setInvoicePaid } from "@/features/invoices/invoiceData";
import { payeeAnswer, payeeAsk, payeeMoves, payeeOf } from "@/lib/payee";
import { addIncome, loadCash, loadDuesRange, loadMovementsRange } from "@/features/dues/duesData";
import { wantsSchedule } from "@/features/schedule/scheduleWords";
import { askSchedule, showSchedule } from "@/features/schedule/assistSchedule";
import { timingMark, timingReply, timingStart } from "@/lib/assistTiming";
import { goBack } from "@/lib/navTrail";
import { splitChain } from "@/lib/chain";
import { cachedPlan, failed, learnedKind, localPlan, looksMulti, planLessons, rememberPlan } from "@/lib/taskPlan";

const SILENCE_MS = 0; // Otomatik kapanma kapalı
// Dokun-konuş-dokun-gönder (Seyhun, 2026-10-06: "ChatGPT, Claude gibi; şimdilik canlı dinleme yok"): küreye dokununca
// dinler, söylenen ekranda yazılır, yeniden dokununca gönderilir. Cevaptan sonra ya da yapay zeka düşünürken mikrofon
// kendiliğinden açılmaz, sessizlikte kendiliğinden gönderilmez. Eller serbest sohbete dönmek için true.
const HANDS_FREE = false;
// Eller serbest sohbette: konuşma bitince (bu kadar sessizlikte) söylenen kendiliğinden gönderilir; kısa duraksama kesmez
const ENDPOINT = HANDS_FREE ? 1500 : 0; // canlı yazı yolunda konuşma bitişi (devam edilirse öncekine eklenir)
const listenOpts = (auto) => (HANDS_FREE ? { autoStop: SILENCE_MS, auto, endpoint: ENDPOINT, handsFree: true } : {});
const clock = () => Date.now(); // konuşma kuyruğu zamanlaması (olay anında çağrılır)
const RECORD_TO = "Bu kaydın konuşması";
// Yapay zekanın gerçekte olmayan gönderimi anlatması ("gönderdim", "ilettim")
const ASKED = /\?|\s(m[ıiuü])(\s|$)|gönderdin mi|gitti mi/i;
const SENT_CLAIM = /(^|\s)(gönderdim|ilettim|yolladım|haber verdim|mesaj(ı|ınız)? gönderildi)/i;
// Açık konuşmaya mesaj isteği: "yarın geliyorum diye yaz", "yaz: tamam", "cevap ver …", "haber ver …"
const FOCUS_MSG = /(^|\s)(yaz|söyle|cevap ver|yanıtla|yanıt ver|gönder|ilet|haber ver)(\s*[:,]|[.!]?\s*$|\s)/i;
// Yapay zeka yokken mesaj metni: komut sözcükleri atılır, baş harf büyür
const focusBody = (s) => {
  const t = s
    .replace(/^\s*(yaz|söyle|cevap ver|yanıtla|yanıt ver|gönder|ilet|haber ver)\s*[:,]?\s*/i, "")
    .replace(/\s*(diye|şeklinde)?\s*(yaz|söyle|cevap ver|yanıtla|yanıt ver|gönder|ilet|haber ver)[.!]?\s*$/i, "")
    .trim();
  return t ? t[0].toLocaleUpperCase("tr-TR") + t.slice(1) : s;
}; // kayıt ekranından açılınca mesajın kayda gitmesi için alıcı adı
// Belirli bir numaraya WhatsApp mesajı (uygulamada hesabı olmayan kişi)
const waTo = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
const EMPTY = { show: [], pending: null, nav: "", chat: "", share: "", att: null, engine: "", awaiting: false, races: [], person: null, event: null };
// Biten adım geçmiş zamanla yazılır ("Yoklama kaydediliyor" → "Yoklama kaydedildi")
const PAST = [[/ekleniyor$/, "eklendi"], [/yükleniyor$/, "yüklendi"], [/eşleştiriliyor$/, "eşleştirildi"], [/kaydediliyor$/, "kaydedildi"], [/hazırlanıyor$/, "hazırlandı"], [/inceleniyor$/, "incelendi"], [/gönderiliyor$/, "gönderildi"], [/alınıyor$/, "alındı"]];
const pastOf = (s) => pastTense(PAST.reduce((t, [re, to]) => t.replace(re, to), s));
const TEAM_WORD = /^(ekip|ekibe|herkes|herkese|grup|gruba|ekip grubu|aile|aileye|sporcu|sporcular|sporculara|veli|veliler|velilere)/i;
// Söylenen grup adı → sabit grup ("ekibe" → team, "aileye" → family, "sporculara" → athletes; "herkese" → ilk grubum)
const groupOf = (t, mine = []) => {
  const s = String(t || "").toLocaleLowerCase("tr-TR");
  const g = /^aile/.test(s) ? "family" : /^(sporcu|veli)/.test(s) ? "athletes" : /^(ekip|ekib)/.test(s) ? "team" : mine[0] || "";
  return mine.includes(g) ? g : "";
};
const MORE = "Başka bir isteğin var mı?";
// Sohbeti bitiren sözler ("bitir", "kapat", "tamam teşekkürler", "şimdilik bu kadar")
// Taslak varken kaydetme / vazgeçme
const SAVE = /^(kaydet|kaydedebilirsin|evet|tamam|olur|onayla|ekle|ekleyebilirsin|kaydet gitsin)(?=$|[\s.,!?])/i;
const BARE_SAVE = /^(kaydet|kaydeder misin|kaydedebilirsin|kaydet gitsin|onayla)[\s.!]*$/i;
const DROP = /^(vazgeç|iptal|hayır|kaydetme|sil|boş ?ver)(?=$|[\s.,!?])/i;
// Taslak varken sorulan soru taslağı değiştirmesin, asistana gitsin
// Soru mu ("kaç görev var", "haftayı özetle"): \b Türkçe harfle biten kelimede çalışmadığı için isQuestion (steps.js) kullanılır
const QUESTION = { test: (s) => isQuestion(s) || /(?<![\p{L}])(ne var|göster\p{L}*|listele\p{L}*|özetle\p{L}*)(?![\p{L}])/u.test(String(s || "").toLocaleLowerCase("tr-TR")) };
const KIND_ICON = { plan: "cal", task: "task", note: "note" };

export function AssistantSheet({ open, onClose, seed, onLive, onAct, slot }) {
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

  const sp = useSpeech({
    noLevel: true, // ses seviyesi dalgaya (ListenWave) doğrudan gider; burada saniyede 10 yeniden çizim olmasın
    names: staffNames,
    terms: racer ? raceNames().slice(0, 12) : [],
    onFinal: (raw, mode) => {
      const tx = fixNames(raw, staffNames); // "san ver" → "Sanver"
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
  function done(message, extra = {}, viaVoice = false) {
    // Sırada iş varsa (zincir) "Başka bir isteğin var mı?" sorulmaz; sıradaki işe geçilir
    if (chain.current.length) return reply(message.trim(), extra, viaVoice);
    reply(`${message.trim()} ${MORE}`, extra, viaVoice);
    askedMore.current = true;
  }
  // Sıralı görev zinciri (lib/chain.js): "yarışı oluştur, sonra Instagram'da gönderi hazırla, sonra aidata nakit yaz…".
  // Her iş kendi akışında yapılır; soru sorulursa cevap beklenir, iş bitince (cevap okunduktan sonra) sıradakine geçilir.
  const chain = useRef([]); // sırada bekleyen cümleler
  const chainGen = useRef(0); // sohbet kapanınca bekleyen geçiş iptal olur
  const chainStep = useRef(false); // şu an çalışan cümle zincirden geldi (açık sayfa onu yutmasın)
  const planNow = useRef(""); // görev listesinde şu an yapılan işin adı
  const planFails = useRef([]); // yapılamayan işler (listenin sonunda "elle yap" denir)
  const chainRace = useRef(""); // zincirde açılan / değişen yarış: "bunun için gönderi hazırla"
  const [plan, setPlan] = useState([]); // görev listesi: [{ label, st: wait | run | done | fail }]
  const planOn = useRef(false); // görev listesi sürüyor
  const raceFollow = useRef(null); // yeni yarışta tarih / sporcu soruldu: { id, n }
  // Sohbet hafızası: az önce konuşulan yarış, kişi, sporcu, gönderi, kayıt (convoContext `remember`); sohbet kapanınca sıfırlanır
  const memo = useRef({});
  const memoSet = (key, value) => (memo.current = remember(memo.current, key, value));
  // Tek bekleyen soru: yeni bir soru sorulunca öncekiler kapanır (sonraki cümle yalnız son soruya cevap sayılır)
  const ASK_REFS = { raceChoice: raceChoices, to: askTo, log: logFlow, person: personFlow, invoice: invAsk, ok: okFlow, athlete: athAsk, raceFollow, event: eventFlow, inv: invFlow };
  function waitFor(kind = "") {
    asksToClear(kind).forEach((k) => (ASK_REFS[k].current = ASK_EMPTY[k]));
  }
  const speaking = useRef(false);
  useEffect(() => {
    speaking.current = tts.speaking;
  });
  function nextInChain(viaVoice) {
    const next = chain.current.shift();
    if (!next) return;
    const gen = chainGen.current;
    // Cevap okunurken araya girilmez: okuma bitince (en çok ~15 sn) sıradaki iş başlar
    const go = (n = 0) => {
      if (gen !== chainGen.current) return;
      if (speaking.current && n < 60) return setTimeout(() => go(n + 1), 250);
      chainStep.current = true;
      planNow.current = next.label || "";
      if (next.label) setWork(next.label);
      run(typeof next === "string" ? next : next.say, viaVoice);
    };
    setTimeout(go, 700);
  }

  function reply(message, extra = {}, viaVoice = false) {
    // Yanıt geldiğinde kullanıcı hâlâ konuşuyorsa yanıtı gösterme ve sözünü kesme: konuşması kendiliğinden
    // bitince (sessizlik) söyledikleri öncekiyle birleştirilip yeniden sorulur
    if (holdIfTalking(() => reply(message, extra, viaVoice))) return;
    timingReply(extra.engine); // süre kaydı (Ayarlar › Asistan süre kaydı)
    inflight.current = null;
    if (live.current.spStatus === "listening") sp.cancel(); // düşünürken açılan mikrofon: konuşulmadı, kapat
    const { show = [], pending = null, nav = "", chat = "", share = "", wa = "", att = null, engine = "", expect = false, races = [], person = null, event = null, inv = null, ok = null } = extra;
    const awaiting = expect || !!pending || !!ok;
    // Görev listesinin son işi: yapılamayanlar elle yapılsın diye söylenir
    // İşin sonucu: akış açıkça "olmadı" dediyse (fail) ya da cevapta başarısızlık sözü varsa ✗
    const badStep = !awaiting && planOn.current && (extra.fail ?? failed(message));
    if (badStep && planNow.current) planFails.current.push(planNow.current);
    if (!awaiting && planOn.current && !chain.current.length && planFails.current.length) {
      const f = planFails.current;
      message = `${message} Yapamadığım: ${f.join(", ")}. ${f.length > 1 ? "Bunları" : "Bunu"} elle yapman gerekiyor.`;
      planFails.current = [];
    }
    if (!ok) okFlow.current = null; // onay kartı kalktıysa onay da biter
    if (!person) personFlow.current = null; // kişi kartı kalktıysa kişi ekleme de biter
    if (!event?.asking) eventFlow.current = null; // soru kartı kalktıysa etkinlik sorusu da biter
    if (!inv?.ask?.length) invFlow.current = null; // silme sorusu kalktıysa onay da biter
    setStreamText("");
    // Sonuç düğmeleri (kayıtlar, Sohbeti aç, WhatsApp, sayfa aç) bu cevabın altına sabitlenir: sohbet altta sürer, düğmeler yerinde kalır
    const links = show.length || chat || share || nav ? { show, chat, share, wa, nav } : null;
    setTurns((p) => [...p, links ? { role: "assistant", text: message, links } : { role: "assistant", text: message }]);
    setCards({ show: [], pending, nav: "", chat: "", share: "", att, engine, awaiting, races, person, event, inv, ok });
    if (races?.length) waitFor("raceChoice");
    raceChoices.current = races;
    // Görev listesi: iş bitti (soru sormadıysa) → ✓ ya da ✗, sıradaki başlar
    if (!awaiting && planOn.current) {
      const bad = badStep;
      setPlan((p) => {
        const i = p.findIndex((x) => x.st === "run");
        if (i < 0) return p;
        return p.map((x, j) => (j === i ? { ...x, st: bad ? "fail" : "done" } : j === i + 1 && chain.current.length ? { ...x, st: "run" } : x));
      });
      if (!chain.current.length) planOn.current = false;
    }
    if (!awaiting && chain.current.length) nextInChain(viaVoice);
    navigator.vibrate?.([8, 30, 8]);
    // Akışta bir kısmı okunduysa yalnızca kalanı (yanıt farklı çıktıysa tekrar okunmaz)
    const said = streamSaid.current;
    streamSaid.current = "";
    const rest = !said ? message : message.startsWith(said) ? message.slice(said.length).trim() : "";
    enqueueSay(rest, viaVoice || convo.current ? startAuto : undefined);
  }

  // Başka bir tam ekran açılırken (fiş kamerası, kayıt, toplantı…) mikrofon kapanır; kubbe altta kalır, sohbet sürer
  function park() {
    sp.cancel();
  }

  // ---- Panelde yeni kayıt: taslak kartlar, "kaydet" deyince kaydedilir ----
  const canAssign = !isStaff && members.length > 0;
  const withAssignees = ({ assignTo, ...x }, t = "") => {
    if (!canAssign) return x;
    const names = Array.isArray(assignTo) && assignTo.length ? assignTo : assigneesInText(t, staffNames);
    if (names.length) return { ...x, assignees: namesToUids(names, members) };
    return Array.isArray(assignTo) ? { ...x, assignees: [] } : x;
  };
  function draftSay(msg, list) {
    const need = firstNeed(list);
    // "Kontrol edip kaydedebilirsin" yerine sesli sohbete uygun tek soru: "Kaydedeyim mi?"
    const base = (msg || "").replace(/\s*(kontrol edip |hazırsa )?kaydedebilirsin\.?/gi, "").trim() || `${list.length} kayıt hazırladım.`;
    if (need && !/\?/.test(base)) return `${base} ${need.kind === "date" ? "Hangi gün olsun?" : "Saat kaçta olsun?"}`;
    return need || /\?\s*$/.test(base) ? base : `${base} Kaydedeyim mi?`;
  }
  // lead: görev listesinde önceki işlerin sonucu ("Tamamladım: …"); cevabın başına gelir
  function startDrafts(items, s, msg, engine, viaVoice, lead = "") {
    // Not yalnız açıkça istenince ("not al", "notlara yaz"); başka işin yanına kendiliğinden not eklenmez
    draftSrc.current = s;
    let next = applyRepeat(keepNotes(items, s), s, todayStr()).map((x) => withAssignees(x, s)).map(fresh);
    const need = firstNeed(next);
    if (need) next = next.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d));
    if (ready(next)) return saveDraftsNow(viaVoice, next, msg, lead);
    setDrafts(next);
    reply(`${lead}${draftSay(/^tamam\.?$/i.test(msg) ? "" : msg, next)}`, { engine }, viaVoice);
  }
  async function refineDrafts(s, viaVoice) {
    // "Saat kaçta olsun?" → "10'da": kısa cevap yerelde taslağa yazılır, yapay zekaya yeniden gidilmez
    const quick = quickAnswer(s, drafts, todayStr(), firstNeed(drafts));
    if (quick) {
      ++runId.current;
      ctrl.current?.abort();
      countHit("local");
      const need = firstNeed(quick);
      const next = need ? quick.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d)) : quick;
      if (ready(next)) return saveDraftsNow(viaVoice, next);
      setDrafts(next);
      return reply(draftSay("", next), { engine: "local" }, viaVoice);
    }
    const id = ++runId.current;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setPhase("thinking");
    try {
      const known = drafts.filter((d) => !isBlank(d));
      const history = turns.slice(-10).map((t) => ({ role: t.role, text: t.text }));
      const last = [...turns].reverse().find((t) => t.role === "assistant")?.text || "";
      if (viaVoice) {
        inflight.current = s;
        listenWhileThinking();
      }
      const r = await interpretText(s, firstName, c.signal, { mode: "create", drafts: known.map((d) => pub(d, staff)), last, history }, staffNames);
      if (id !== runId.current) return;
      const items = applyRepeat(keepNotes(r.items, s, known.filter((d) => d.type === "note").length), s, todayStr()).map((x) => withAssignees(x, s));
      let next = items.length ? carry(known, items) : drafts;
      const need = firstNeed(next);
      if (need && !next[need.idx]._asked) next = next.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d));
      if (ready(next)) return saveDraftsNow(viaVoice, next, r.message);
      setDrafts(next);
      reply(draftSay(r.message, next), { engine: r.source }, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      setError(e.message || "Yapay zeka yanıt vermedi");
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }
  // Tür sayfasından açıldı (Planlar, Görevler, Notlar, Takvim): ilk cümle doğrudan o türde taslağa çevrilir
  async function createAs(s, kind, viaVoice) {
    const id = ++runId.current;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setPhase("thinking");
    try {
      if (viaVoice) {
        inflight.current = s;
        listenWhileThinking();
      }
      const r = await interpretText(s, firstName, c.signal, null, staffNames, kind);
      if (id !== runId.current) return;
      inflight.current = null;
      if (r.items?.length) startDrafts(r.items, s, r.message, r.source, viaVoice);
      else reply(r.message || "Bunu kayda çeviremedim, biraz daha açık söyler misin?", { engine: r.source }, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      inflight.current = null;
      setError(e.message || "Yapay zeka yanıt vermedi");
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }
  // Bilgisi tamam taslak (eksik soru yok, başlık/tarih var) sormadan kaydedilir; kartta yalnız Düzenle kalır
  // Kayıt sorulmadan yapıldığı için yapay zekanın soru ve "oluşturuyorum/ekliyorum" cümleleri atılır
  // (önceden "Akşam 8 için planı oluşturuyorum, onaylıyor musun? Ekledim: …" okunuyordu); yalnız ek bilgi kalır
  const extra = (m) => extraNote(m);
  const ready = (list) => list.length > 0 && !firstNeed(list) && list.every((d) => !check(d));
  // pre: yapay zekanın ek sözü (çakışma, rüzgâr…); varsa "Ekledim" cümlesinden önce gelir (akışta okunduysa tekrar okunmaz)
  async function saveDraftsNow(viaVoice, list = drafts, pre = "", lead = "") {
    for (const d of list) {
      const e = check(d);
      if (e) return reply(`${e}. Söyler misin?`, {}, viaVoice);
    }
    setPhase("thinking");
    const r = await saveDrafts(list.map(tidy), { source: viaVoice || convo.current ? "voice" : "manual", by });
    timingMark("saved");
    setPhase("idle");
    // Kayıt veritabanına yazılamadıysa "kaydettim" denmez; taslak durur, yeniden "kaydet" denebilir
    if (!r || r.error || r.plans + r.tasks + r.notes === 0) {
      setDrafts(list);
      return reply("Kaydedemedim, bir sorun çıktı. Taslak duruyor; tekrar “kaydet” diyebilirsin.", { engine: "local" }, viaVoice);
    }
    // Öğrenme kaydı: taslağı doğuran cümle (önceden sohbetin İLK cümlesi alınıyordu; ikinci işte yanlış cümle öğreniliyordu)
    const said = draftSrc.current || [...turns].reverse().find((t) => t.role === "user" && !t.chip)?.text;
    if (said) record(said, labelFromItems(list), "user");
    const parts = [r.plans && `${r.plans} plan`, r.tasks && `${r.tasks} görev`, r.notes && `${r.notes} not`].filter(Boolean);
    const who = uidsToNames([...new Set(list.flatMap((d) => d.assignees || []))], members).map((n) => n.split(" ")[0]);
    setDrafts([]);
    setSaved((r.ids || []).map(([kind, id], i) => list[i] && { kind, id, title: list[i].title || list[i].body || "Başlıksız", meta: draftMeta(list[i]), type: list[i].type }).filter(Boolean));
    toast(`${parts.join(", ")} kaydedildi${who.length ? ` · ${who.join(", ")}` : ""}`);
    navigator.vibrate?.([10, 40, 10]);
    // Ne kaydedildiği açıkça söylenir (yapay zeka sonraki "saatini 11 yap" cümlesinde hangi kayıt olduğunu bilsin)
    if (list.length === 1) memoSet("record", `${{ plan: "plan", task: "görev", note: "not" }[list[0].type] || ""} ${list[0].title || list[0].body || ""}`.trim());
    const what = list.length === 1 ? [list[0].title || list[0].body, ...draftMeta(list[0]).split(" · ").slice(1).filter((x) => !x.startsWith("→"))].join(", ") : parts.join(", ");
    const whoTxt = who.length ? `, ${who.join(" ve ")} sorumlu` : "";
    if (queue.current.length) return nextStep(viaVoice, `${lead}${r.queued ? `${what} kaydedildi, bağlantı gelince gönderilecek. ` : `Ekledim: ${what}${whoTxt}. `}`);
    done(r.queued ? `${lead}İnternet yok: ${what}${whoTxt} kaydedildi, bağlantı gelince gönderilecek.` : `${lead}${extra(pre)}Ekledim: ${what}${whoTxt}.`, { engine: "local" }, viaVoice);
  }
  function dropDrafts(viaVoice) {
    setDrafts([]);
    if (queue.current.length) return nextStep(viaVoice, "Kaydetmedim. ");
    done("Tamam, kaydetmedim.", { engine: "local" }, viaVoice);
  }
  // Tam ekranda düzenle: taslaklar yeni kayıt penceresine taşınır
  function editDraftsFull() {
    const said = draftSrc.current || heard;
    const last = [...turns].reverse().find((t) => t.role === "assistant")?.text || "";
    openAdd({ prefill: { text: said, items: drafts, message: last, engine: "local" } });
    setDrafts([]);
    park();
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
  // Yerel ya da yapay zekadan gelen gezinme: sayfa, grup sohbeti ya da kişiyle sohbet
  function openNav(nav, viaVoice) {
    if (nav.page) return go(nav.page, "", viaVoice);
    // "geri dön": önceki sayfa (uygulama yeni açıldıysa geçmiş yok, ana sayfa)
    if (nav.back) {
      navigator.vibrate?.(8);
      goBack(router, PAGES.home.path);
      return leave("Önceki sayfaya döndüm.", viaVoice);
    }
    if (nav.chat) {
      if (!groupIds.includes(nav.chat)) return reply(`${GROUPS[nav.chat]?.name || "Bu"} grubunda değilsin.`, { engine: "local" }, viaVoice);
      return openChatAt(nav.chat, `${GROUPS[nav.chat].name} grubunu açtım.`, viaVoice);
    }
    const dest = resolveTo(nav.chatWith);
    if (!dest?.cid) return reply(`${nav.chatWith} ile mesajlaşamıyorsun ya da kişiyi bulamadım.`, { engine: "local" }, viaVoice);
    return openChatAt(dest.cid, `${dest.label} ile sohbeti açtım.`, viaVoice);
  }
  function openChatAt(cid, message, viaVoice) {
    navigator.vibrate?.(8);
    router.push(`/messages?c=${encodeURIComponent(cid)}`);
    leave(message, viaVoice);
  }
  // Başka sayfaya geçince asistan açık kalır: ne yapıldığı söylenir ve gösterilir, sohbet kullanıcı kapatana kadar sürer
  function leave(message, viaVoice) {
    reply(message, { engine: "local" }, viaVoice);
  }

  // Söylenen yarışı bul: kesin eşleşme → puanlama → yapay zeka → en yakın seçenekler (yoksa tarihi en yakın 3 yarış)
  async function openRace(s, viaVoice) {
    const list = races.current;
    const today = todayStr();
    if (!list.length) return reply("Kayıtlı yarış bulamadım. Yarışlar sayfasından ekleyebilirsin.", { engine: "local", nav: "races" }, viaVoice);
    // Puanlama tekne sınıfını ve ayak numarasını da sayar; kesinse o, değilse ad kelimesiyle tam eşleşen
    const ranked = rankRaces(s, list, today);
    if (sure(ranked)) return goRace(ranked[0].race, viaVoice);
    const exact = findRace(s, list, today);
    if (exact && (!ranked[1] || ranked[0]?.race.id === exact.id)) return goRace(exact, viaVoice);
    const id = ++runId.current;
    setPhase("thinking");
    setSteps([]);
    stepTo("Yarış aranıyor");
    let ai = null;
    try {
      ai = await findRaceAi(s, list);
    } catch {}
    if (id !== runId.current) return;
    setPhase("idle");
    setSteps([]); // arama adımı iş bitince kalmasın (seçenek sormak hata değil)
    const byId = (x) => list.find((r) => r.id === x);
    if (ai?.raceId && byId(ai.raceId)) return goRace(byId(ai.raceId), viaVoice);
    // Seçenekler: yapay zekanın adayları, yoksa puanı olanlar, o da yoksa tarihi bugüne en yakın 3 yarış
    const fromAi = (ai?.candidates || []).map(byId).filter(Boolean);
    // Yapay zekanın ilk adayı yerel puanlamanın da birincisiyse sormadan açılır
    if (fromAi[0] && ranked[0]?.race.id === fromAi[0].id) return goRace(fromAi[0], viaVoice);
    const scored = ranked.map((x) => x.race);
    const opts = [...fromAi, ...scored].filter((r, i, a) => a.findIndex((x) => x.id === r.id) === i).slice(0, 3);
    const guess = opts.length ? opts : nearest(list, today, 3);
    if (guess.length === 1 && opts.length) return goRace(guess[0], viaVoice);
    const names = guess.map((r) => r.name);
    const said = opts.length ? `Tam emin olamadım. ${names.join(", ")} olabilir. Hangisini açayım?` : `Bu adda bir yarış bulamadım. Tarihi en yakın yarışlar: ${names.join(", ")}. Hangisini açayım?`;
    return reply(said, { engine: ai ? "ai" : "local", races: guess, expect: true }, viaVoice);
  }

  function goRace(r, viaVoice) {
    navigator.vibrate?.(8);
    chainRace.current = r.id; // sohbetin yarışı: "bunun için gönderi hazırla", "yarışa Ali'yi de ekle"
    memoSet("race", r.name);
    if (curRace !== r.id) router.push(`/athletes/races/${r.id}`);
    leave(curRace === r.id ? `${r.name} sayfası açık.` : `${r.name} yarışını açtım.`, viaVoice);
  }

  // Sıralı işlerin bir adımı: mesaj kartı (onayla gönderilir) ya da kayıtlar (bilgisi tamamsa hemen kaydedilir)
  // lead: önceki adımın sonucu ("Gönderdim. "); msg: yapay zekanın ilk adım için yazdığı cümle (akışta okunmuş olabilir)
  function runStep(st, viaVoice, lead = "", msg = "") {
    if (st.send) return prepareSend(st.send.to, st.send.text, msg, st.engine, viaVoice, lead, waMode(st.s));
    if (st.actions) return askDelete(st.actions, viaVoice, lead, msg);
    return startDrafts(st.items, st.s, msg, st.engine, viaVoice, lead);
  }
  function nextStep(viaVoice, lead, msg = "") {
    const st = queue.current.shift();
    if (!st) return false;
    runStep(st, viaVoice, lead, msg);
    return true;
  }

  function go(page, message, viaVoice = false) {
    if (!PAGES[page]) return reply("O sayfayı bulamadım.", { engine: "local" }, viaVoice);
    if (!canOpen(page)) return reply(`${PAGES[page].label} sayfası senin hesabında açık değil.`, { engine: "local" }, viaVoice);
    navigator.vibrate?.(8);
    router.push(PAGES[page].path);
    leave(message || `${PAGES[page].label} sayfasını açtım.`, viaVoice);
  }

  function handle(r, s, viaVoice) {
    // Yanıt geldiğinde kullanıcı hâlâ konuşuyorsa bekle, sözünü kesme (konuşması bitince öncekiyle birleştirilip yeniden sorulur)
    if (holdIfTalking(() => handle(r, s, viaVoice))) return;
    inflight.current = null;
    if (live.current.spStatus === "listening") sp.cancel();
    // Antrenman anlatımından yalnız not çıktıysa not açılmaz, günlüğe yazılır (not nottur, günlük günlüktür)
    const onlyNotes = r.items?.length && r.items.every((d) => d?.type === "note") && !r.actions?.length && !r.send?.text && !r.sends?.length;
    if (onlyNotes && !isAthleteSide(myKind) && !wantsNote(s) && looksLikeLog(s)) return runLog(s, viaVoice);
    // Not açıkça istenmediyse yapay zekanın başka işin yanına eklediği not atılır (öğrenme verisine de girmez)
    if (r.items?.length) r = { ...r, items: keepNotes(r.items, s) };
    const msg = (r.message || "").trim();
    record(s, labelFromAI(r), "ai"); // öğrenme verisi
    const held = heldQ.current;
    heldQ.current = null;

    // Görev listesi: yapay zekanın çıkardığı işler. Onay gerekmeyenler (tamamla, değiştir, yeni kayıt) hemen yapılır,
    // onay gerekenler (silme, mesaj) ardından tek tek sorulur. Ne yapıldığını yapay zeka değil uygulama söyler (gerçek sonuç).
    // Yapay zeka mesajı yalnızca cevabına yazdıysa ("Ekibe şunu göndereyim mi: …") kart yine hazırlanır
    const sendRec = r.intent === "message" && !r.send?.text ? fromMessage(msg) : null;
    // Yalnız mesaj istendiyse ("Perşembe 9.30'da antrenman var, sporculara gönder") mesajdaki gün/saat kayıt değildir:
    // takvim/plan/görev/not denmedikçe yapay zekanın eklediği kayıtlar atılır (kendiliğinden plan açılmasın)
    if ((r.send?.text || r.sends?.length || sendRec?.text) && r.items?.length && !wantsRecord(s)) r = { ...r, items: [] };
    const job = taskList(sendRec?.text ? { ...r, sends: [sendRec] } : r);
    const { items, open: opened } = job;
    if (job.confirm.length || items.length || job.now.length) {
      const now = runNow([...job.now, ...(job.confirm[0]?.actions || [])]);
      const sends = job.confirm.filter((st) => st.send);
      const steps = [...(now.deletes.length ? [{ actions: now.deletes }] : []), ...sends, ...(sends.length && !items.length ? held || [] : [])].map((st) => ({ ...st, s, engine: r.source }));
      let lead = now.said;
      if (now.missing && !now.done && !now.deletes.length) lead += "Bir kaydı bulamadım. ";
      if (opened && !items.length && !steps.length) return openRecord(opened, lead, viaVoice);
      queue.current = steps;
      streamSaid.current = "";
      // Yeni kayıtlar: bilgisi tamamsa hemen kaydedilir, eksikse tek soru sorulur; ardından sıradaki onaylar
      if (items.length) return startDrafts(items, s, msg, r.source, viaVoice, lead);
      if (nextStep(viaVoice, lead, steps.length === 1 && steps[0].actions && /\?\s*$/.test(msg) && !lead ? msg : "")) return;
      const show = now.touched.filter((x) => find(x.kind, x.id));
      if (now.done) return done(lead.trim() || "Tamamdır.", { show, engine: r.source }, viaVoice);
      return reply(lead.trim() || (now.missing ? "Bunu kayıtlarda bulamadım." : "Tamamdır."), { show, engine: r.source }, viaVoice);
    }
    // Gönderim yalnızca kartta onayla olur: yapay zeka "gönderdim" dese de gerçekte gönderilmediyse bunu söyleme
    // ("gönderdin mi?" sorusuna, gerçekten gönderildiyse "gönderdim" demesi doğrudur)
    if (r.intent === "message" || (SENT_CLAIM.test(msg) && !(sentOk.current && ASKED.test(s)))) {
      const to = r.send?.to || "";
      if (to && resolveTo(to)) waitFor("to"), (askTo.current = to);
      if (r.intent === "message" && isMulti(s)) askAll.current = s; // sıralı iş: cevapla birlikte hepsi yeniden
      return reply(SENT_CLAIM.test(msg) || !msg || /^tamam\.?$/i.test(msg) ? `Mesajı henüz göndermedim. ${to ? "Ne yazayım?" : "Kime ve ne yazayım?"}` : msg, { engine: r.source, expect: true }, viaVoice);
    }
    if (opened) return openRecord(opened, msg, viaVoice);
    // Yapay zeka sohbet açmayı seçtiyse ("Sanver'le yazışmamı aç" gibi belirsiz söyleyişler)
    if (r.openChat && r.intent === "navigate") {
      const g = groupOf(r.openChat, groupIds);
      return openNav(TEAM_WORD.test(r.openChat) && g ? { chat: g } : { chatWith: r.openChat }, viaVoice);
    }
    if (r.navigate && (r.intent === "navigate" || !r.show?.length)) {
      go(r.navigate, msg, viaVoice);
      return;
    }

    // Sıralı işte mesajın içeriği soruldu ("Gökhan'a ne yazayım?"): cevap gelince tüm istek yeniden sorulur
    if (r.expectReply && isMulti(s) && jobsIn(s).includes("send")) askAll.current = s;
    const said = msg || "Bunu tam anlayamadım, bir daha söyler misin?";
    reply(said, { show: (r.show || []).filter((x) => find(x.kind, x.id)), nav: r.navigate || "", engine: r.source, expect: !!r.expectReply }, viaVoice);
  }

  // Görev listesinin onaysız işleri: görev tamamlama/yeniden açma ve güncelleme hemen uygulanır; silmeler onaya kalır.
  // Dönüş: said ("Tamamladım: … Değiştirdim: … "), deletes, touched (gösterilecek kayıtlar), done, missing
  function runNow(acts) {
    const out = { said: "", deletes: [], touched: [], done: 0, missing: 0 };
    const ticked = [];
    const opened2 = [];
    const changed = [];
    const notesDone = [];
    const notesBack = [];
    for (const a of acts) {
      const rec = find(a.kind, a.id);
      if (!rec) {
        out.missing++;
        continue;
      }
      if (a.op === "delete" || a.op === "delete_series" || a.op === "approve_delete") {
        out.deletes.push(a);
        continue;
      }
      if (a.op === "reject_delete" && rec.deleteReq) {
        rejectDelete(a.kind, a.id);
        changed.push(`${rec.title}, silme isteği reddedildi`);
      } else if (a.kind === "plan" && a.op === "uncancel") {
        if (rec.status === "cancelled") updateRecord("plan", a.id, { status: "planned", cancelReason: "", cancelledAt: null }, by);
        changed.push(`${rec.title}, iptal geri alındı`);
      } else if (a.kind === "note" && (a.op === "pin_note" || a.op === "unpin_note")) {
        updateRecord("note", a.id, { pinned: a.op === "pin_note" }, by);
        changed.push(`${rec.title}, ${a.op === "pin_note" ? "sabitlendi" : "sabitleme kaldırıldı"}`);
      } else
      if (a.kind === "task" && (a.op === "complete_task" || a.op === "reopen_task")) {
        if (rec.done !== (a.op === "complete_task")) toggleTask(a.id);
        (a.op === "complete_task" ? ticked : opened2).push(rec.title);
      } else if (a.kind === "note" && (a.op === "done_note" || a.op === "reopen_note")) {
        // Not silinmez: "yapıldı" Arşiv'e kaldırır, "geri al" Notlar'a döndürür
        const on = a.op === "done_note";
        if (!!rec.archived !== on || !!rec.done !== on) updateRecord("note", a.id, on ? noteDonePatch() : noteReopenPatch(), by);
        (on ? notesDone : notesBack).push(rec.title);
      } else if (a.op === "update") {
        const patch = buildPatch(a.kind, a.patch, rec);
        // Sorumlu değişikliği ("motor görevini Ali'ye ver"): adlar kişi kimliklerine
        if (canAssign && Array.isArray(a.patch?.assignTo)) patch.assignees = namesToUids(a.patch.assignTo, members);
        if (!Object.keys(patch).length) continue;
        updateRecord(a.kind, a.id, patch, by);
        changed.push(describeAction(a, rec).replace(/^Güncelle: /, "").replace(" → ", ", "));
      } else continue;
      out.done++;
      out.touched.push({ kind: a.kind, id: a.id });
    }
    const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} ve ${xs.at(-1)}` : xs[0]);
    if (ticked.length) out.said += `Tamamladım: ${list(ticked)}. `;
    if (opened2.length) out.said += `Yeniden açtım: ${list(opened2)}. `;
    if (changed.length) out.said += `Değiştirdim: ${changed.join("; ")}. `;
    if (notesDone.length) out.said += `Yapıldı, Arşiv'e kaldırdım: ${list(notesDone)}. `;
    if (notesBack.length) out.said += `Notlara geri aldım: ${list(notesBack)}. `;
    if (out.done) {
      toast(`${out.done} kayıt güncellendi`);
      navigator.vibrate?.([10, 40, 10]);
    }
    return out;
  }
  // Silme onayı (görev listesinin onay adımı): kayıtlar kartta görünür, "evet / onayladım" ile silinir
  function askDelete(actions, viaVoice, lead = "", msg = "") {
    const names = actions
      .map((a) => [a, find(a.kind, a.id)])
      .filter(([, x]) => x)
      .map(([a, x]) => `“${x.title || "Başlıksız"}”${a.op === "delete_series" ? " (bu ve sonraki haftalar)" : a.op === "approve_delete" ? " (silme isteği)" : ""}`);
    const said = msg || `${lead}${names.length > 1 ? `${names.slice(0, -1).join(", ")} ve ${names.at(-1)}` : names[0] || "Bu kayıt"} silinsin mi?`;
    reply(said, { show: actions.map((a) => ({ kind: a.kind, id: a.id })), pending: { actions }, engine: "local", expect: true }, viaVoice);
  }
  // Kaydı düzenleme ekranında aç (iptal: iptal ekranıyla)
  function openRecord(a, said, viaVoice) {
    if (said) tts.maybeSpeak(said);
    park();
    openAdd({ edit: { kind: a.kind, id: a.id, ...(a.op === "cancel" ? { cancel: true } : {}) } });
  }

  // Cümleciğin gittiği uygulama akışı (görev listesi gerekir mi diye bakılır); yapay zeka işi (plan, görev, mesaj…) null
  function flowOf(x) {
    if (racer && wantsRace(x)) return "race";
    if (racer && wantsAttendance(x, false)) return "attendance";
    if (wantsPost(x)) return "post";
    if (incomeCommand(x, todayStr()) || /(aidat\p{L}*|ödemesini) (yaptı|verdi|ödedi)|nakit (verdi|ödedi|getirdi)/iu.test(x)) return "income";
    if (racer && (athleteCommand(x) || duesCommand(x))) return "athlete";
    if (invoiceCommand(x)) return "invoice";
    if (wantsInventory(x, false)) return "inventory";
    if (wantsEvent(x)) return "event";
    if (wantsLog(x)) return "log";
    if (wantsSchedule(x, false)) return "schedule";
    if (shopCommand(x)) return "shopping";
    if (receiptPayCommand(x)) return "receipt";
    if (callCommand(x)) return "call";
    if (localNavigate(x, { names: contacts.map((c) => c.name) })) return "nav";
    // Kurallar tanımadı: daha önce yapay zekanın görev listesinde öğrenilen benzer söz (lib/brain, "plan:<tür>")
    return learnedKind(brainGuess(x));
  }
  // Görev listesini başlat: işler sırayla, her biri kendi akışında; listede yalnız işlerin adı ve sonucu görünür
  function startPlan(tasks, viaVoice, fresh) {
    chain.current = tasks.slice(1);
    chainGen.current++;
    raceFollow.current = null;
    planOn.current = true;
    planNow.current = tasks[0].label || "";
    planFails.current = [];
    setPlan(tasks.map((x, i) => ({ label: x.label, st: i ? "wait" : "run" })));
    chainStep.current = true;
    setWork(tasks[0].label);
    return run(tasks[0].say, viaVoice, fresh);
  }
  // Sohbetteki yarışın adı (görev listesinde "yarış görseli", "bunun için" o yarış sayılsın)
  function sayRace() {
    const id = chainRace.current || curRace;
    return (id && races.current.find((r) => r.id === id)?.name) || "";
  }
  async function askPlan(s) {
    try {
      const res = await authFetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: s, today: todayStr(), race: sayRace(), memo: memoFor(memo.current) }) });
      const d = await res.json().catch(() => ({}));
      return res.ok && Array.isArray(d.tasks) ? d.tasks : null;
    } catch {
      return null;
    }
  }

  async function run(t, viaVoice = false, fresh = false) {
    const s = t.trim();
    if (!s) return toast("Yaz veya mikrofona bas");
    timingStart(s, viaVoice);
    if (viaVoice) {
      setVoice(true);
      convo.current = true; // sesle konuşuldu: sohbet sesli sürer
    }
    // Cümle birine mesajla başlıyorsa ("Ali'ye yaz, faturayı ödedim", "ekibe yaz, kamp planı yapıyoruz") yerel akışlara
    // (kapatma, günlük, etkinlik, envanter, gönderi, ders programı, doğum günü, fatura, yoklama, yarış) girmez; mesaj ana yapay zekayla hazırlanır
    const msgFirst = messageFirst(s);
    // Sohbeti bitir ("bitir", "kapat", "tamam teşekkürler"): dinleme durur, sesli cevap yok
    if (isEnd(s) && !msgFirst) {
      finish();
      return;
    }
    // "Başka bir isteğin var mı?" sorusuna "yok", "hayır" cevabı sohbeti bitirir
    const more = askedMore.current;
    askedMore.current = false;
    if (more && isNoMore(s)) {
      finish();
      return;
    }
    const chained = chainStep.current;
    chainStep.current = false;
    // Tek cümlede birden çok iş ("Atatürk Kupası adında yarış oluştur. Bugün antrenmana Mustafa geldi. Enes aidatını nakit
    // verdi. Atatürk Kupası için Instagram görseli hazırla"): yapay zeka sıralı görev listesi çıkarır (/api/tasks), işler
    // sırayla kendi akışlarında yapılır. Bir soruya cevap beklenirken (taslak, kart, yarış sorusu…) bakılmaz.
    if (!chained && !msgFirst && !cards.awaiting && !drafts.length && !raceFollow.current) {
      const parts = splitChain(s);
      if ((parts.length > 1 && parts.some(flowOf)) || looksMulti(s, flowOf)) {
        setTurns((p) => [...p, { role: "user", text: s }]);
        setText("");
        setHeard(s);
        setError("");
        setSteps([]);
        tts.stop();
        setWork("Görev listesi hazırlanıyor");
        setPhase("thinking");
        // Aynı cümle daha önce söylendiyse görev listesi cihazdaki kopyadan gelir (yapay zekaya gidilmez)
        const known = cachedPlan(s);
        const tasks = known || (await askPlan(s));
        setPhase("idle");
        countHit(known ? "brain" : "ai");
        if (tasks && !known) {
          planLessons(tasks).forEach((e) => record(e.x, e.l, "ai")); // her işin sözü öğrenilir
          rememberPlan(s, tasks);
        }
        const split = parts.length > 1 ? parts.map((p) => ({ say: p, label: p.split(/\s+/).slice(0, 5).join(" ") })) : null;
        const list = tasks?.length > 1 ? tasks : !tasks ? split || localPlan(s, flowOf) : null;
        if (list) return startPlan(list, viaVoice, fresh);
        chainStep.current = true; // tek iş: cümle kendi yoluna (kullanıcının sözü zaten yazıldı)
        return run(tasks?.length === 1 && tasks[0].kind !== "other" ? tasks[0].say : s, viaVoice, fresh);
      }
    }
    const history = fresh ? [] : historyFor(turns);
    // Mesaj taslağı birkaç cümle sonra bağlamdan düşer (konu değişti); yeni sohbette hiç yok
    if (fresh) (msgDraft.current = null), (chainRace.current = ""), (memo.current = {});
    else if (msgDraft.current && ++msgDraft.current.age > DRAFT_AGE) msgDraft.current = null;
    // Sıralı işler yalnız bekleyen taslak ya da mesaj kartı varken sürer; başka bir istekte biter
    if (fresh || !(drafts.length || cards.pending)) queue.current = [];
    // Görev listesi bittiyse yeni istekte listesi kalkar
    if (!chained && !planOn.current) setPlan([]);
    const all = !fresh ? askAll.current : "";
    askAll.current = "";
    parked.current = null; // yeni istek: bekletilen eski yanıt uygulanmaz
    // Görev listesindeki iş kullanıcının sözü değil: balon olarak yazılmaz (listede adı görünür)
    if (!chained) setTurns((p) => [...p, { role: "user", text: s }]);
    setText("");
    setHeard(s);
    setError("");
    setSteps([]);
    setSaved([]);
    tts.stop();

    // Yeni yarışta tarih / sporcular soruldu: cevap o yarışa yazılır; "bilmiyorum", "sonra", "geç" bırakır
    const rf = raceFollow.current;
    raceFollow.current = null;
    if (rf && !fresh) {
      if (isNo(s) || isDrop(s) || /^(bilmiyorum|sonra|daha sonra|geç|atla|şimdilik yok|belli değil)[\s.!]*$/iu.test(s)) return done("Tamam, sonra Yarışlar'dan eklersin.", { engine: "local" }, viaVoice);
      if (!QUESTION.test(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return runRace(s, viaVoice, rf);
    }
    // Kişi ekleme sürüyor: cevap, düzeltme, onay ya da vazgeç (başka bir istekse akış biter, aşağıdan devam)
    if (personFlow.current && !fresh && !["saving", "opening"].includes(personFlow.current.step) && (await continuePerson(s, viaVoice))) return;
    // Etkinlik için yer/zaman soruldu: bu cümle cevaptır (vazgeç, sayfa açma ya da kişi ekleme değilse); plan hazırlanır
    if (eventFlow.current && !fresh) {
      const f = eventFlow.current;
      eventFlow.current = null;
      if (isDrop(s)) return reply("Tamam, etkinlik planını bıraktım.", { engine: "local" }, viaVoice);
      if (!wantsPerson(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return runEvent(`${f.text}\nCevap: ${s}`, viaVoice, true);
    }
    // Envanterden silme soruldu: "evet/sil" siler, "hayır/vazgeç" bırakır; başka bir istekse soru düşer, aşağıdan devam
    if (invFlow.current && !fresh) {
      const f = invFlow.current;
      if (isYes(s) || /^sil\S*[\s.!]*$/i.test(s)) return invDelete(f, viaVoice);
      if (isNo(s) || invDrop(s)) {
        invFlow.current = null;
        return done("Tamam, silmedim.", { engine: "local" }, viaVoice);
      }
      invFlow.current = null;
    }
    // Onay bekleyen iş (arama, sporcu silme, aidat hatırlatması): "evet/ara/sil/gönder" yapar, "hayır/vazgeç" bırakır;
    // başka bir istekse soru düşer, aşağıdan devam
    if (okFlow.current && !fresh) {
      const f = okFlow.current;
      okFlow.current = null;
      const cw = confirmWord(s);
      if (cw === "yes" || isYes(s) || f.word?.test(s.trim())) return f.yes(viaVoice);
      if (cw === "no" || isNo(s) || isDrop(s)) return done("Tamam, vazgeçtim.", { engine: "local" }, viaVoice);
    }
    // Yeni sporcunun adı soruldu: kısa cevap addır
    if (athAsk.current && !fresh) {
      athAsk.current = false;
      if (isDrop(s) || isNo(s)) return done("Tamam, eklemedim.", { engine: "local" }, viaVoice);
      if (s.split(/\s+/).length <= 6 && !QUESTION.test(s) && (await runMore(`yeni sporcu ekle: ${s}`, viaVoice))) return;
    }
    // Antrenman günlüğü sürüyor: tarih soruldu (cevap gün) ya da günlük az önce yazıldı (eksik bilgi: "çok iyi geçti", "90 dakika")
    const lf = !fresh ? logFlow.current : null;
    logFlow.current = null;
    if (lf) {
      if (isDrop(s)) return reply("Tamam, günlüğü bıraktım.", { engine: "local" }, viaVoice);
      // "Antrenman günlüğü oluştur" denmişti, şimdi anlatılıyor: ikisi birlikte günlüğe
      if (lf.collect && !wantsPerson(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return runLog(`${lf.text}\n${s}`, viaVoice, lf);
      if (lf.ask && !wantsPerson(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return runLog(`${lf.text}\nGün: ${s}`, viaVoice, { retry: true });
      if (lf.date && isLogAnswer(s)) return runLog(s, viaVoice, lf);
    }
    // Antrenman günlüğü ("dünkü antrenmanda 12 knot poyraz vardı, start çalıştık", "antrenman günlüğüne yaz: …"):
    // yapay zeka alanlara ayırır, günün antrenman planına yazılır (yoksa plan açılır). Tarih yoksa sorulur, diğer eksikler söylenir.
    // Açık antrenman planı ekranında ya da Antrenman günlüğü sayfasında antrenman anlatımı ("14 knot poyraz, start çalıştık") da günlüktür
    const fp = focusRef.current?.rec?.kind === "plan" ? plans.find((p) => p.id === focusRef.current.rec.id) : null;
    const logPlan = fp && canLog(fp, todayStr()) ? fp : null;
    const at = logPlan ? { date: logPlan.date, time: logPlan.time || "", planId: logPlan.id } : {};
    if (!msgFirst && !isAthleteSide(myKind) && wantsLog(s) && bareLog(s)) {
      reply("Anlat, günlüğe yazayım: hangi gün, rüzgâr kaç knot ve yönü, neler çalıştınız, ne kadar sürdü, nasıl geçti.", { engine: "local", expect: true }, viaVoice);
      waitFor("log");
      logFlow.current = { collect: true, text: s, ...at };
      return;
    }
    if (!msgFirst && !isAthleteSide(myKind) && (wantsLog(s) || ((logPlan || path === "/training") && isLogAnswer(s)))) return runLog(s, viaVoice, at);
    // Etkinlik planı ("kamp planı yapmak istiyorum, tavsiye ver", "İç Anadolu gezisi planla"): yalnız ana hesap.
    // Yer/zaman yoksa önce sorulur; cevap gelmezse genel plan. İhtiyaç listesi, bütçe, yapılacaklar Etkinlikler'e kaydedilir.
    if (!msgFirst && !isStaff && wantsEvent(s)) return runEvent(s, viaVoice, false);
    // Envanter ("envantere 3 Optimist teknesi ekle", "envanterden 2 şamandıra çıkar", envanter sayfasında "Optimist 4 bakımda"):
    // yapay zeka işlem listesi çıkarır; ekleme, çıkarma, değiştirme hemen yapılır, silme onay ister. Yalnız ana hesap.
    if (!msgFirst && !isStaff && wantsInventory(s, invPage) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return runInventory(s, viaVoice);
    // Panelde bekleyen taslak: "kaydet" / "vazgeç"; soru değilse söylenen taslağı tamamlar/değiştirir
    if (drafts.length && !fresh) {
      if (SAVE.test(s)) return saveDraftsNow(viaVoice);
      if (DROP.test(s)) return dropDrafts(viaVoice);
      // Yoklama cümlesi taslağa eklenmez (not olarak taslağa düşüyordu); aşağıda yoklama olarak yapılır
      if (!QUESTION.test(s) && !(canSeeAthletes(profile?.email) && wantsAttendance(s, attHere))) return refineDrafts(s, viaVoice);
    }
    // Taslak yokken yalnızca "kaydet": yapay zekaya gitmez (kaydetmeden "kaydettim" diyebiliyordu)
    if (!drafts.length && !cards.pending && BARE_SAVE.test(s))
      return reply("Kaydedecek bir taslak görmüyorum. Ne eklememi istersin?", { engine: "local", expect: true }, viaVoice);
    // Onay bekleyen işlem varsa "evet / hayır" yerelde çözülür
    if (!fresh && cards.pending) {
      const cw = cards.pending.send ? confirmWord(s) : "";
      if (cw === "yes" || isYes(s)) return confirmPending(true);
      if (cw === "no" || isNo(s)) return cancelPending(true);
      setCards((c) => ({ ...c, pending: null, awaiting: false }));
      // Mesaj taslağına değişiklik: sıradaki işler yapay zekanın yeni taslağına kadar bekler
      heldQ.current = queue.current;
      queue.current = [];
    }
    // Sıralı işte mesajın içeriği soruldu: cevap, tüm istekle birlikte doğrudan yapay zekaya (yerel kurallar onu plan sanmasın)
    if (all && !DROP.test(s) && !QUESTION.test(s)) return askAI(s, `${all}\nMesajın içeriği: ${s}`, viaVoice, history, false);
    // Az önce hazırlanan mesaja değişiklik ("şunu da ekle", "saati 10 yap", "sonuna teşekkürler yaz"): yerel kurallar
    // (plan, alışveriş…) araya girmez, ön cevap "plan hazırlıyorum" demez; taslakla birlikte doğrudan yapay zekaya
    if (!fresh && msgDraft.current && isDraftEdit(s) && !localNavigate(s, { names: contacts.map((c) => c.name) })) return askAI(s, s, viaVoice, history, false, { edit: true });
    // Tek yarışı açma ("D'Azur yarışına git", "sıradaki yarışı aç"): adı kayıtlı yarışlarla eşleşirse o yarışın sayfası
    // Önceki turda sorulan yarış seçenekleri: "ikincisi", "sonuncu", "Foça olan"
    const choices = raceChoices.current;
    raceChoices.current = [];
    const picked = choices.length ? pickChoice(s, choices, todayStr()) : null;
    if (picked) return goRace(picked, viaVoice);
    // Instagram gönderisi ("Foça yarışı için Instagram gönderisi hazırla"): yeni gönderi açılır, yarış ve sporcular bağlanır, yazıları yapay zeka yazar
    const onPost = !chained && !isStaff && path.startsWith("/posts/") && postHandler();
    if (!msgFirst && !isStaff && !onPost && wantsPost(s)) return startPost(s, viaVoice);
    // Tek yarışı açma ("D'Azur yarışına git", "sıradaki yarışı aç"): yerel eşleştirme, emin değilse yapay zeka, yine olmazsa seçenekler
    if (racer && (raceAsk(s) || (wantsRaceOpen(s) && /yarış|regat/i.test(s) && findRace(s, races.current, todayStr())))) {
      // Yarışlar henüz yüklenmediyse (asistan yeni açıldı) önce yüklenir
      if (raceOrg && !races.current.length) races.current = await loadRaces(raceOrg).catch(() => []);
      record(s, "nav:race", "local");
      return openRace(s, viaVoice);
    }
    // Kişi ekleme ("Kişi ekle: Ayşe Yılmaz, eşim, 0532…", "Annem Fatma'yı aileye ekle"): yalnız ana hesap, onayla
    // "Can Tekin'i sporcu olarak ekle" kulübe sporcu açar (aşağıda, runMore); kişi kartı değil
    if (wantsPerson(s) && !(profile?.role === "owner" && !isStaff && racer && athleteCommand(s)?.op === "add")) return startPerson(s, viaVoice);
    // Sayfa ya da sohbet açma ("yoklamayı aç", "ana sayfaya dön", "ekip ile mesaj sayfamı aç"): yapay zekaya gitmeden
    // "Ali Kaya'nın sporcu kartını aç" sohbet açma değil, sporcu kartı (runMore)
    const nav = !(racer && athleteOpenCommand(s)) && localNavigate(s, { names: contacts.map((c) => c.name) });
    if (nav) {
      record(s, `nav:${nav.page || (nav.back ? "back" : "messages")}`, "local");
      countHit("local");
      return openNav(nav, viaVoice);
    }
    // Açık gönderi ekranında söylenen gönderiyi değiştirir: "daha kısa yaz", "Mete 2. oldu diye ekle", "gün batımında görsel üret"
    if (onPost) return runPost(s, viaVoice);
    // Ders programı ("salı 13:00 fizik B-204", "salı fiziği 14'e al"): sayfada her cümle, başka yerde "ders programı" denince.
    // Yapay zeka programı çıkarır, Ders programı sayfasında önizleme açılır; kaydetmeyi (ekle / değiştir) kullanıcı seçer
    if (!msgFirst && wantsSchedule(s, path === "/schedule")) return runSchedule(s, viaVoice);
    // Doğum günü cümlesi ("Annemin doğum günü 12 Mart"): doğum günü formu dolu açılır, sen kaydedersin (her yıl tekrar eder)
    // "Not al: Ali'nin doğum günü …" nottur, doğum günü kaydı değil
    const bday = !msgFirst && !wantsNote(s) && !/(sil|kaldır)\p{L}*[\s.!]*$/u.test(s) && !/\?\s*$|ne zaman|kaçında|hangi gün|kaç yaş/iu.test(s) && parseBirthday(s);
    if (bday) {
      // Ad ve tarih belliyse hemen kaydedilir (kişiye özel takvime); eksikse form dolu açılır
      if (bday.name && bday.month) {
        saveBirthday(bday);
        const d = new Date(2024, bday.month - 1, bday.day).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
        toast(`${bday.name} · doğum günü eklendi`);
        return reply(`Kaydettim: ${bday.name}, ${d}. Takviminde görünür, o gün ana sayfada hatırlatırım.`, { engine: "local" }, viaVoice);
      }
      park();
      openBirthday({ prefill: bday });
      return;
    }
    // "Son kaydı geri al": en son eklenen plan/görev/not, onay sorulup silinir (yapay zekaya gitmeden)
    const undo = !drafts.length && undoLast(s);
    if (undo) {
      const last = lastCreated({ plans, tasks, notes }, profile?.uid, undo.kind);
      if (!last) return reply(`Silinecek ${undo.kind ? KIND[undo.kind].toLocaleLowerCase("tr-TR") : "kayıt"} bulamadım; senin eklediğin bir kayıt görünmüyor.`, { engine: "local" }, viaVoice);
      const when = rel(String(last.rec.createdAt).slice(0, 10)).toLocaleLowerCase("tr-TR");
      return reply(`En son eklediğin ${KIND[last.kind].toLocaleLowerCase("tr-TR")}: “${last.rec.title}” (${when} eklendi). Silmemi onaylıyor musun?`, {
        show: [{ kind: last.kind, id: last.rec.id }],
        pending: { actions: [{ op: "delete", kind: last.kind, id: last.rec.id }] },
        engine: "local",
        expect: true,
      }, viaVoice);
    }
    // Fatura: "Turkcell faturası ödendi", "faturayı ödendi işaretle" (yalnız ana hesap; invoices.js). Hangisi diye
    // sorulduysa sonraki cümle firma adıdır.
    const ia = invAsk.current;
    invAsk.current = null;
    const ic = !isStaff && !drafts.length && !msgFirst && !isQuestion(s) ? invoiceCommand(s) || (ia && !QUESTION.test(s) && s.split(" ").length <= 6 ? { ...ia, t: s } : null) : null;
    if (ic && (await runInvoice(ic, viaVoice, !!ia))) return;
    // Gelen ödemeler: "bu ay ne kadar ödeme aldım", "geçen ay kaç ödeme geldi" (yalnız ana hesap; banka özetinden, payee.js)
    const pq = !isStaff && profile?.role === "owner" && !drafts.length ? payeeAsk(s, todayStr()) : null;
    if (pq) return runPayee(pq, viaVoice);
    // Son eklenen işler (lib/assistMore.js): arama, sporcu ekleme/arşiv/silme, Hesaplar'a nakit gelir, aidat hatırlatması
    if (!msgFirst && !drafts.length && (await runMore(s, viaVoice))) return;
    // Alışveriş listesi: ekle / aldım / sil / oku (yapay zekaya gitmeden; shopWords.js)
    const shopLists = listsFor(myKind, members);
    const sc = shopLists.length ? shopCommand(s) : null;
    if (sc) {
      const list = /ekip|kulüp|kulup/i.test(s) && shopLists.includes("team") ? "team" : shopLists[0];
      if (sc.op === "add") return runShopAdd(sc.what, list, viaVoice);
      if (sc.op === "read") return runShopRead(list, viaVoice);
      // "ekmek aldım": listede eşleşen yoksa alışveriş değildir, aşağıya (yapay zekaya) devam eder
      if (await runShopMark(sc, list, viaVoice)) return;
    }
    // Önceki turda "Ekibe ne yazayım?" diye sorulduysa bu cümle mesajın kendisidir
    if (askTo.current && !QUESTION.test(s)) {
      const to = askTo.current;
      askTo.current = null;
      return prepareSend(to, focusBody(s), "", "local", viaVoice, "", waMode(s));
    }
    askTo.current = null;
    // Sporcu yoklaması: sayfa değiştirmeden panelde yapılır (adımlar görünür); adlar net eşleşirse kaydedilir, geri alınabilir.
    // Yoklama sayfasında "yoklama" denmeden de ("Ali ve Zeynep geldi"). Cümlede başka iş de varsa (mesaj, plan, görev)
    // yoklamadan sonra cümle yapay zekaya gider, kalan işler görev listesiyle yapılır.
    if (!msgFirst && canSeeAthletes(profile?.email) && wantsAttendance(s, attHere)) return runAttendance(s, viaVoice, jobsIn(s).length ? { s, history } : null);
    // Yarış ekleme / yarışa sporcu ya da not ekleme: yarış evrakı sayfasındaki kayda yazılır, yeni yarış planlara da düşer
    // Yarış sayfasındayken yarış adı gerekmez: "Mehmet'i de ekle", "not al: …" o yarışa yazılır
    if (racer && !msgFirst && !skipRace.current && (wantsRace(s) || (curRace && raceJobHere(s)))) return runRace(s, viaVoice);
    skipRace.current = false;
    // Tür sayfasından gelen ilk cümle (soru değilse): o türde taslak
    if (preferRef.current && !drafts.length && !QUESTION.test(s)) {
      const kind = preferRef.current;
      preferRef.current = "";
      setPrefer("");
      return createAs(s, kind, viaVoice);
    }
    // Kısa, kalıba uyan komutlar yapay zekaya gitmeden anında çalışır
    // Açık sohbette/kayıtta "… diye yaz", "cevap ver: …" yerel komutlara düşmez (plan sanılmasın); mesaj olarak hazırlanır
    const toFocus = !!focusRef.current && FOCUS_MSG.test(s);
    const cmd = !toFocus && localCommand(s, { plans, tasks, notes }, undefined, { aiFirst: true });
    if (cmd) {
      record(s, labelFromCommand(cmd), "local");
      countHit("local");
      return runLocal(cmd, s, viaVoice);
    }
    return askAI(s, s, viaVoice, history, toFocus);
  }

  // Yapay zekaya sorar. s: kullanıcının bu cümlesi, ask: yapay zekaya giden istek (sıralı işte önceki istekle birleşik)
  // opts.edit: açık mesaj taslağının değiştirilmesi (ön cevap yalnız "Tamam.", tür ipucu gitmez)
  async function askAI(s, ask, viaVoice, history, toFocus, opts = {}) {
    // Öğrenilenler (brain) artık yapay zekadan önce kayıt hazırlamaz: yalnızca yapay zekaya ulaşılamazsa yedek (aşağıda)
    const id = ++runId.current;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    // Bağlantı takılırsa (iPhone Wi-Fi ↔ hücresel geçişi) istek dakikalarca asılı kalmasın: 25 sn sonra vazgeçilir, yedek yola geçilir
    let late = false;
    const limit = setTimeout(() => {
      late = true;
      c.abort();
    }, 25000);
    setPhase("thinking");
    // Ön cevap: yapay zeka düşünürken hemen kısa bir giriş (veriden bilgiyle) söylenir ve gösterilir; bildiği alanlar
    // taslak kartta belirir. Yapay zekaya da ne söylendiği gider, cevabı bunun devamı olur (lib/precue.js).
    const pc = opts.edit ? editPrecue() : precue(ask, { plans, today: todayStr(), guess: brainGuess(s), weatherRows: (d) => dayHours(cachedWeather(), d) });
    clearSay();
    streamSaid.current = "";
    setStreamText("");
    if (viaVoice) inflight.current = s;
    setWork(pc?.work || "");
    // Tek bilgi kanalı (Seyhun: "yapay zeka anladım diyor, bilgi kısmında da anladım yazıyor", 2026-10-09): beklerken ne
    // yapıldığını yalnız bilgi alanı söyler ("Plan hazırlanıyor…"); sohbete ve sese "Tamam / Bakıyorum" yazılmaz, yalnız asıl
    // cevap gelir. Ön cevapta veriden yardımcı bilgi varsa ("O saatlerde “Toplantı” planı da var.") yalnız o yazılır ve okunur.
    if (pc) timingMark("pre");
    if (pc?.info) {
      setTurns((p) => [...p, { role: "assistant", text: pc.info, pre: true }]);
      // Yanıtın okunması bunun ardından (kuyruk). Okunurken mikrofon açılmaz (kendi sesini duymasın);
      // bitince dinlenir: kullanıcı devam ederse söylediği öncekine eklenir
      enqueueSay(pc.info, viaVoice ? listenWhileThinking : undefined);
    } else if (viaVoice) listenWhileThinking();
    // Akış: yanıt metni geldikçe ekranda büyür; tamamlanan cümleler hemen kuyruğa (bekleme 1–2 sn'ye iner)
    const onText = (m) => {
      if (id !== runId.current) return;
      timingMark("first");
      setStreamText(m);
      const end = Math.max(...[". ", "? ", "! ", "… ", ".\n", "?\n", "!\n"].map((p) => m.lastIndexOf(p)));
      if (end < 0) return;
      const upto = m.slice(0, end + 1);
      if (upto.length > streamSaid.current.length && upto.startsWith(streamSaid.current)) {
        enqueueSay(upto.slice(streamSaid.current.length).trim());
        streamSaid.current = upto;
      }
    };
    try {
      // Hava sorusuysa (ya da önceki soru havaysa, "peki pazar?" gibi) güncel hava verisi de gider
      const wx = wantsWeather(s) || history.slice(-2).some((h) => h.role === "user" && wantsWeather(h.text));
      const weather = wx ? weatherDigest(await loadWeather().catch(() => cachedWeather())) : "";
      const { athletes: clubAth, dues: clubDues, invoices: clubInv, inventories: clubInvs } = club.current;
      const clubText = clubDigest({ races: races.current, athletes: clubAth, dues: clubDues, invoices: clubInv, inventories: clubInvs, today: todayStr() });
      const digest = [buildDigest({ plans, tasks, notes, receipts, name: firstName, members: staff }), clubText, weather, focusRef.current?.text && `## AÇIK EKRAN\n${focusRef.current.text}`].filter(Boolean).join("\n\n");
      if (id !== runId.current) return;
      countHit("ai");
      timingMark("ai");
      const r = await askAssistant({ text: ask, name: firstName, digest, history, draft: draftFor(msgDraft.current), memo: memoFor(memo.current), people: staffNames, contacts: contactNames, precue: pc?.hint || "", onText }, c.signal);
      if (id !== runId.current) return;
      timingMark("aiDone");
      setPhase("preparing");
      handle(r, ask, viaVoice); // bekleme yok: işler hemen yapılır
    } catch (err) {
      if (id !== runId.current) return;
      const e = late ? new Error("Yapay zeka çok geç kaldı, bağlantını kontrol edip tekrar dene.") : err;
      setStreamText("");
      streamSaid.current = "";
      inflight.current = null;
      if (live.current.spStatus === "listening" && !live.current.heardNow) sp.cancel();
      // Yapay zeka yok: önce öğrenilmiş örneklerden tahmin (kendi küçük modelimiz)
      const guessed = brainCommand(s);
      if (guessed) {
        toast("Yapay zekaya ulaşamadım, öğrendiklerime göre hazırladım. Kontrol et.");
        return runLocal(guessed, s, viaVoice);
      }
      // Sıralı birden çok iş kurallarla ayrılamaz (mesaj metni "takvime ekle…" olurdu): tek tek söylenmesi istenir
      if (isMulti(ask)) return reply("Yapay zekaya şu an ulaşamadım; birden çok işi sırayla yapamıyorum. Tek tek söyler misin?", { engine: "rules", expect: true }, viaVoice);
      // Mesaj isteği ("Ali'ye yaz: …", "ekibe söyle …"): basit kurallarla taslak (düzenleme yapılmaz, olduğu gibi)
      const toTeam = TEAM_WORD.test(s);
      const mi = messageIntent(toTeam ? s.replace(/^\S+(\s+grubuna)?\s+/i, "") : s, contacts);
      if (toFocus && !mi?.to && !toTeam) {
        toast("Yapay zekaya ulaşamadım, mesajı olduğu gibi hazırladım. Kontrol et.");
        return prepareSend("", focusBody(s), "", "rules", viaVoice);
      }
      // Alıcı belli ama ne yazılacağı söylenmedi ("ekip grubuna mesaj gönder"): sor, sonraki cümle mesaj olur
      if ((toTeam || mi?.to) && !String(mi?.send || "").trim().replace(/^(bir\s+)?mesaj\s*(gönder|at|yaz)?$/i, "")) {
        const to = toTeam ? s.split(/\s+/)[0] : mi.to;
        const dest = resolveTo(to);
        if (dest) {
          waitFor("to");
          askTo.current = to;
          return reply(`${dest.team ? `${dest.label} grubuna` : dest.label === "kaydın konuşması" ? "Kayda" : `${dest.label} için`} ne yazayım?`, { engine: "rules", expect: true }, viaVoice);
        }
      }
      if (mi?.send && (toTeam || mi.to || mi.unknown)) {
        toast("Yapay zekaya ulaşamadım, mesajı olduğu gibi hazırladım. Kontrol et.");
        return prepareSend(toTeam ? s.split(/\s+/)[0] : mi.to || mi.unknown, mi.send, "", "rules", viaVoice, "", waMode(s));
      }
      // Ekleme isteğine benziyorsa panelde taslak hazırlanır (sunucu yedek kurallarla kart çıkarır)
      if (looksLikeCreate(s)) {
        toast("Yapay zekaya ulaşamadım, kaydı basit kurallarla hazırlıyorum. Kontrol et.");
        try {
          const r = await interpretText(s, firstName, undefined, null, staffNames);
          if (r.items?.length) return startDrafts(r.items, s, r.message, r.source, viaVoice);
        } catch {
          /* aşağıdaki yerel sorguya düş */
        }
      }
      const lq = localQuery(s, { plans, tasks });
      if (lq) reply(lq.show.length ? lq.message : `Yapay zekaya şu an ulaşamadım. ${lq.message}`, { show: lq.show, engine: "rules" }, viaVoice);
      else setError(e.message || "Asistan şu an yanıt vermedi");
    } finally {
      clearTimeout(limit);
      if (id === runId.current) {
        setPhase("idle");
        setStreamText("");
      }
    }
  }

  // Hızlı komutlar (lib/commands): fiş kamerası, sayfa, yeni kayıt, görev tamamlama, özet
  function runLocal(cmd, s, viaVoice) {
    if (cmd.type === "receipt") {
      navigator.vibrate?.(8);
      park();
      openReceipt({ camera: true, voice: viaVoice }); // kaydedince fiş numarası sesle de söylenir
    } else if (cmd.type === "meeting") {
      navigator.vibrate?.(8);
      park();
      openMeeting();
    } else if (cmd.type === "navigate") go(cmd.page, `${PAGES[cmd.page].label} sayfasını açtım.`, viaVoice);
    else if (cmd.type === "create") startDrafts(cmd.items, s, cmd.message, cmd.brain ? "brain" : "local", viaVoice);
    else if (cmd.type === "complete") {
      toggleTask(cmd.id);
      toast("1 görev güncellendi");
      reply(`Tamam, ${cmd.title} görevini tamamladım.`, { show: [{ kind: "task", id: cmd.id }], engine: "local" }, viaVoice);
    } else reply(cmd.message, { show: cmd.show, engine: cmd.brain ? "brain" : "local" }, viaVoice);
  }

  // Alıcıyı sohbete çevirir: "Ekip" → ekip sohbeti; kişi → birebir sohbet (ilk mesajda oluşturulur)
  function resolveTo(to) {
    const f = focusRef.current;
    const t = String(to || f?.to || "").trim() || (f?.rec ? RECORD_TO : "");
    if (!t) return null;
    if (f?.rec && (t === RECORD_TO || /^bu kayd|^kayıt/i.test(t))) return { rec: f.rec, label: "kaydın konuşması" };
    // Kurulan grup ("Yelken Ekibi grubuna"): sabit grup kelimeleriyle başlasa da önce adıyla aranır
    const cg = matchGroup(t, myGroups);
    if (cg) return { cid: cg.id, label: cg.name, team: true, icon: "users" };
    if (TEAM_WORD.test(t)) {
      const g = groupOf(t, groupIds);
      return g ? { cid: g, label: GROUPS[g].name, team: true, icon: GROUPS[g].icon, create: { type: "team" } } : null;
    }
    const everyone = [...contacts, ...waPeople];
    const name = everyone.find((c) => c.name === t)?.name || matchPerson(t, everyone);
    const c = contacts.find((x) => x.name === name);
    // Uygulamada hesabı yok ama kişilerde telefonu var: kartta WhatsApp'la gönderilir
    const w = !c && waPeople.find((x) => x.name === name);
    if (w) return { wa: w.wa, label: w.name };
    if (!c || !myUid) return null;
    return { cid: dmId(myUid, c.p.uid), label: c.name, create: { type: "dm", members: [myUid, c.p.uid].sort() } };
  }
  // wa: istekte WhatsApp geçti. "also" ("sporculara ve WhatsApp grubuna da"): kart "Gönder + WhatsApp";
  // "only" ("WhatsApp sporcular grubuna gönder"): yalnız WhatsApp grubu açılır, uygulamadaki gruba gitmez
  function prepareSend(to, text, msg, engine, viaVoice, lead = "", wa = "") {
    // Aynı alıcıya düzeltilen taslak önceki WhatsApp seçimini korur ("şunu da ekle" cümlesinde WhatsApp geçmez)
    const prev = msgDraft.current;
    if (!wa && prev?.wa && (sameTo(to, prev.to) || sameTo(to, prev.label))) wa = prev.wa;
    let dest = resolveTo(to);
    // Yalnız Ayarlar › WhatsApp gruplarında olan grup ("WhatsApp veliler grubuna yaz")
    if (!dest && wa === "only") {
      const g = (profile?.waGroups || []).find((x) => waGroupFor(String(to || ""), [x]));
      if (g) dest = { label: g.name, team: true, icon: "users" };
    }
    const waOnly = wa === "only" && !!dest?.team;
    const alsoWa = wa === "also";
    if (dest) msgDraft.current = { to: String(to || ""), label: dest.label, text, wa: waOnly ? "only" : alsoWa ? "also" : "", state: "pending", age: 0 };
    if (!dest) {
      const who = String(to || "").trim();
      queue.current = []; // alıcı yoksa sıralı işler de durur (kullanıcı yeniden söyler)
      // Kişilerde var ama uygulamada hesabı da telefonu da yok: neden gönderilemediği söylenir
      const known = who && matchPerson(who, members.filter((m) => m.name).map((m) => m.name));
      if (known) return reply(`${lead}${known} uygulamada değil ve kişilerde telefonu yok; mesaj gönderemiyorum. Kişiler'den telefonunu eklersen WhatsApp'la gönderebilirim.`, { engine }, viaVoice);
      return reply(`${lead}${who ? `${who} adında birini bulamadım. ` : ""}Kime göndereyim? Bir kişinin, grubun adını ya da "ekip" de.`, { engine, expect: true }, viaVoice);
    }
    if (waOnly) return reply(`${lead}${dest.label} WhatsApp grubu için mesaj hazır: “${text}” WhatsApp'ta açayım mı?`, { pending: { send: { ...dest, text, waOnly: true } }, engine, expect: true }, viaVoice);
    const said = msg || `${lead}${dest.team ? `${dest.label} grubu` : dest.label} için mesaj hazır${dest.wa ? " (WhatsApp'la)" : ""}: “${text}” Göndereyim mi?`;
    reply(/\?\s*$/.test(said) || /göndereyim mi/i.test(said) ? said : `${said} Göndereyim mi?`, { pending: { send: { ...dest, text, ...(alsoWa && dest.team ? { alsoWa: true } : {}) } }, engine, expect: true }, viaVoice);
  }
  const setSendText = (t) => {
    if (msgDraft.current) msgDraft.current = { ...msgDraft.current, text: t }; // kartta elle düzeltilen metin de bağlama gider
    setCards((c) => (c.pending?.send ? { ...c, pending: { send: { ...c.pending.send, text: t } } } : c));
  };

  // waOpened: kartta "Gönder + WhatsApp"a dokunuldu, WhatsApp paylaşımı zaten açıldı
  async function confirmPending(fromText = false, waOpened = false) {
    const pend = cards.pending;
    if (!pend) return;
    if (!fromText) setTurns((p) => [...p, { role: "user", text: pend.send ? "Gönder" : "Onayla", chip: true }]);
    if (pend.send && msgDraft.current) msgDraft.current = { ...msgDraft.current, text: pend.send.text, state: pend.send.waOnly || pend.send.wa ? "wa" : "sent" };
    if (pend.att) {
      setCards((c) => ({ ...c, pending: null, awaiting: false }));
      setSteps([]);
      try {
        await saveAtt(pend.att, fromText && convo.current);
        if (pend.rest) restAfterAtt(pend.rest, fromText && convo.current, `Yoklama kaydedildi (${attSummary(pend.att)}).`);
      } catch (e) {
        stepsEnd(false);
        reply(e.message || "Kaydedemedim.", { fail: true, engine: "local" });
      }
      return;
    }
    if (pend.send?.waOnly) {
      // Yalnız WhatsApp grubu: kartta dokunulunca grup zaten açıldı; sesle onaylanınca WhatsApp kendiliğinden açılamaz (iPhone dokunuş ister), düğme verilir
      const { text: body, label } = pend.send;
      setCards((c) => ({ ...c, pending: null, awaiting: false }));
      if (!waOpened) return reply(`Hazır. WhatsApp'ı açmak için aşağıdaki düğmeye dokun, listeden ${label} grubunu seç; mesaj hazır gelir.`, { engine: "local", share: body }, fromText && convo.current);
      if (nextStep(fromText && convo.current, "WhatsApp'ta açtım. ")) return;
      return done(`WhatsApp'ı açtım; listeden ${label} grubunu seç, mesaj hazır gelir.`, { engine: "local" }, fromText && convo.current);
    }
    if (pend.send) {
      const { cid, text: body, create, label, team, rec, wa } = pend.send;
      if (!body.trim()) return reply("Mesaj boş; ne yazayım?", { engine: "local", expect: true }, fromText && convo.current);
      // Uygulamada olmayan kişi: WhatsApp mesajı hazır açılır, gönder düğmesine kişi kendisi basar
      if (wa) {
        const opened = !!window.open(waTo(wa, body), "_blank");
        if (!opened) return reply("WhatsApp'ı açamadım; karttaki WhatsApp düğmesine dokun.", { engine: "local" }, fromText && convo.current);
        setCards((c) => ({ ...c, pending: null, awaiting: false }));
        if (nextStep(fromText && convo.current, "WhatsApp'ta açtım. ")) return;
        return done(`WhatsApp'ta ${label} için açtım; orada gönder'e dokun.`, { engine: "local" }, fromText && convo.current);
      }
      setCards((c) => ({ ...c, pending: null, awaiting: false }));
      setSteps([]);
      if (rec) {
        stepTo("Mesaj kaydın konuşmasına gönderiliyor");
        const ok = await Promise.resolve(addReply?.(rec.kind, rec.id, body)).then(() => true, () => false);
        if (ok) sentOk.current = true;
        stepsEnd(ok);
        toast(ok ? "Mesaj gönderildi" : sendErrorText());
        if (nextStep(fromText && convo.current, ok ? "Gönderdim. " : "Mesajı gönderemedim. ")) return;
        return (ok ? done : reply)(ok ? "Gönderdim, kayıttaki herkes görecek." : "Mesajı gönderemedim; tekrar dene.", { engine: "local" }, fromText && convo.current);
      }
      stepTo(`Mesaj ${team ? `${label} grubuna` : label} gönderiliyor`);
      const ok = await chatSend?.(cid, body, { create });
      if (ok) sentOk.current = true;
      stepsEnd(!!ok);
      toast(ok ? "Mesaj gönderildi" : "Mesaj gönderilemedi");
      navigator.vibrate?.([10, 40, 10]);
      // Grup mesajı WhatsApp grubuna da istendiyse (sesle onaylanınca WhatsApp kendiliğinden açılamaz): "WhatsApp'ta da paylaş" düğmesi
      const waLeft = ok && team && pend.send.alsoWa && !waOpened;
      if (!waLeft && nextStep(fromText && convo.current, ok ? `Gönderdim${team ? `, ${label} grubu gördü` : ""}. ` : "Mesajı gönderemedim. ")) return;
      if (waLeft) return reply(`Gönderdim, ${label} grubu gördü. WhatsApp grubuna da göndermek için aşağıdaki düğmeye dokun, listeden grubu seç; mesaj hazır gelir.`, { engine: "local", chat: cid, share: body }, fromText && convo.current);
      return (ok ? done : reply)(ok ? `Gönderdim${team ? `, ${label} grubu gördü${waOpened ? "; WhatsApp'ta listeden grubu seç, mesaj hazır" : ""}` : `, ${label} görecek`}.` : `Mesajı gönderemedim. ${sendErrorText()}`, { engine: "local", chat: ok ? cid : "", share: ok && team ? body : "" }, fromText && convo.current);
    }
    let n = 0;
    for (const a of pend.actions) {
      const rec = find(a.kind, a.id);
      if (!rec) continue;
      if (a.op === "delete" || a.op === "approve_delete") {
        deleteRecord(a.kind, a.id);
        n++;
      } else if (a.op === "delete_series" && rec.seriesId) {
        n += (await deleteSeries(rec.seriesId, rec.date).catch(() => 0)) || 1;
      } else if (a.op === "update") {
        const patch = buildPatch(a.kind, a.patch, rec);
        if (Object.keys(patch).length) {
          updateRecord(a.kind, a.id, patch, by);
          n++;
        }
      }
    }
    const del = pend.actions.every((a) => /^(delete|delete_series|approve_delete)$/.test(a.op));
    toast(n ? (del ? "Silindi" : "Yapıldı") : "Kayıt bulunamadı");
    navigator.vibrate?.([10, 40, 10]);
    setCards((c) => ({ ...c, pending: null, awaiting: false }));
    if (nextStep(fromText && convo.current, n ? (del ? "Sildim. " : "Yaptım. ") : "O kayıtları bulamadım. ")) return;
    (n ? done : reply)(n ? (del ? "Sildim." : "Tamamdır, yaptım.") : "O kayıtları bulamadım.", { engine: "local" }, fromText && convo.current);
  }

  function cancelPending(fromText = false) {
    if (!fromText) setTurns((p) => [...p, { role: "user", text: "Vazgeç", chip: true }]);
    if (cards.pending?.send && msgDraft.current) msgDraft.current = { ...msgDraft.current, state: "dropped" };
    // Yoklama onayından vazgeçildi: cümledeki diğer işler yine yapılır
    if (cards.pending?.att && cards.pending.rest) {
      reply("Tamam, yoklamayı kaydetmedim.", { engine: "local" }, fromText && convo.current);
      return void restAfterAtt(cards.pending.rest, fromText && convo.current, "Yoklama kaydedilmedi.");
    }
    if ((cards.pending?.send || cards.pending?.actions) && nextStep(fromText && convo.current, cards.pending?.send ? "Tamam, göndermedim. " : "Tamam, silmedim. ")) return;
    queue.current = [];
    done(cards.pending?.send ? "Tamam, göndermedim." : cards.pending?.actions?.every((a) => /^(delete|delete_series|approve_delete)$/.test(a.op)) ? "Tamam, silmedim." : "Tamam, vazgeçtim.", { engine: "local" }, fromText && convo.current);
  }

  // ---- Kişi ekleme (yalnız ana hesap): bilgiler toplanır, eksikler sorulur, mükerrer bakılır, özet kartında onaylanır ----
  // Hesap açılmaz; kaydedince "Hesap da açalım mı?" sorulur ve kişi kartı hesap ekranında açılır (kullanıcı adı/şifreyi kişi görür).
  const personCard = (f) => ({ draft: f.draft, step: f.step, dups: f.dups || [], uid: f.uid || "", acc: f.acc || null });
  async function startPerson(s, viaVoice) {
    if (isStaff) return reply("Kişi eklemeyi yalnız ana hesap yapabilir.", { engine: "local" }, viaVoice);
    const id = ++runId.current;
    setPhase("thinking");
    let r;
    try {
      r = await readPerson(s);
    } catch (e) {
      if (id === runId.current) setPhase("idle");
      return reply(e.message || "Kişi eklemeyi yalnız ana hesap yapabilir.", { fail: true, engine: "local" }, viaVoice);
    }
    if (id !== runId.current) return;
    setPhase("idle");
    // Öğrenme kaydına yazılmaz (cümlede telefon/e-posta olabilir)
    stepPerson(r.draft, viaVoice, r.engine === "ai" ? "ai" : "local");
  }
  // Sıradaki adım: eksik/hatalı alan varsa tek soru; yoksa mükerrer kontrolü ve özet + onay
  function stepPerson(draft, viaVoice, engine = "local", lead = "") {
    const q = nextQuestion(draft);
    if (q) {
      waitFor("person");
      personFlow.current = { draft, step: "ask", ask: q.field };
      return reply(`${lead}${q.ask}`, { person: personCard(personFlow.current), engine, expect: true }, viaVoice);
    }
    const dups = findDuplicates(draft, allMembers || members);
    waitFor("person");
    personFlow.current = { draft, step: "confirm", ask: "", dups };
    const warn = dups.length
      ? ` Dikkat, listede benzer kişi var: ${dups.map((d) => `${d.person.name} (${d.why}${d.left ? ", silinmiş" : ""})`).join("; ")}. Yine de eklemek için “yine de ekle” de.`
      : " Kaydedeyim mi?";
    reply(`${lead}${summarySay(draft)}${warn}`, { person: personCard(personFlow.current), engine, expect: true }, viaVoice);
  }
  // Kişi ekleme sürerken gelen cümle. İşlendiyse true; başka bir istekse false (akış biter, cümle her zamanki yoldan gider).
  async function continuePerson(s, viaVoice) {
    const f = personFlow.current;
    const t = s.toLocaleLowerCase("tr-TR").trim();
    const no = isNo(s) || /^(vazgeç|iptal|ekleme|kaydetme)/.test(t);
    const yes = (isYes(s) && !/^sil/.test(t)) || /^(kaydet|ekle|aç|hesap aç)\S*[\s.!]*$/.test(t);
    if (f.step === "saved") {
      if (undoLast(s) || /^(geri al|sil|kaldır)/.test(t)) return personUndoAsk(viaVoice), true;
      if (yes) return personAccount(viaVoice), true;
      if (no) return reply("Tamam, hesap açmadım. İstediğinde Kişiler sayfasından açabilirsin.", { person: personCard(f), engine: "local" }, viaVoice), true;
      personFlow.current = null;
      return false;
    }
    if (f.step === "account") {
      const login = loginIn(s);
      if (login) {
        if (!login.includes("@") && !validUsername(login)) return reply("Kullanıcı adı en az 3 karakter olmalı; harf, rakam ve nokta kullan.", { person: personCard(f), engine: "local", expect: true }, viaVoice), true;
        personFlow.current = { ...f, acc: { ...f.acc, login } };
        return reply(`Giriş ${login} olacak. Hesabı açayım mı?`, { person: personCard(personFlow.current), engine: "local", expect: true }, viaVoice), true;
      }
      if (yes || /hesabı aç/.test(t)) return personOpenAccount(viaVoice), true;
      personFlow.current = { ...f, step: "saved", acc: null };
      if (no) return reply("Tamam, hesap açmadım.", { person: personCard(personFlow.current), engine: "local" }, viaVoice), true;
      return false;
    }
    if (f.step === "opened") {
      personFlow.current = null;
      return false;
    }
    if (f.step === "undo") {
      if (yes || /^sil/.test(t)) return personUndo(viaVoice), true;
      personFlow.current = { ...f, step: "saved" };
      return reply("Tamam, silmedim.", { person: personCard(personFlow.current), engine: "local", expect: true }, viaVoice), true;
    }
    if (no) return personCancel(true, viaVoice), true;
    if (wantsPerson(s)) return startPerson(s, viaVoice), true; // baştan yeni kişi
    if (f.step === "confirm") {
      const anyway = /yine de (ekle|kaydet)/.test(t);
      if (yes || anyway) {
        if (f.dups.length && !anyway)
          return reply("Listede benzer kişi olduğu için emin olmak istiyorum: eklemek için “yine de ekle”, eklememek için “vazgeç” de.", { person: personCard(f), engine: "local", expect: true }, viaVoice), true;
        return personSave(viaVoice), true;
      }
    }
    const next = applyAnswer(f.draft, s, f.ask);
    if (!changes(f.draft, next)) {
      if (f.step === "ask" && !QUESTION.test(s) && s.split(/\s+/).length <= 6) return stepPerson(f.draft, viaVoice, "local", "Anlayamadım. "), true;
      personFlow.current = null; // başka bir istek
      return false;
    }
    stepPerson(next, viaVoice);
    return true;
  }
  async function personSave(viaVoice) {
    const f = personFlow.current;
    if (!f || f.step !== "confirm" || isStaff) return;
    const { draft } = f;
    personFlow.current = { ...f, step: "saving" };
    setSteps([]);
    stepTo("Kişi kaydediliyor");
    try {
      const uid = await createPerson(profile.uid, draft);
      if (draft.birth) {
        stepTo("Doğum günü takvime ekleniyor");
        saveBirthday({ name: draft.name, month: draft.birth.month, day: draft.birth.day, year: draft.birth.year, phone: draft.phone ? formatPhone(draft.phone) : "", memberUid: uid, note: KIND_LABEL[draft.kind] });
      }
      stepsEnd();
      navigator.vibrate?.([10, 40, 10]);
      toast(`${draft.name} eklendi`);
      personFlow.current = { draft, step: "saved", uid };
      memoSet("person", draft.name);
      reply(`Kaydettim, ${draft.name} kişilere eklendi. Uygulamaya girebilmesi için hesap da açalım mı?`, { person: personCard(personFlow.current), engine: "local", expect: true }, viaVoice);
    } catch {
      stepsEnd(false);
      personFlow.current = f;
      reply("Kaydedemedim; bağlantını kontrol edip tekrar dene.", { person: personCard(f), engine: "local", expect: true }, viaVoice);
    }
  }
  function personCancel(fromText = false, viaVoice = false) {
    if (!fromText) setTurns((p) => [...p, { role: "user", text: "Vazgeç", chip: true }]);
    personFlow.current = null;
    reply("Tamam, kişiyi eklemedim.", { engine: "local" }, viaVoice);
  }
  // Hesap açma ayrı onay: önce önerilen giriş ve şifre kartta gösterilir ("kullanıcı adı … olsun" ile değişir), ikinci onayla açılır
  function personAccount(viaVoice = false) {
    const f = personFlow.current;
    if (!f?.uid || isStaff) return;
    const acc = { login: suggestLogin(f.draft, allMembers || members), password: newPassword() };
    personFlow.current = { ...f, step: "account", acc };
    reply(`${f.draft.name} için giriş ${acc.login} olacak, şifre ekranda. Hesabı açayım mı? Kullanıcı adını değiştirmek için “kullanıcı adı … olsun” de.`, { person: personCard(personFlow.current), engine: "local", expect: true }, viaVoice);
  }
  async function personOpenAccount(viaVoice = false) {
    const f = personFlow.current;
    if (!f?.uid || f.step !== "account" || isStaff) return;
    personFlow.current = { ...f, step: "opening" };
    setSteps([]);
    stepTo("Hesap açılıyor");
    try {
      await openAccount({ uid: f.uid, name: f.draft.name, kind: f.draft.kind, login: f.acc.login, password: f.acc.password });
      stepsEnd();
      navigator.vibrate?.([10, 40, 10]);
      toast("Hesap açıldı");
      personFlow.current = { ...f, step: "opened" };
      reply(`Hesabı açtım. Giriş bilgileri ekranda; ${f.draft.phone ? "WhatsApp ile gönderebilirsin" : "kişiye ilet"}.`, { person: personCard(personFlow.current), engine: "local" }, viaVoice);
    } catch (e) {
      stepsEnd(false);
      personFlow.current = f;
      reply(`${e.message} Başka bir kullanıcı adı söyleyebilir ya da vazgeçebilirsin.`, { person: personCard(f), engine: "local", expect: true }, viaVoice);
    }
  }
  // Düzenle: kaydedilmemiş bilgiler kişi formunda dolu açılır; kaydedildiyse kişinin kartı açılır
  function personEdit() {
    const f = personFlow.current;
    if (!f) return;
    askOpen(f.uid ? { uid: f.uid } : { prefill: f.draft });
    park();
    router.push(`/people/${groupOfKind(f.draft.kind || "other")}`);
    reply(f.uid ? `${f.draft.name} kişi kartını açtım.` : "Kişi formunu doldurup açtım; kontrol edip “Ekle”ye bas.", { engine: "local" });
  }
  function personUndoAsk(viaVoice = false) {
    const f = personFlow.current;
    if (!f?.uid) return;
    const m = (allMembers || []).find((x) => x.uid === f.uid);
    if (m && m.account !== false) return reply(`${f.draft.name} için hesap açıldığından buradan silmiyorum; Kişiler sayfasından silebilirsin.`, { engine: "local" }, viaVoice);
    personFlow.current = { ...f, step: "undo" };
    reply(`Az önce eklediğim ${f.draft.name} silinsin mi?`, { person: personCard(personFlow.current), engine: "local", expect: true }, viaVoice);
  }
  async function personUndo(viaVoice = false) {
    const f = personFlow.current;
    if (!f?.uid) return;
    const m = (allMembers || []).find((x) => x.uid === f.uid);
    if (m && m.account !== false) return reply(`${f.draft.name} için hesap açıldığından buradan silmiyorum; Kişiler sayfasından silebilirsin.`, { engine: "local" }, viaVoice);
    try {
      await removePerson(profile.uid, f.uid);
      const b = birthdays.find((x) => x.memberUid === f.uid);
      if (b) deleteRecord("birthday", b.id);
      toast(`${f.draft.name} silindi`);
      personFlow.current = null;
      reply(`Geri aldım, ${f.draft.name} silindi.`, { engine: "local" }, viaVoice);
    } catch {
      reply("Silemedim; Kişiler sayfasından silebilirsin.", { engine: "local" }, viaVoice);
    }
  }

  // ---- Alışveriş listesi (asistandan) ----
  async function runShopAdd(what, list, viaVoice) {
    const items = splitItems(what);
    if (!items.length) return reply("Neyi ekleyeyim?", { engine: "local", expect: true }, viaVoice);
    setSteps([]);
    stepTo(`${LISTS[list].name} listesine ekleniyor`);
    try {
      await addItems(profile.orgId, list, profile.uid, items);
      stepsEnd();
      navigator.vibrate?.(8);
      reply(`Ekledim: ${items.join(", ")}.`, { engine: "local", nav: "shopping" }, viaVoice);
    } catch {
      stepsEnd(false);
      reply("Listeye ekleyemedim.", { engine: "local" }, viaVoice);
    }
  }
  // "ekmek alındı" → işaretle, "listeden sütü sil" → sil. Bir şey yapıldıysa (ya da silme istendiyse) true döner.
  async function runShopMark({ op, what }, list, viaVoice) {
    let open;
    try {
      const snap = await getDocs(query(collection(db, "orgs", profile.orgId, "shop"), where("list", "==", list)));
      open = snap.docs.map((d) => ({ ...d.data(), id: d.id })).filter((x) => op === "remove" || !x.done);
    } catch {
      if (op !== "remove") return false;
      reply("Listeye ulaşamadım.", { engine: "local" }, viaVoice);
      return true;
    }
    const { hits, missed } = matchShop(what, open);
    if (!hits.length) {
      if (op !== "remove") return false;
      reply(`${LISTS[list].name} listesinde ${what} bulamadım.`, { engine: "local", nav: "shopping" }, viaVoice);
      return true;
    }
    try {
      await Promise.all(hits.map((it) => (op === "remove" ? removeItem(profile.orgId, it) : toggleItem(profile.orgId, it, profile.uid))));
    } catch {
      reply("Listeyi güncelleyemedim.", { engine: "local" }, viaVoice);
      return true;
    }
    navigator.vibrate?.(8);
    const names = hits.map((x) => x.text).join(", ");
    const left = missed.length ? ` ${missed.join(", ")} listede yok.` : "";
    reply(`${op === "remove" ? `Listeden çıkardım: ${names}.` : `Alındı olarak işaretledim: ${names}.`}${left}`, { engine: "local", nav: "shopping" }, viaVoice);
    return true;
  }
  // ---- Fatura ödendi / ödenmedi (asistandan) ----
  // ia: önceki turda "hangi fatura" soruldu; bulunamazsa false döner, cümle başka işlere devam eder
  async function runInvoice(ic, viaVoice, asked = false) {
    let list;
    try {
      list = await loadInvoices(profile.orgId);
    } catch {
      reply("Faturaları okuyamadım.", { engine: "local" }, viaVoice);
      return true;
    }
    const { pick, list: many } = pickInvoice(ic.t, list, ic.op);
    if (!pick) {
      if (asked && !many.length) return false;
      if (!many.length) {
        reply(ic.op === "paid" ? "Ödenmemiş fatura yok." : "Ödendi işaretli fatura yok.", { engine: "local", nav: "invoices" }, viaVoice);
        return true;
      }
      waitFor("invoice");
      invAsk.current = { op: ic.op };
      const names = many.slice(0, 4).map((x) => `${x.seller} ${amountText(x)}`);
      reply(`Hangi fatura? ${names.join(", ")}${many.length > 4 ? " ve diğerleri" : ""}. Firmanın adını söyle.`, { engine: "local", expect: true }, viaVoice);
      return true;
    }
    try {
      await setInvoicePaid(profile.orgId, pick, ic.op === "paid", "hand");
      window.dispatchEvent(new Event("sa-invoices-saved"));
      done(
        ic.op === "paid"
          ? `Ödendi olarak işaretledim: ${pick.seller}, ${amountText(pick)}.${pick.taskId ? " Görevi de tamamladım." : ""}`
          : `Ödenmedi olarak işaretledim: ${pick.seller}, ${amountText(pick)}.`,
        { engine: "local", nav: "invoices" },
        viaVoice,
      );
    } catch {
      reply("Faturayı kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
    }
    return true;
  }

  // ---- Son eklenen işler (lib/assistMore.js). Geri alınamayanlar önce sorar (okFlow + onay kartı) ----
  function askOk(text, label, yes, viaVoice, word) {
    waitFor("ok");
    okFlow.current = { yes, word };
    reply(text, { engine: "local", ok: { label } }, viaVoice);
  }
  // ---- Elle yapılan diğer işler (lib/assistMore.js): fiş ödendi, gelmeyenlerin velilerine haber, alınanları temizle,
  // doğum günü / kişi silme, açık yarışta sporcu çıkarma, sonuç, ödeme, yarışı silme ve planlara ekleme, mesaj grubu kurma ----
  async function saveHereRace(r, next) {
    await saveRace(raceOrg, myUid || profile.uid, next);
    races.current = races.current.map((x) => (x.id === r.id ? next : x));
    window.dispatchEvent(new CustomEvent("sa-race-saved", { detail: next }));
  }
  async function runExtra(s, viaVoice) {
    // Yarış sayfasında: "Ali'yi yarıştan çıkar", "Ali 3. oldu", "24 tekne yarıştı", "Ali ödedi", "yarışı planlara ekle", "yarışı sil"
    const rh = curRace && racer ? raceHereCommand(s) : null;
    const r = rh ? races.current.find((x) => x.id === curRace) : null;
    if (rh && r) {
      if (rh.op === "delete") {
        askOk(`“${r.name}” yarışı silinsin mi? Bütçesi, evrak bilgisi ve notları da silinir, geri alınamaz.`, "Sil", async (v) => {
          try {
            await deleteRace(raceOrg, r.id);
            races.current = races.current.filter((x) => x.id !== r.id);
            park();
            router.push("/athletes/races");
            done(`${r.name} yarışını sildim.`, { engine: "local" }, v);
          } catch {
            reply("Yarışı silemedim.", { engine: "local" }, v);
          }
        }, viaVoice, /^sil\p{L}*[\s.!]*$/iu);
        return true;
      }
      if (rh.op === "plan") {
        const ok = await addRacePlan(saveDrafts, r, { uid: profile.uid, name: profile.name || "" }).catch(() => false);
        if (ok) await saveHereRace(r, { ...r, planAdded: true }).catch(() => {});
        if (ok) done(`${r.name} planlara eklendi.`, { engine: "local" }, viaVoice);
        else reply("Planlara ekleyemedim; yarışın tarihi yazılı mı?", { engine: "local" }, viaVoice);
        return true;
      }
      if (rh.op === "fleet") {
        await saveHereRace(r, { ...r, results: cleanResults({ ...(r.results || {}), fleet: rh.n }) });
        done(`Tekne sayısı ${rh.n} olarak yazıldı.`, { engine: "local" }, viaVoice);
        return true;
      }
      const { athletes } = await loadAthletes().catch(() => ({ athletes: [] }));
      const mine = athletes.filter((a) => (r.athleteIds || []).includes(a.id));
      const hit = rh.name ? matchPerson(rh.name, mine.map((a) => a.studentName)) : "";
      const a = hit ? mine.find((x) => x.studentName === hit) : null;
      if (!a) {
        reply(`${rh.name} bu yarışın sporcuları arasında yok.`, { engine: "local" }, viaVoice);
        return true;
      }
      try {
        if (rh.op === "remove") {
          await saveHereRace(r, { ...r, athleteIds: r.athleteIds.filter((x) => x !== a.id) });
          done(`${a.studentName} yarıştan çıkarıldı.`, { engine: "local" }, viaVoice);
        } else if (rh.op === "result") {
          const rows = { ...(r.results?.rows || {}), [a.id]: { ...(r.results?.rows?.[a.id] || {}), place: rh.place } };
          await saveHereRace(r, { ...r, results: cleanResults({ ...(r.results || {}), rows }) });
          done(`Yazdım: ${a.studentName} ${rh.place}.${r.results?.fleet ? ` / ${r.results.fleet}` : ""}.`, { engine: "local" }, viaVoice);
        } else {
          const b = r.budget || emptyBudget(r);
          const paid = { ...(b.paid || {}) };
          if (rh.paid) paid[a.id] = true;
          else delete paid[a.id];
          await saveHereRace(r, { ...r, budget: { ...b, paid } });
          done(rh.paid ? `${a.studentName} ödedi olarak işaretlendi.` : `${a.studentName} ödemedi olarak işaretlendi.`, { engine: "local" }, viaVoice);
        }
      } catch {
        reply("Yarışa kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
      }
      return true;
    }
    // Fiş ödendi (ana hesap, çalışanın fişi): "F-0012 fişini ödendi yap", "Ali'nin fişlerini ödedim"
    const rp = owner ? receiptPayCommand(s) : null;
    if (rp) {
      const want = rp.paid ? "pending" : "paid";
      let list = receipts.filter((x) => x.payStatus === want);
      if (rp.no) list = receipts.filter((x) => Number(x.no) === rp.no);
      else if (rp.who) {
        const m = matchPerson(rp.who, members);
        const u = m ? members.find((x) => x.name === m)?.uid : "";
        list = u ? list.filter((x) => x.createdByUid === u) : [];
      }
      if (!list.length) {
        reply(rp.no ? `F-${String(rp.no).padStart(4, "0")} numaralı fiş bulamadım.` : rp.paid ? "Ödeme bekleyen fiş görünmüyor." : "Ödendi işaretli fiş bulamadım.", { engine: "local", nav: "receipts" }, viaVoice);
        return true;
      }
      if (!rp.no && !rp.who && list.length > 1) {
        reply(`${list.length} fiş ödeme bekliyor. Fiş numarasıyla ya da kimin fişi olduğunu söyle (ör. “Ali'nin fişlerini ödedim”).`, { engine: "local", nav: "receipts" }, viaVoice);
        return true;
      }
      await Promise.all(list.map((x) => markPaid(x.id, rp.paid)));
      const sum = list.reduce((t, x) => t + totalTL(x), 0);
      done(`${list.length === 1 ? "Fiş" : `${list.length} fiş`} ${rp.paid ? "ödendi" : "ödeme bekliyor"} olarak işaretlendi${sum ? `, toplam ${money(sum).replace(/,00$/, "")} TL` : ""}.${rp.paid ? " Ekleyene bildirim gitti." : ""}`, { engine: "local", nav: "receipts" }, viaVoice);
      return true;
    }
    // Gelmeyenlerin velilerine haber (yoklama): uygulamadaki velilere bildirim, onayla
    const an = owner && racer ? absentNotifyCommand(s) : null;
    if (an) {
      setPhase("thinking");
      const day = an.day ? addDays(an.day) : todayStr();
      let absent;
      try {
        const { athletes } = await loadAthletes({ fresh: true });
        absent = athletes.filter((a) => isActive(a) && a.att?.[day.slice(0, 4)]?.[day.slice(5)] === "absent");
      } catch {
        reply("Yoklamayı okuyamadım.", { engine: "local" }, viaVoice);
        return true;
      }
      const linked = new Map(members.filter((m) => m.athleteId && m.status !== "left").map((m) => [m.athleteId, m.uid]));
      const ids = absent.map((a) => linked.get(a.id)).filter(Boolean);
      const when = an.day ? "Dün" : "Bugün";
      if (!absent.length) {
        reply(`${when} yoklamada gelmedi yazılan sporcu yok.`, { engine: "local" }, viaVoice);
        return true;
      }
      if (!ids.length) {
        reply(`${when} ${absent.length} sporcu gelmedi ama velileri uygulamada değil. Yoklama sayfasındaki WhatsApp düğmeleriyle haber verebilirsin.`, { engine: "local", nav: "attendance" }, viaVoice);
        return true;
      }
      askOk(`${when} gelmeyen ${absent.length} sporcudan ${ids.length} tanesinin velisine uygulamadan bildirim gitsin mi? (${absent.map((a) => a.studentName).slice(0, 6).join(", ")})`, "Gönder", async (v) => {
        try {
          const res = await authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "absent", date: day, ids }) });
          const d = await res.json().catch(() => ({}));
          done(res.ok ? `Haber verdim${d.parents ? `: ${d.parents} veli` : ""}.` : "Bildirim gönderilemedi (bugün zaten gönderilmiş olabilir).", { engine: "local" }, v);
        } catch {
          reply("Bildirim gönderilemedi.", { engine: "local" }, v);
        }
      }, viaVoice, /^gönder\p{L}*[\s.!]*$/iu);
      return true;
    }
    // Alışveriş: "alınanları temizle"
    const shopLs = listsFor(myKind, members);
    if (shopLs.length && shopClearCommand(s)) {
      const list = /ekip|kulüp/iu.test(s) && shopLs.includes("team") ? "team" : shopLs[0];
      try {
        const snap = await getDocs(query(collection(db, "orgs", profile.orgId, "shop"), where("list", "==", list)));
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const n = items.filter((i) => i.done).length;
        if (n) await clearDone(profile.orgId, items);
        done(n ? `${LISTS[list].name} listesinden alınan ${n} şeyi temizledim.` : `${LISTS[list].name} listesinde alınmış işaretli bir şey yok.`, { engine: "local", nav: "shopping" }, viaVoice);
      } catch {
        reply("Listeyi temizleyemedim.", { engine: "local" }, viaVoice);
      }
      return true;
    }
    // Doğum günü silme: "Ayşe'nin doğum gününü sil" (onayla)
    const bd = birthdayDeleteCommand(s);
    if (bd) {
      const hit = matchPerson(bd.name, birthdays.map((b) => b.name || ""));
      const b = hit ? birthdays.find((x) => x.name === hit) : null;
      if (!b) {
        reply(`${bd.name} için kayıtlı doğum günü bulamadım.`, { engine: "local" }, viaVoice);
        return true;
      }
      askOk(`${b.name} doğum günü silinsin mi?`, "Sil", (v) => {
        deleteRecord("birthday", b.id);
        done(`${b.name} doğum gününü sildim.`, { engine: "local" }, v);
      }, viaVoice, /^sil\p{L}*[\s.!]*$/iu);
      return true;
    }
    // Kişi silme (ana hesap, hesabı olmayan kişi): "Ayşe Yılmaz'ı kişilerden sil" (onayla)
    const pd = owner ? personDeleteCommand(s) : null;
    if (pd) {
      const live = members.filter((m) => m.status !== "left");
      const hit = matchPerson(pd.name, live);
      const m = hit ? live.find((x) => x.name === hit) : null;
      if (!m) {
        reply(`${pd.name} kişilerde yok.`, { engine: "local" }, viaVoice);
        return true;
      }
      if (m.account !== false) {
        reply(`${m.name} uygulamada hesabı olan biri; hesabı kapatmayı Kişiler sayfasından onun kartında yap.`, { engine: "local", nav: "people" }, viaVoice);
        return true;
      }
      askOk(`${m.name} kişilerden silinsin mi?`, "Sil", async (v) => {
        try {
          await setDoc(doc(db, "orgs", dataUid || profile.uid, "members", m.uid), { status: "left", leftAt: new Date().toISOString() }, { merge: true });
          done(`${m.name} kişilerden silindi.`, { engine: "local" }, v);
        } catch {
          reply("Kişiyi silemedim.", { engine: "local" }, v);
        }
      }, viaVoice, /^sil\p{L}*[\s.!]*$/iu);
      return true;
    }
    // Mesaj grubu kurma: "Ali, Ayşe ve Mehmet ile Yelken Ekibi adında grup kur"
    const gc = createGroup ? groupCreateCommand(s) : null;
    if (gc) {
      const words = gc.t.replace(/['’]\p{L}*/gu, " ");
      const picked = contacts.filter((c) => c.p.uid !== myUid && c.name.split(" ")[0].length > 1 && new RegExp(`(^|\\s)${c.name.split(" ")[0].toLocaleLowerCase("tr-TR")}(\\s|$|,)`, "u").test(words));
      if (!gc.name || !picked.length) {
        reply(!gc.name ? "Grubun adı ne olsun? Örnek: “Ali ve Ayşe ile Yelken Ekibi adında grup kur”." : "Gruba kimleri ekleyeyim? Adlarını söyle.", { engine: "local" }, viaVoice);
        return true;
      }
      try {
        const id = await createGroup(gc.name, picked.map((c) => c.p.uid));
        park();
        router.push(`/messages?c=${encodeURIComponent(id)}`);
        leave(`${gc.name} grubunu kurdum: ${picked.map((c) => c.name).join(", ")}.`, viaVoice);
      } catch {
        reply("Grubu kuramadım.", { engine: "local" }, viaVoice);
      }
      return true;
    }
    return false;
  }
  async function runMore(s, viaVoice) {
    if (await runExtra(s, viaVoice)) return true;
    // Yarış sayfasında otel ekleme: "otel ekle: Foça Palas, 0232 812 34 56"
    const hc = curRace && racer ? hotelAddCommand(s) : null;
    if (hc) {
      const r = races.current.find((x) => x.id === curRace);
      if (!r) return false;
      try {
        const hotels = cleanHotels([...raceHotels(r), { name: hc.name, phone: hc.phone }]);
        const next = { ...r, hotels };
        await saveRace(raceOrg, myUid || profile.uid, next);
        races.current = races.current.map((x) => (x.id === r.id ? next : x));
        window.dispatchEvent(new CustomEvent("sa-race-saved", { detail: next }));
        done(`Ekledim: ${hc.name}${hc.phone ? `, ${hc.phone}` : ""}. Özet › Konaklama'da görünür.`, { engine: "local" }, viaVoice);
      } catch {
        reply("Oteli kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
      }
      return true;
    }
    // Sporcu kartı: "Ali Kaya'nın sporcu kartını aç"
    const ao = racer ? athleteOpenCommand(s) : null;
    if (ao) {
      const { athletes } = await loadAthletes().catch(() => ({ athletes: [] }));
      const hit = matchPerson(ao.name, athletes.map((a) => a.studentName));
      const a = hit ? athletes.find((x) => x.studentName === hit) : null;
      if (!a) return false;
      park();
      router.push(`/athletes/${a.id}`);
      leave(`${a.studentName} kartını açtım.`, viaVoice);
      return true;
    }
    // Fatura: "Turkcell faturasını Ali'ye ver" (görevliye bildirim gider), "Turkcell faturasını sil" (onayla)
    const it = owner ? invoiceTaskCommand(s) : null;
    if (it) {
      let list;
      try {
        list = await loadInvoices(profile.orgId);
      } catch {
        reply("Faturaları okuyamadım.", { engine: "local" }, viaVoice);
        return true;
      }
      const { pick, list: many } = pickInvoice(it.t, list, it.op === "assign" ? "paid" : "any");
      if (!pick) {
        reply(many.length ? `Hangi fatura? ${many.slice(0, 4).map((x) => x.seller).join(", ")}. Firmanın adıyla söyle.` : "Fatura bulamadım.", { engine: "local", nav: "invoices" }, viaVoice);
        return true;
      }
      if (it.op === "delete") {
        askOk(`${pick.seller} faturası (${amountText(pick)}) dosyası ve görevi ile silinsin mi? Geri alınamaz.`, "Sil", async (v) => {
          try {
            await deleteInvoice(profile.orgId, pick);
            window.dispatchEvent(new Event("sa-invoices-saved"));
            done(`${pick.seller} faturasını sildim.`, { engine: "local", nav: "invoices" }, v);
          } catch {
            reply("Faturayı silemedim.", { engine: "local" }, v);
          }
        }, viaVoice, /^sil\p{L}*[\s.!]*$/iu);
        return true;
      }
      const who = matchPerson(it.who, members.filter((m) => m.account !== false && m.status !== "left"));
      const m = who ? members.find((x) => x.name === who && x.account !== false) : null;
      if (!m) {
        reply(`${it.who} görev verilebilecek kişiler arasında yok.`, { engine: "local" }, viaVoice);
        return true;
      }
      try {
        let inv = pick;
        if (!inv.taskId || !tasks.some((x) => x.id === inv.taskId)) inv = await ensureTask(profile.orgId, inv, { uid: profile.uid, name: profile.name || "" });
        await updateRecord("task", inv.taskId, { assignees: [m.uid] }, { name: profile.name || "" });
        window.dispatchEvent(new Event("sa-invoices-saved"));
        done(`${pick.seller} faturasının ödeme görevi ${m.name} kişisine verildi, bildirim gitti.`, { engine: "local", nav: "invoices" }, viaVoice);
      } catch {
        reply("Görevi veremedim, tekrar dene.", { engine: "local" }, viaVoice);
      }
      return true;
    }
    // Arama: "Ali'yi ara" (uygulama içi sesli arama), yarış sayfasında "oteli ara" (telefon)
    const cc = callCommand(s);
    if (cc?.hotel && curRace) {
      const r = races.current.find((x) => x.id === curRace);
      const hs = raceHotels(r).filter((h) => telOf(h.phone));
      const words = cc.who.split(" ").filter((w) => !/^otel/u.test(w));
      const h = hs.find((x) => words.some((w) => x.name.toLocaleLowerCase("tr-TR").includes(w))) || (hs.length === 1 ? hs[0] : null);
      if (!h) {
        reply(hs.length ? `Hangi otel? ${hs.map((x) => x.name).join(", ")}.` : "Bu yarışta telefonu kayıtlı otel yok. Özet › Konaklama'dan ekleyebilirsin.", { engine: "local", expect: hs.length > 1 }, viaVoice);
        return true;
      }
      askOk(`${h.name} aransın mı? ${h.phone}`, "Ara", () => {
        window.location.href = telOf(h.phone);
        done(`${h.name} aranıyor.`, { engine: "local" });
      }, viaVoice, /^ara\p{L}*[\s.!]*$/iu);
      return true;
    }
    if (cc && !cc.hotel) {
      const name = matchPerson(cc.who, contacts);
      const p = name ? contacts.find((c) => c.name === name)?.p : null;
      if (!p) return false; // kişi değil ("Turkcell'i ara"): yapay zekaya
      const peerKind = p.role === "owner" ? "owner" : kindOf(p);
      if (!startCall || !canCall(myKind, peerKind)) {
        reply(`${p.name} ile uygulamadan arama yapılamıyor.`, { engine: "local" }, viaVoice);
        return true;
      }
      if (callBusy) {
        reply("Şu an başka bir arama sürüyor.", { engine: "local" }, viaVoice);
        return true;
      }
      askOk(`${p.name} aransın mı?`, "Ara", () => {
        sp.cancel();
        tts.stop();
        startCall(p.uid);
        finish(true);
      }, viaVoice, /^ara\p{L}*[\s.!]*$/iu);
      return true;
    }
    // Aidat: "aidat hatırlatması gönder" (onayla velilere bildirim), "bu ay kim aidat ödemedi"
    const dc = owner && canSeeAthletes(profile?.email) ? duesCommand(s) : null;
    if (dc) {
      setPhase("thinking");
      const ym = todayStr().slice(0, 7);
      const month = new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long" });
      let list;
      try {
        const { cfg, months } = await loadDuesRange(profile.orgId, [ym]);
        list = unpaidRoster(cfg, months[ym]);
      } catch {
        reply("Aidat kayıtlarını okuyamadım.", { engine: "local" }, viaVoice);
        return true;
      }
      if (dc.op === "ask" || !list.length) {
        const names = list.map((x) => x.a.studentName);
        reply(
          !list.length ? `${month} aidatını ödemeyen sporcu görünmüyor.` : `${month} aidatını ${names.length} sporcu ödemedi: ${names.slice(0, 10).join(", ")}${names.length > 10 ? " ve diğerleri" : ""}.`,
          { engine: "local", nav: "dues" },
          viaVoice,
        );
        return true;
      }
      const linked = new Map(members.filter((m) => m.athleteId && m.status !== "left").map((m) => [m.athleteId, m.uid]));
      const inApp = list.filter((x) => linked.has(x.a.id));
      if (!inApp.length) {
        reply(`${list.length} sporcu ödemedi ama velileri uygulamada değil. Aidatlar sayfasından WhatsApp ile hatırlatabilirsin.`, { engine: "local", nav: "dues" }, viaVoice);
        return true;
      }
      askOk(`${month} aidatını ödemeyen ${inApp.length} sporcunun velisine uygulamadan hatırlatma gitsin mi?`, "Gönder", async (v) => {
        setPhase("thinking");
        try {
          const res = await authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "dues", ym, ids: inApp.map((x) => linked.get(x.a.id)) }) });
          const d = await res.json().catch(() => ({}));
          const at = new Date().toISOString();
          await setDoc(doc(db, "orgs", profile.orgId, "dues", ym), { reminded: Object.fromEntries(inApp.map((x) => [x.a.id, at])) }, { merge: true }).catch(() => {});
          done(d.parents ? `Hatırlatma ${d.parents} veliye gitti.` : "Bu ay hatırlatılmamış, uygulamada bağlı veli kalmadı.", { engine: "local", nav: "dues" }, v);
        } catch {
          reply("Hatırlatma gönderilemedi.", { engine: "local" }, v);
        }
      }, viaVoice, /^gönder\p{L}*[\s.!]*$/iu);
      return true;
    }
    // Nakit gelir (Hesaplar): "Ali Kaya'nın ekim aidatı nakit 1500 alındı", "Ahmet'ten 2000 lira bağış geldi"
    const ic = owner ? incomeCommand(s, todayStr()) : null;
    if (ic) {
      setPhase("thinking");
      const date = todayStr();
      try {
        if (ic.cat === "Aidat") {
          const { roster, cfg } = await loadCash(profile.orgId);
          const name = ic.who ? matchPerson(ic.who, roster.map((a) => a.studentName)) : "";
          const a = name ? roster.find((x) => x.studentName === name) : null;
          if (!a) {
            reply(ic.who ? `${ic.who} aidat listesinde yok. Hangi sporcunun aidatı?` : "Hangi sporcunun aidatı? Adını söyler misin?", { engine: "local" }, viaVoice);
            return true;
          }
          const amount = ic.amount || feeOf(a, cfg);
          if (!amount) {
            reply(`${a.studentName} ne kadar ödedi? Aidat tutarı ayarlı değil.`, { engine: "local" }, viaVoice);
            return true;
          }
          await addIncome(profile.orgId, { cat: "Aidat", who: a.studentName, athleteId: a.id, ym: ic.ym, amount, date });
          const m = new Date(`${ic.ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long" });
          done(`Ekledim: ${a.studentName}, ${m} aidatı, nakit ${money(amount).replace(/,00$/, "")} TL. Aidatlar'da ödendi görünür.`, { engine: "local", nav: "accounts" }, viaVoice);
          return true;
        }
        await addIncome(profile.orgId, { cat: ic.cat, who: ic.who, amount: ic.amount, date, note: ic.note });
        done(`Ekledim: ${ic.cat} geliri${ic.who ? `, ${ic.who}` : ""}, ${money(ic.amount).replace(/,00$/, "")} TL. Hesaplar'da görünür.`, { engine: "local", nav: "accounts" }, viaVoice);
      } catch {
        reply("Geliri kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
      }
      return true;
    }
    // Sporcu: ekle (hemen), arşive al / çıkar (hemen), sil (onayla)
    const ac = owner && canSeeAthletes(profile?.email) ? athleteCommand(s) : null;
    if (!ac) return false;
    if (ac.op === "add" && !ac.name) {
      reply("Yeni sporcunun adı soyadı ne?", { engine: "local", expect: true }, viaVoice);
      waitFor("athlete");
      athAsk.current = true;
      return true;
    }
    setPhase("thinking");
    let athletes;
    try {
      ({ athletes } = await loadAthletes({ fresh: true }));
    } catch {
      reply("Sporcu listesini okuyamadım.", { engine: "local" }, viaVoice);
      return true;
    }
    const low = (x) => String(x || "").toLocaleLowerCase("tr-TR");
    // "onu arşive al", "bunu sil": sohbette az önce konuşulan sporcu
    const name = isPronoun(ac.name) ? memo.current.athlete || "" : ac.name;
    const hit = name ? matchPerson(name, athletes.map((a) => a.studentName)) : "";
    const a = hit ? athletes.find((x) => x.studentName === hit) : null;
    if (a) memoSet("athlete", a.studentName);
    if (ac.op === "add") {
      const same = athletes.find((x) => low(x.studentName) === low(ac.name));
      if (same) {
        reply(`${same.studentName} zaten sporcularda${isActive(same) ? "" : " (arşivde; “arşivden çıkar” diyebilirsin)"}.`, { engine: "local" }, viaVoice);
        return true;
      }
      stepTo("Sporcu ekleniyor");
      try {
        const id = await createAthlete({ studentName: ac.name, studentBirthDate: ac.birth });
        memoSet("athlete", ac.name);
        await linkMember(dataUid || profile.uid, members, { id, name: ac.name, birth: ac.birth }).catch(() => {});
        stepsEnd();
        done(`Ekledim: ${ac.name}${ac.birth ? `, ${ac.birth.slice(0, 4)} doğumlu` : ""}. Sınıfını ve veli bilgisini sporcu kartından tamamlayabilirsin.`, { engine: "local", nav: "athletes" }, viaVoice);
      } catch (e) {
        stepsEnd(false);
        reply(e?.code === "permission-denied" ? "Kulüp hesabının sporcu ekleme izni yok." : "Sporcuyu ekleyemedim.", { fail: true, engine: "local" }, viaVoice);
      }
      return true;
    }
    if (!a) {
      if (!ac.explicit) return false; // sporcu adı değil: başka iş (yapay zekaya)
      reply(`${ac.name} adında sporcu bulamadım.`, { engine: "local" }, viaVoice);
      return true;
    }
    if (ac.op === "archive" || ac.op === "unarchive") {
      const on = ac.op === "archive";
      if (isActive(a) !== on) {
        reply(on ? `${a.studentName} zaten arşivde.` : `${a.studentName} arşivde değil.`, { engine: "local" }, viaVoice);
        return true;
      }
      try {
        await setArchived(a, on, { classes: [], coaches: [] });
        done(on ? `${a.studentName} arşive alındı; yoklama ve aidat listesinde görünmez.` : `${a.studentName} arşivden çıkarıldı.`, { engine: "local", nav: "athletes" }, viaVoice);
      } catch {
        reply("Kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
      }
      return true;
    }
    askOk(`${a.studentName} sporculardan tamamen silinsin mi? Geçmişiyle birlikte silinir, geri alınamaz. İstersen arşive de alabilirim.`, "Sil", async (v) => {
      setPhase("thinking");
      try {
        await deleteAthlete(a.id);
        try {
          await unlinkMembers(dataUid || profile.uid, members, a.id);
          birthdays.filter((b) => b.athleteId === a.id).forEach((b) => deleteRecord("birthday", b.id));
        } catch {}
        done(`${a.studentName} silindi.`, { engine: "local", nav: "athletes" }, v);
      } catch (e) {
        reply(e?.code === "permission-denied" ? "Kulüp hesabının sporcu silme izni yok." : "Silemedim, tekrar dene.", { fail: true, engine: "local" }, v);
      }
    }, viaVoice, /^sil\p{L}*[\s.!]*$/iu);
    return true;
  }

  async function runPayee(pq, viaVoice) {
    setPhase("thinking");
    try {
      const { movements } = await loadMovementsRange(profile.uid, pq.ym, pq.ym);
      const payee = payeeOf(profile);
      reply(payeeAnswer(payeeMoves(movements, payee), payee, pq.ym, todayStr().slice(0, 7)), { engine: "local", nav: "payments" }, viaVoice);
    } catch {
      reply("Banka hareketlerini okuyamadım.", { engine: "local" }, viaVoice);
    }
  }

  async function runShopRead(list, viaVoice) {
    try {
      const snap = await getDocs(query(collection(db, "orgs", profile.orgId, "shop"), where("list", "==", list)));
      const open = snap.docs.map((d) => d.data()).filter((x) => !x.done).map((x) => x.text);
      reply(open.length ? `${LISTS[list].name} listesinde ${open.length} şey var: ${open.slice(0, 12).join(", ")}${open.length > 12 ? " ve diğerleri" : ""}.` : `${LISTS[list].name} listesi boş.`, { engine: "local", nav: "shopping" }, viaVoice);
    } catch {
      reply("Listeyi okuyamadım.", { engine: "local" }, viaVoice);
    }
  }

  // ---- Yoklama (asistandan) ----
  // rest: cümledeki diğer işler ({ s, history }); yoklama kaydedilince (ya da onay kartında vazgeçilince) yapay zekaya gider
  async function runAttendance(s, viaVoice, rest = null) {
    const id = ++runId.current;
    setPhase("thinking");
    setSteps([]);
    try {
      const r = await parseAttendance(s, nameIdx, stepTo);
      if (id !== runId.current) return;
      const n = Object.keys(r.changes).length;
      if (!n) {
        stepsEnd(false);
        // Cümle yoklama değil de başka işmiş (yoklama sayfasında "Ali'ye geldi mi diye sor"): yapay zekaya gider
        if (rest) return void askAI(rest.s, rest.s, viaVoice, rest.history, false);
        return reply(r.message || (r.unknown.length ? `Şu adları sporcularda bulamadım: ${r.unknown.join(", ")}.` : "Kimseyi eşleştiremedim. Adları bir daha söyler misin?"), { engine: "ai", nav: "attendance", expect: true }, viaVoice);
      }
      // Bulunamayan ad varsa kaydetmeden sor
      if (r.unknown.length) {
        stepsEnd();
        return reply(`${r.unknown.join(", ")} adını bulamadım. ${attSummary(r)}. Bunları kaydedeyim mi?`, { pending: { att: r, rest }, att: { ...r, saved: false }, engine: "ai", expect: true }, viaVoice);
      }
      await saveAtt(r, viaVoice);
      if (rest) restAfterAtt(rest, viaVoice, `Yoklama kaydedildi (${attSummary(r)}).`);
    } catch (e) {
      if (id !== runId.current) return;
      stepsEnd(false);
      const denied = e.code === "permission-denied";
      reply(denied ? "Kulüp hesabına bağlı değilsin. Yoklama sayfasından bir kez bağlanman gerekiyor." : e.message || "Yoklama yapılamadı.", { fail: true, engine: "local", nav: "attendance" }, viaVoice);
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }
  // follow: yeni yarışın tarih/sporcu sorusuna cevap ({ id, n }): o yarışa yazılır
  async function runRace(s, viaVoice, follow = null) {
    const id = ++runId.current;
    setPhase("thinking");
    setSteps([]);
    try {
      const orgId = profile?.orgId || myUid;
      const r = await runRaceCommand(s, { idx: nameIdx, orgId, uid: myUid, saveDrafts, by, current: follow?.id || curRace || chainRace.current, follow: follow ? follow.n + 1 : 0 }, stepTo);
      if (id !== runId.current) return;
      // Yarış sayfasında söylenen cümle yarışla ilgili çıkmadıysa her zamanki yoldan sorulur
      if (r.none) {
        setPhase("idle");
        setSteps([]);
        setTurns((p) => (p.at(-1)?.role === "user" ? p.slice(0, -1) : p));
        skipRace.current = true;
        if (planOn.current) chainStep.current = true;
        return run(s, viaVoice);
      }
      stepsEnd(!r.expect || r.follow);
      if (!r.expect || r.follow) {
        navigator.vibrate?.([10, 40, 10]);
        toast("Yarış kaydedildi");
      }
      if (r.id) {
        chainRace.current = r.id;
        if (raceOrg) races.current = await loadRaces(raceOrg).catch(() => races.current);
        memoSet("race", races.current.find((x) => x.id === r.id)?.name);
      }
      if (r.follow) waitFor("raceFollow"), (raceFollow.current = { id: r.id, n: follow ? follow.n + 1 : 0 });
      reply(r.said, { engine: "ai", nav: curRace ? "" : "races", expect: !!r.expect }, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      stepsEnd(false);
      const denied = e.code === "permission-denied";
      reply(denied ? "Kulüp hesabına bağlı değilsin. Sporcular sayfasından bir kez bağlanman gerekiyor." : e.message || "Yarış kaydedilemedi.", { fail: true, engine: "local", nav: "races" }, viaVoice);
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }
  // Instagram gönderisi: söylenen yarış bulunursa sporcularıyla bağlanır; gönderi ekranı açılınca yapay zeka yazar (POST_ASK_KEY)
  async function startPost(s, viaVoice) {
    const id = ++runId.current;
    setPhase("thinking");
    setSteps([]);
    let r = null;
    try {
      if (racer) {
        stepTo("Yarış aranıyor");
        if (raceOrg && !races.current.length) races.current = await loadRaces(raceOrg).catch(() => []);
        r = raceRef(s, races.current, todayStr(), chainRace.current || curRace)?.race || null;
        if (r) {
          stepTo("Sporcular alınıyor");
          const data = await loadAthletes().catch(() => null);
          if (data) r = raceWithAthletes(r, data);
        }
      }
      if (id !== runId.current) return;
      stepsEnd();
      try {
        if (r) sessionStorage.setItem(RACE_KEY, JSON.stringify(r));
        sessionStorage.setItem(POST_ASK_KEY, s);
      } catch {}
      record(s, "nav:posts", "local");
      memoSet("post", r ? `${r.name} gönderisi` : "yeni gönderi");
      router.push("/posts/new");
      leave(r ? `${r.name} için gönderiyi açtım, yazıları yapay zeka yazıyor. Değiştirmek istediğini söyle.` : "Gönderiyi açtım, yazıları yapay zeka yazıyor. Değiştirmek istediğini söyle.", viaVoice);
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }
  // Açık gönderi ekranındaki değişiklik (PostEditor setPostHandler)
  async function runPost(s, viaVoice) {
    const id = ++runId.current;
    setPhase("thinking");
    setSteps([]);
    const h = postHandler();
    stepTo(wantsPostImage(s) ? "Görsel çiziliyor" : "Gönderi yazılıyor");
    try {
      const r = await h.ask(s);
      if (id !== runId.current) return;
      stepsEnd();
      reply(r.say, { engine: "ai" }, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      stepsEnd(false);
      reply(e?.message || "Gönderiyi değiştiremedim.", { fail: true, engine: "local" }, viaVoice);
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }
  // Antrenman günlüğü: anlatılan → alanlar; tarih yoksa sorulur (bir kez), varsa günün antrenmanına yazılır
  async function runLog(text, viaVoice, { date = "", time = "", planId = "", retry = false } = {}) {
    const id = ++runId.current;
    setPhase("thinking");
    setSteps([]);
    stepTo(taskOf("log").work);
    try {
      const r = await askLog({ text, date });
      if (id !== runId.current) return;
      if (!r.log) {
        setSteps([]);
        reply("Günlüğe yazılacak bilgi duymadım. Rüzgârı, çalışılanları ya da nasıl geçtiğini söyler misin?", { engine: "ai", expect: true }, viaVoice);
        waitFor("log");
        logFlow.current = { collect: true, text, date, time, planId };
        return;
      }
      if (!r.date) {
        setSteps([]);
        reply(retry ? "Günü anlayamadım. “Bugün”, “dün” ya da “3 Ekim” gibi söyler misin?" : "Hangi günün antrenmanı? Bugün, dün ya da gün adını söyle.", { engine: "ai", expect: true }, viaVoice);
        waitFor("log");
        logFlow.current = { ask: true, text };
        return;
      }
      // Katılanlar ↔ yoklama: söylenenler o gün "geldi" olur, yoklamada gelenler günlüğe girer (sporcu yetkisi olanda)
      let att = null;
      if (racer && myUid) {
        stepTo("Yoklamayla eşleştiriliyor");
        att = await syncAttendance(r.log, r.date, { orgId: myUid, members });
        if (id !== runId.current) return;
        r.log = att.log;
      }
      stepTo("Günlüğe yazılıyor");
      const sv = await saveLog({ plans, updateRecord, saveDrafts, isLocked }, { ...r, time: r.time || time, planId: r.date === date ? planId : "" }, by, viaVoice || convo.current ? "voice" : "manual");
      if (id !== runId.current) return;
      if (sv.error) {
        stepsEnd(false);
        return reply(sv.error, { engine: "local" }, viaVoice);
      }
      stepsEnd();
      navigator.vibrate?.([10, 40, 10]);
      toast("Günlük kaydedildi");
      const more = missingOf(sv.log).length > 0;
      const attSay = att ? attLine(att) : "";
      reply(`${logReply(sv.log, r.date, todayStr(), sv.fresh)}${attSay ? ` ${attSay}` : ""}`, { show: sv.id ? [{ kind: "plan", id: sv.id }] : [], nav: "training", engine: "ai", expect: more }, viaVoice);
      if (more) logFlow.current = { date: r.date, time: r.time || time, planId: sv.id };
    } catch (e) {
      if (id !== runId.current) return;
      stepsEnd(false);
      reply(`${e.message || "Günlük yazılamadı."} Antrenman günlüğü sayfasından elle de yazabilirsin.`, { fail: true, engine: "local", nav: "training" }, viaVoice);
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }
  // Etkinlik planı: yapay zeka yer/zaman eksikse soru döner (general false), yoksa plan; plan Etkinlikler'e kaydedilir
  async function runEvent(text, viaVoice, general, lead = "") {
    const id = ++runId.current;
    setPhase("thinking");
    setSteps([]);
    stepTo(general ? taskOf("event").work : "Etkinlik inceleniyor");
    try {
      const p = await askPlan({ text, general });
      if (id !== runId.current) return;
      if (p.ask?.length) {
        setSteps([]);
        waitFor("event");
        eventFlow.current = { text, turns: null };
        return reply(`${p.question} Bilmiyorsan “genel plan yap” de.`, { event: { asking: true, kind: p.event?.kind || kindFromText(text), text }, engine: "ai", expect: true }, viaVoice);
      }
      stepTo("Etkinliklere kaydediliyor");
      const ev = p.event;
      const nid = await saveEvent(profile?.orgId || myUid, profile?.uid || myUid, ev);
      stepsEnd();
      navigator.vibrate?.([10, 40, 10]);
      toast("Etkinlik kaydedildi");
      const counts = countsText(ev);
      const first = (ev.summary.match(/^[^.!?]+[.!?]/) || [""])[0];
      reply(`${lead}${ev.title} planını hazırladım ve Etkinlikler'e kaydettim${counts ? `: ${counts}` : ""}. ${first}`.trim(), { event: { ...ev, id: nid, saved: true }, engine: "ai" }, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      stepsEnd(false);
      reply(`${e.message || "Plan hazırlanamadı."} Etkinlikler sayfasından elle de ekleyebilirsin.`, { fail: true, engine: "local", nav: "events" }, viaVoice);
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }
  // Envanter: hedef envanter (cümlede adı geçen, açık sayfadaki, son kullanılan, yoksa kulüp) seçilir, yapay zeka işlemleri verir
  async function runInventory(s, viaVoice) {
    const id = ++runId.current;
    const org = profile?.orgId || myUid;
    setPhase("thinking");
    setSteps([]);
    stepTo(inventoryWork(s));
    try {
      const list = await loadInventories(org);
      let inv = pickInv(s, list, { here: invHere, last: lastInv() });
      if (!inv) throw new Error("Envanter bulunamadı.");
      const r = await askInventory(s, inv, list.filter((x) => x.id !== inv.id).map((x) => x.name));
      if (id !== runId.current) return;
      if (r.newInv) {
        stepTo("Yeni envanter açılıyor");
        inv = await createInventory(org, r.newInv.name, r.newInv.kind, list.length + 1);
      }
      setLastInv(inv.id);
      const plan = applyOps(inv, r.ops, { by: profile?.name || "" });
      if (plan.changed) {
        stepTo("Envantere kaydediliyor");
        inv = await changeInventory(org, inv.id, (cur) => applyOps(cur, r.ops, { by: profile?.name || "" }).inv);
      }
      if (id !== runId.current) return;
      stepsEnd();
      const card = { id: inv.id, name: inv.name, kind: inv.kind, sub: statsText(inv) };
      const said = [r.newInv ? `Yeni envanter açtım: ${inv.name}.` : "", ...plan.lines].filter(Boolean).join(" ");
      if (plan.changed) {
        navigator.vibrate?.([10, 40, 10]);
        toast("Envanter kaydedildi");
      }
      if (plan.deletes.length) {
        waitFor("inv");
        invFlow.current = { org, id: inv.id, name: inv.name, kind: inv.kind, ask: plan.deletes };
        const q = `${plan.deletes.map((x) => `“${itemLabel(x)}”`).join(", ")} envanterden silinsin mi?`;
        return reply(`${said} ${q}`.trim(), { inv: { ...card, ask: plan.deletes }, engine: "ai", expect: true }, viaVoice);
      }
      if (!said) return reply(r.message || "Envanterde bir değişiklik yapmadım. Ne eklememi ya da çıkarmamı istersin?", { inv: card, engine: "ai", expect: !r.message }, viaVoice);
      done(`${said}${r.message && /\?\s*$/.test(r.message) ? ` ${r.message}` : ""}`, { inv: card, engine: "ai" }, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      stepsEnd(false);
      reply(`${e.message || "Envanter işlenemedi."} Envanter sayfasından elle de ekleyebilirsin.`, { fail: true, engine: "local", nav: "inventory" }, viaVoice);
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }
  async function invDelete(f, viaVoice = false) {
    invFlow.current = null;
    try {
      const inv = await changeInventory(f.org, f.id, (cur) => f.ask.reduce((v, x) => dropItem(v, x.id, { by: profile?.name || "" }), cur));
      toast("Envanterden silindi");
      f.ask.flatMap((x) => x.files || []).forEach((m) => dropInvFile(f.org, m));
      done(`Sildim: ${f.ask.map((x) => x.name).join(", ")}.`, { inv: { id: f.id, name: inv.name, kind: inv.kind, sub: statsText(inv) }, engine: "local" }, viaVoice);
    } catch {
      toast("Silinemedi");
      reply("Silemedim, bağlantını kontrol edip tekrar dene.", { engine: "local" }, viaVoice);
    }
  }
  async function eventDelete(e) {
    try {
      await deleteEvent(profile?.orgId || myUid, e.id);
      toast("Etkinlik silindi");
      reply(`Sildim, “${e.title}” artık Etkinlikler'de yok.`, { event: { ...e, deleted: true }, engine: "local" });
    } catch {
      toast("Silinemedi");
    }
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

  // Yoklamadan sonra cümledeki diğer işler: yoklama cevabı okunup bitince yapay zekaya (görev listesi) gider
  async function runSchedule(s, viaVoice) {
    const id = ++runId.current;
    ctrl.current?.abort();
    setPhase("thinking");
    setSteps([]);
    stepTo("Ders programı hazırlanıyor");
    try {
      const current = lessons.filter((l) => l.createdByUid === dataUid).map(({ title, day, start, end, place, teacher }) => ({ title, day, start, end, place, teacher }));
      const r = await askSchedule({ text: s, current });
      if (id !== runId.current) return;
      stepsEnd(true);
      if (!r.lessons?.length) return reply(r.message || "Ders bulamadım. Gün, saat ve dersi söyler misin?", { engine: "ai", expect: true }, viaVoice);
      showSchedule(r);
      if (path !== "/schedule") router.push("/schedule");
      reply(`${(r.message || `${r.lessons.length} ders hazırladım.`).trim()} Önizlemeyi açtım, kontrol edip kaydet.`, { engine: "ai" }, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      stepsEnd(false);
      reply(e.message || "Ders programı hazırlanamadı.", { fail: true, engine: "ai" }, viaVoice);
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }

  async function restAfterAtt(rest, viaVoice, done) {
    const id = runId.current;
    for (let i = 0; i < 80 && (sayQ.current.busy || speakingRef.current); i++) await new Promise((ok) => setTimeout(ok, 150)); // en çok 12 sn
    if (id !== runId.current) return; // bu arada başka bir şey söylendi
    askAI(rest.s, `${rest.s}\n(${done} Yoklamayı yeniden yapma; cümledeki diğer işleri yap.)`, viaVoice, rest.history, false);
  }

  async function saveAtt(r, viaVoice) {
    stepTo("Yoklama kaydediliyor");
    await applyAttendance(myUid, members, r.date, r.changes);
    stepsEnd();
    navigator.vibrate?.([10, 40, 10]);
    toast("Yoklama kaydedildi");
    reply(`Kaydettim. ${attSummary(r)}.`, { att: { ...r, saved: true }, engine: "ai" }, viaVoice);
  }
  async function undoAtt(r) {
    setSteps([]);
    stepTo("Yoklama geri alınıyor");
    try {
      await applyAttendance(myUid, members, r.date, r.prev);
      stepsEnd();
      toast("Geri alındı");
      reply("Geri aldım; yoklama önceki haline döndü.", { engine: "local" });
    } catch (e) {
      stepsEnd(false);
      toast(e.message || "Geri alınamadı");
    }
  }

  // Bekleyen isteği bırak, metni geri getir
  function abort() {
    const t = heard;
    cancelRun();
    setTurns((p) => p.slice(0, -1));
    setText(t);
  }

  // Sohbeti bitir: panel kapanır, konuşma temizlenir
  function finish(keepSpeech = false) {
    sp.cancel();
    cancelRun();
    if (!keepSpeech) clearSay();
    if (!keepSpeech) tts.stop();
    convo.current = false;
    queue.current = [];
    askAll.current = "";
    chain.current = [];
    chainGen.current++;
    waitFor(); // sohbet bitti: bekleyen soru kalmaz (yeni sohbetteki ilk cümle eski soruya cevap sayılmasın)
    memo.current = {};
    chainRace.current = ""; // sohbet bitti: yeni sohbette yarış adla, "son yarış" ya da "sıradaki yarış" diye söylenir
    planOn.current = false;
    setPlan([]);
    msgDraft.current = null; // sohbet bitti: bağlam sıfırlanır
    onClose();
  }

  const docked = open; // tek görünüm: açıkken konuşma hep kubbede
  // Sahneye canlı durum: dinliyor mu, ne duyuldu, son cevap, düşünüyor mu
  const lastReply = [...turns].reverse().find((x) => x.role === "assistant")?.text || "";
  const heardNow = `${sp.finalText || ""}${sp.interim || ""}`.trim();
  // Şu an yapılan iş (kubbede kürenin altında, ortada): sürmekte olan adım, işin yazısı ("WhatsApp mesajı hazırlanıyor")
  // ya da iş belli olana kadar "Sesin yazıya çevriliyor" / "Anlaşılıyor". Yanıt akarken ya da Chrome'da söz görünürken yok.
  const stepNow = steps.find((x) => x.st === "run")?.label || "";
  // Beklerken sıralı yazılar (adım sürmüyorsa): işin adı hemen, yanıt gecikirse hazır yazılar sırayla (WaitLines.jsx)
  const waiting = (busy || transcribing) && !streamText && !(transcribing && heardNow); // ara adımlar (stepTo) görünmez, yerine sıralı yazılar
  // Görev listesi sürerken süren iş listede parlıyor: aynı ad bilgi alanında ikinci kez yazılmaz
  const planRun = plan.some((x) => x.st === "run");
  const wait = useWaitLines(waiting && !(planRun && busy), busy ? work : "", !busy && transcribing);
  const workNow = (busy || transcribing) && !streamText && !(transcribing && heardNow) ? stepNow || wait?.now || "" : "";
  // Canlı yazıda (Chrome) "kapat" duyulunca konuşma bitişi beklenmez: dinleme hemen durur, asistan sessizce kapanır
  useEffect(() => {
    if (open && listening && isCloseNow(heardNow)) finish();
  }, [open, listening, heardNow]); // eslint-disable-line react-hooks/exhaustive-deps
  // heard yalnız o an duyulan: gönderilen söz zaten balon olarak akışta (yanıt beklenirken açılan mikrofonda yeniden gösterilmez)
  useEffect(() => {
    onLive?.({ open, docked, listening, transcribing, busy, heard: heardNow, lastReply, speaking: tts.speaking, booting, talked: turns.length > 0, status: workNow });
  }, [onLive, open, docked, listening, transcribing, busy, heardNow, lastReply, tts.speaking, booting, turns.length, workNow]);
  // Sahnenin düğmeleri buradaki işleri çağırır
  const stageListen = () => {
    convo.current = true;
    clearSay();
    tts.stop();
    sp.start(listenOpts(false));
  };
  useEffect(() => {
    onAct?.({
      listen: stageListen,
      stop: () => sp.stop("send"),
      cancel: () => sp.cancel(),
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
      // Kapanma animasyonu bitince temizle: bir sonraki açılışta eski konuşma görünmesin
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
      chips: cards.pending?.actions || cards.pending?.att ? [{ label: "Onayla", onPick: () => confirmPending() }, { label: "Vazgeç", onPick: () => cancelPending() }] : [], // mesaj kartının kendi düğmeleri var
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

        <Thread turns={turns} engine={cards.engine} tts={tts} ask={askObj} canFix={false} onFix={() => { }} extra={(t, i) => turnLinks(t, i, embedded)} />

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
              <li key={i} className={`flex items-center gap-2 ${x.st === "run" ? "font-medium" : x.st === "done" ? "text-mut" : x.st === "fail" ? "text-rec" : "text-mut/50"}`}>
                <span className="grid size-4 shrink-0 place-items-center">
                  {x.st === "done" ? <Icon name="check" className="size-4 text-acc [stroke-width:2.5]" /> : x.st === "fail" ? <Icon name="x" className="size-4 [stroke-width:2.5]" /> : <span className={`size-1.5 rounded-full ${x.st === "run" ? "bg-acc" : "bg-mut/40"}`} />}
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
  return slot ? createPortal(<div className="pb-1 text-[1rem]">{convoView(true)}</div>, slot) : null;
}
