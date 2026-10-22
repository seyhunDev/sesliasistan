"use client";
// Asistanın durumu ve beyni: konuşma, dinleme, yanıtlar, görev listesi (ekran AssistantSheet.jsx'te)
import { saveSessionLog } from "@/lib/assistLog";
import { applyFixes, loadFixes } from "@/lib/sttFixes";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { useTts } from "@/features/speech/TtsProvider";
import { useSpeech } from "@/hooks/useSpeech";
import { assigneesInText, fixNames, namesToUids, uidsToNames } from "@/lib/names";
import { check, firstNeed } from "@/features/add/drafts";
import { rel, todayStr } from "@/lib/utils/format";
import { seriesDates } from "@/lib/repeat";
import { pastTense } from "@/lib/assistTasks";
import { useWaitLines } from "./WaitLines";
import { ASK_EMPTY, PAST_MS, asksToClear, remember, sessionOf, sessionsFor } from "@/lib/convoContext";
import { PAST_CLEAR, loadSessions, pastShown, saveSession } from "@/lib/sessionStore";
import { canSeeAthletes } from "@/features/athletes/access";
import { raceNames } from "@/features/athletes/raceNames";
import { loadRaces } from "@/features/athletes/races";
import { athleteNames, byId, isActive, loadAthletes } from "@/features/athletes/data";
import { useCall } from "@/features/call/CallProvider";
import { useNameIndex } from "@/features/athletes/names";
import { useKind } from "@/features/auth/useKind";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { PAGES, isCloseNow, isEnd } from "@/lib/assistantLocal";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useChat } from "@/features/chat/ChatProvider";
import { unglue } from "@/lib/speech/normalize";
import { GROUPS, canReceipts, isAthleteSide, waPhone } from "@/lib/kinds";
import { extraNote } from "@/lib/steps";
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

export const SILENCE_MS = 0; // Otomatik kapanma kapalı
// Dokun-konuş-dokun-gönder (Seyhun, 2026-10-06: "ChatGPT, Claude gibi; şimdilik canlı dinleme yok"): küreye dokununca
// dinler, söylenen ekranda yazılır, yeniden dokununca gönderilir. Cevaptan sonra ya da yapay zeka düşünürken mikrofon
// kendiliğinden açılmaz, sessizlikte kendiliğinden gönderilmez. Eller serbest sohbete dönmek için true.
export const HANDS_FREE = false;
// Eller serbest sohbette: konuşma bitince (bu kadar sessizlikte) söylenen kendiliğinden gönderilir; kısa duraksama kesmez
export const ENDPOINT = HANDS_FREE ? 1500 : 0; // canlı yazı yolunda konuşma bitişi (devam edilirse öncekine eklenir)
export const listenOpts = (auto) => (HANDS_FREE ? { autoStop: SILENCE_MS, auto, endpoint: ENDPOINT, handsFree: true } : {});
export const clock = () => Date.now(); // konuşma kuyruğu zamanlaması (olay anında çağrılır)
export const EMPTY = { show: [], pending: null, nav: "", chat: "", share: "", att: null, engine: "", awaiting: false, races: [], person: null, event: null };
// Biten adım geçmiş zamanla yazılır ("Yoklama kaydediliyor" → "Yoklama kaydedildi")
export const PAST = [[/ekleniyor$/, "eklendi"], [/yükleniyor$/, "yüklendi"], [/eşleştiriliyor$/, "eşleştirildi"], [/kaydediliyor$/, "kaydedildi"], [/hazırlanıyor$/, "hazırlandı"], [/inceleniyor$/, "incelendi"], [/gönderiliyor$/, "gönderildi"], [/alınıyor$/, "alındı"]];
export const pastOf = (s) => pastTense(PAST.reduce((t, [re, to]) => t.replace(re, to), s));
// Sohbeti bitiren sözler ("bitir", "kapat", "tamam teşekkürler", "şimdilik bu kadar")
export const KIND_ICON = { plan: "cal", task: "task", note: "note" };
export const AUTO_MS = 3000; // hazırlanan kayıt / mesaj bu kadar sonra kendiliğinden yapılır (kartta dolan çizgi)

// Ekrandan kalkan konuşma (keepPast): son 12 tur, taslak ve hafızayla birlikte, saklandığı an
export const recentPast = (p) => Date.now() - p.at < PAST_MS;
export const pastSnap = (prev, list, msgDraft, memo) => ({ turns: [...prev, ...list.filter((t) => t && !t.pre)].slice(-12), at: Date.now(), msgDraft, memo });

// Saat (render dışında, olay ve etkilerde çağrılır)
const nowMs = () => Date.now();

export function useAssistant({ open, onClose, seed, onLive, onAct }) {
  const ctx = {}; // taşınan işlerin bağlamı (sonda doldurulur)
  const router = useRouter();
  const path = usePathname();
  const toast = useToast();
  const tts = useTts();
  const { profile } = useAuth();
  const { openBirthday } = useBirthday();
  const { plans, fitOthers = [], tasks, notes, receipts, birthdays, lessons = [], myUid: dataUid, toggleTask, updateRecord, deleteRecord, deleteSeries, rejectDelete, markPaid, setReceiptScope, members, allMembers, isStaff, saveDrafts, saveBirthday, isLocked } = useData();
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
  const { people: chatPeople = [], send: chatSend, remove: chatRemove, restore: chatRestore, purge: chatPurge, archive: chatArchive, deleteChat: chatDelete, chatRef, uid: myUid, groupIds = [], chats = [], createGroup } = useChat() || {};
  const { startCall, busy: callBusy } = useCall() || {}; // "Ali'yi ara": uygulama içi sesli arama
  const contacts = chatPeople.map((p) => ({ name: p.name || "", aliases: p.role === "owner" ? ["ana hesap", "patron"] : [], p })).filter((c) => c.name);
  // Mesajlar'da kurulan gruplar (üyesi olduklarım) da alıcıdır
  const myGroups = chats.filter((c) => c.type === "group" && c.name).map((c) => ({ id: c.id, name: c.name }));
  // Kişilerde olup uygulamada hesabı olmayanlar (yalnız ana hesap): telefonu varsa mesaj WhatsApp'la gider
  const waPeople = members.filter((m) => m.account === false && m.name && waPhone(m.phone) && !contacts.some((c) => c.name === m.name)).map((m) => ({ name: m.name, wa: waPhone(m.phone) }));
  const contactNames = [
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
  const webFail = useRef(false); // bu açılışta telefonun tanıması yazı vermedi: kapanana kadar kayıt yolu
  const sp = useSpeech({
    noLevel: true, // ses seviyesi dalgaya (ListenWave) doğrudan gider; burada saniyede 10 yeniden çizim olmasın
    live: true, // kayıt yolunda dinlerken yazı Gemini Live akışından anında gelir (Claude uygulaması gibi; Seyhun, 2026-10-21)
    hold: true, // asistan açıkken aynı mikrofon (kayıt yolu): her turda yeniden açılan mikrofon iPhone'da ses vermeyebiliyordu
    // Sesli yanıt açıksa ya da telefonun tanıması bu açılışta bir kez yazı vermediyse kayıt yolu (sunucuda çeviri):
    // iPhone'un kendi tanıması sesli cevaptan sonra art arda "Ses duyulmadı" veriyordu (Seyhun'un raporu, 2026-10-21)
    preferServer: () => !!tts?.enabled || webFail.current,
    onWebFail: () => (webFail.current = true),
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
  // Seyhun (2026-10-20) bilgi sorulunca (saat, tarih, kim) mikrofonun kendiliğinden açılmasını istiyor. iPhone'da okumanın
  // hemen ardından açılan mikrofon sessiz kalabiliyordu: ses oturumu kayda geçsin diye 700 ms beklenir; mikrofon yine de
  // sıfır ses verirse ölü mikrofon denetimi (micCheck.js) onu kapatıp bir kez yeniden açar
  // Cevap kayıt yoluyla dinlenir (server): telefonun tanıması okumanın ardından "gönder", "evet" gibi kısa sözleri
  // çoğu zaman hiç yazıya çevirmiyordu (Seyhun 2026-10-20); kayıt yolunda ses gerçekten ölçülür, susunca gönderilir
  const listenOnce = () =>
    setTimeout(() => {
      if (live.current.open && !live.current.text && live.current.spStatus === "idle") sp.start({ auto: true, quiet: true, autoStop: 8000, endpoint: 1500, handsFree: true, server: true });
    }, 700);
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
  const readMode = useRef(false); // "notları oku", "bugün hangi planlar var": cevap sesli okunur, sonra mikrofon açılır (lib/readAloud.js)
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
  const actNow = useRef(null); // görev listesindeki numaralı iş { act, args, say } (actRun.js)
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
  const planTimeAsk = useRef(null); // saatsiz plana saat ya da tarihsiz göreve son tarih teklif edildi: { kind: "time" | "due", id, title, date }
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
    // Son 5 oturum (Seyhun, 2026-10-14): bu açılışın konuşması kısa özet olarak cihazda kalır, sonraki isteklerde yapay zekaya gider
    saveSession(dataUid, sessionOf(list, memo.current, { id: openId.current, at: past.current.at }));
  }
  const openId = useRef(0);
  useEffect(() => {
    if (open) openId.current = nowMs();
  }, [open]);
  // Ekranda, yeni konuşmanın üstünde son 3 oturum (Seyhun: "önceki birkaç sohbet gösterirsin her zaman", 2026-10-17)
  const [history, setHistory] = useState([]);
  // Ayarlar'da gizlendiyse ekranda gösterilmez; hafıza (yapay zekaya giden oturumlar) sürer
  const loadHistory = () => setHistory(pastShown() ? loadSessions(dataUid).slice(-3) : []);
  // Ayarlar › Geçmişi sil: az önceki konuşma da unutulur
  useEffect(() => {
    const clear = () => {
      past.current = { turns: [], at: 0, msgDraft: null, memo: {} };
      setHistory([]);
    };
    window.addEventListener(PAST_CLEAR, clear);
    return () => window.removeEventListener(PAST_CLEAR, clear);
  }, []);
  // Yapay zekaya giden son oturumlar (az önceki, zaten geçmiş olarak giden oturum hariç)
  const sessionsNow = () => sessionsFor(loadSessions(dataUid), nowMs(), pastOn() ? past.current.at : 0);
  // Tek bekleyen soru: yeni bir soru sorulunca öncekiler kapanır (sonraki cümle yalnız son soruya cevap sayılır)
  const ASK_REFS = { attName: attAsk, raceChoice: raceChoices, to: askTo, log: logFlow, person: personFlow, invoice: invAsk, ok: okFlow, athlete: athAsk, raceFollow, event: eventFlow, inv: invFlow, planTime: planTimeAsk };
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

  function showPage(...a) {
    return by_cevap.showPage(ctx, ...a);
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
  const extra = (m, list) => extraNote(m, list);
  const ready = (list) => list.length > 0 && !firstNeed(list) && list.every((d) => !check(d));
  function saveDraftsNow(...a) {
    setAuto(null);
    return is_kayit.saveDraftsNow(ctx, ...a);
  }
  // Geri sayımlı iş (Seyhun, 2026-10-20): hazırlanan kayıt ve mesaj kartta AUTO_MS boyunca bekler, altında çizgi dolar;
  // dolunca kendiliğinden kaydedilir / gönderilir. İptal (✕, Vazgeç) ya da hemen (Kaydet, Gönder) seçilebilir.
  // Mesaj metni elle düzeltilirse (setSendText) sayım durur, Gönder'e basılır. Silme ve para işleri onayla kalır.
  // Kullanıcı o an konuşuyorsa beklenir (sözü bitince yeniden sayılır).
  const [auto, setAuto] = useState(null); // { kind: "save" | "send", until, ms, ref, args }
  function armSave(viaVoice, list, pre = "", lead = "") {
    setDrafts(list);
    setPhase("idle");
    setAuto({ kind: "save", until: nowMs() + AUTO_MS, ms: AUTO_MS, ref: list, args: [viaVoice, list, pre, lead] });
  }
  // Asistan kapanırken sayım sürüyorsa iş beklemeden yapılır (kapatmak vazgeçmek değildir)
  function flushAuto() {
    const a = auto;
    if (!a) return;
    setAuto(null);
    if (a.kind === "save" && drafts === a.ref) is_kayit.saveDraftsNow(ctx, ...a.args);
    else if (a.kind === "send" && cards.pending === a.ref) is_mesaj.confirmPending(ctx, true);
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
  function openPost(...a) {
    return is_yaris.openPost(ctx, ...a);
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
  function prepareBatch(...a) {
    return is_mesaj.prepareBatch(ctx, ...a);
  }
  // Mesaj kartı geri sayımla gelir (pending.auto: uygulama içi gönderim; WhatsApp dokunuş ister, sayılmaz)
  useEffect(() => {
    const p = cards.pending;
    if (p?.send && p.auto) setAuto((a) => (a?.ref === p ? a : { kind: "send", until: nowMs() + AUTO_MS, ms: AUTO_MS, ref: p }));
    else setAuto((a) => (a?.kind === "send" ? null : a));
  }, [cards.pending]);
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => {
      if (sp.talking()) return setAuto((a) => (a === auto ? { ...a, until: nowMs() + 1500, ms: 1500 } : a));
      flushAuto();
    }, Math.max(0, auto.until - nowMs()));
    return () => clearTimeout(t);
  });
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
  // Kutudaki canlı yazı için ikiye ayrılır: kesinleşen söz ve soluk görünen son kısım (telefonun tanımasında ara sonuç)
  const heardFix = (sp.finalText || "").trim();
  const heardTail = heardFix ? (sp.interim || "").trim() : heardNow;
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
    onLive?.({ open, docked, listening, transcribing, busy, heard: heardNow, heardFix, tail: heardTail, said: heard, draft: text, lastReply, speaking: tts.speaking, booting, talked: turns.length > 0, status: workNow, prog: plan.length ? plan : steps, planShown: plan.length > 0, saved: saved.length > 0 && !drafts.length });
  }, [onLive, open, docked, listening, transcribing, busy, heardNow, heardFix, heardTail, heard, text, lastReply, tts.speaking, booting, turns.length, workNow, plan, steps, saved.length, drafts.length]);
  // Sahnenin düğmeleri buradaki işleri çağırır
  const stageListen = () => {
    convo.current = true;
    // Küreye yeniden basınca ekran temiz başlar (eski konuşma bir an görünüp kaybolmasın); bir soruya cevap beklenmiyorsa.
    // Kalkan konuşma yapay zekaya geçmiş olarak gitmeye devam eder (keepPast)
    const lastAsk = [...turns].reverse().find((t) => t.role === "assistant" && !t.pre)?.text || "";
    const asking = cards.awaiting || cards.pending || drafts.length || planOn.current || (!askedMore.current && /\?\s*$/.test(lastAsk));
    if (!asking && turns.length && phase === "idle") {
      keepPast(turns);
      loadHistory(); // kalkan konuşma önceki sohbetlerin arasında görünür
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
  // Asistanla hazırlanan Instagram gönderisi kaydedilince (PostEditor): son cevabın altına görselin küçüğü ve açma düğmesi
  useEffect(() => {
    if (!open) return;
    const on = (e) => {
      const { id, thumb } = e.detail || {};
      if (!id) return;
      setTurns((p) => {
        const i = p.findLastIndex((t) => t.role === "assistant");
        if (i < 0) return p;
        const t = p[i];
        return [...p.slice(0, i), { ...t, links: { ...(t.links || {}), post: { id, thumb: thumb || "" } } }, ...p.slice(i + 1)];
      });
    };
    window.addEventListener("sa-post-ready", on);
    return () => window.removeEventListener("sa-post-ready", on);
  }, [open]);
  // Konuşma raporu: açılış anı; kapanınca o konuşmanın raporu kaydedilir (lib/assistLog.js, Ayarlar › Asistan raporu)
  const openedAt = useRef(0);
  useEffect(() => {
    if (!open) return;
    openedAt.current = Date.now();
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
      sp.release(); // dinlemeyi iptal eder, tutulan mikrofonu bırakır (iPhone'da kayıt işareti söner)
      webFail.current = false;
      startedFor.current = null;
      if (openedAt.current) {
        const at = openedAt.current;
        openedAt.current = 0;
        setTimeout(() => saveSessionLog(at), 400); // son cevabın süre kaydı da girsin
      }
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
    if (!startedFor.current) loadHistory(); // bu açılış: önceki sohbetler bir kez okunur
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

  // Tek görünüm: konuşma alttaki yeşil kubbenin (TabBar › Dome) içindeki yuvaya çizilir; ayrı pencere yok
  // Taşınan işler (isler/, beyin/) bileşenin durumuna ve yardımcılarına ctx ile ulaşır; her çizimde yenilenir
  // eslint-disable-next-line react-hooks/refs -- ref nesneleri yalnız iletilir; .current olaylarda okunur
  Object.assign(ctx, { armSave, flushAuto, readMode, sessionsNow, showPage, AMB, actNow, fitOthers, aiLesson, allMembers, askAI, askAll, askDelete, askOk, askTasks, askTo, askedMore, athAsk, attAsk, attHere, birthdays, by, callBusy, canAssign, canOpen, cancelPending, cancelRun, cards, chain, chainGen, chainRace, chainStep, chatArchive, chatDelete, chatPurge, chatRef, chatRemove, chatRestore, chatSend, chats, clearSay, club, confirmPending, contactNames, contacts, continuePerson, convo, createAs, createGroup, ctrl, curRace, dataUid, deleteRecord, deleteSeries, done, draftMeta, draftSay, draftSrc, drafts, dropDrafts, enqueueSay, eventFlow, extra, failNow, find, finish, firstName, flowOf, focusRef, go, goRace, groupIds, handle, heard, heldQ, holdIfTalking, inflight, invAsk, invDelete, invFlow, invHere, invPage, isLocked, isStaff, leave, lessons, listenOnce, listenWhileThinking, live, logFlow, markPaid, setReceiptScope, members, memo, memoSet, msgDraft, myGroups, myKind, myUid, nameIdx, nextInChain, nextStep, notes, okFlow, onClose, openAdd, openBirthday, openChatAt, openMeeting, openNav, openPost, openRace, openReceipt, openRecord, owner, park, parked, past, pastOn, pastTurns, path, personAccount, personCancel, personCard, personFlow, personOpenAccount, personSave, personUndo, personUndoAsk, planCutN, planFails, planIdx, planKind, planLearn, planNow, planOn, planTimeAsk, plans, preferRef, prepareBatch, prepareSend, profile, queue, raceChoices, raceFailed, raceFollow, raceOrg, racer, races, ready, receipts, refineDrafts, rejectDelete, reply, resolveTo, restAfterAtt, router, run, runAttendance, runDebt, runEvent, runExtra, runFitness, runFood, runId, runInventory, runInvoice, runLocal, runLog, runMore, runNow, runPayee, runPost, runRace, runResults, runSchedule, runShopAdd, runShopMark, runShopRead, runStep, sameIn, saveAtt, saveBirthday, saveDrafts, saveDraftsNow, saveHereRace, sayQ, sayRace, sentOk, setCards, setDrafts, setError, setHeard, setPhase, setPlan, setPrefer, setSaved, setSteps, setStreamText, setText, setTurns, setVoice, setWork, skipRace, sp, speaking, speakingRef, staff, staffNames, startAuto, startCall, startDrafts, startPerson, startPlan, startPost, stepPerson, stepTo, stepsEnd, stopPlan, streamSaid, tasks, toast, toggleTask, tts, turns, updateRecord, waPeople, waitFor, withAssignees });
  return { auto, WA_PICK, listenOnce, abort, busy, cancelPending, cards, confirmPending, continuePerson, docked, done, draftMeta, drafts, dropDrafts, editDraftsFull, error, eventDelete, eventFlow, find, finish, go, goRace, heard, invDelete, invFlow, listening, nextStep, okFlow, openAdd, park, personAccount, personCancel, personEdit, personOpenAccount, personSave, personUndo, personUndoAsk, plan, plans, prefer, router, run, runEvent, saveDraftsNow, saved, setCards, setSendText, setTurns, setUsed, sp, streamText, toggleTask, transcribing, tts, turns, undoAtt, used, voice, wait, history };
}
