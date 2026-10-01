"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { useTts } from "@/features/speech/TtsProvider";
import { useQuota } from "@/lib/quota";
import { Thread } from "@/features/add/Thread";
import { useSpeech } from "@/hooks/useSpeech";
import { assigneesInText, fixNames, namesToUids, uidsToNames } from "@/lib/names";
import { interpretText } from "@/services/aiService";
import { carry, check, firstNeed, fresh, isBlank, pub, tidy } from "@/features/add/drafts";
import { rel } from "@/lib/utils/format";
import { askAssistant } from "@/services/assistantService";
import { buildDigest } from "@/lib/ai/digest";
import { cached as cachedWeather, loadWeather, wantsWeather, weatherDigest } from "@/features/weather/weather";
import { canSeeAthletes, wantsAttendance } from "@/features/athletes/access";
import { ATT_LABEL, applyAttendance, attSummary, parseAttendance } from "@/features/athletes/assistAttendance";
import { useNameIndex } from "@/features/athletes/names";
import { LISTS, addItems, listsFor, splitItems } from "@/features/shop/shop";
import { useKind } from "@/features/auth/useKind";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { PAGES, buildPatch, describeAction, isNo, isYes, localQuery, looksLikeCreate } from "@/lib/assistantLocal";
import { brainCommand, localCommand, sureGuess } from "@/lib/commands";
import { labelFromAI, labelFromCommand, labelFromItems } from "@/lib/brain/model";
import { countHit, record } from "@/lib/brain/store";
import { RecordList } from "./RecordList";
import { QuotaPill } from "@/components/ui/QuotaPill";
import { parseBirthday } from "@/lib/birthdayParse";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { dmId, useChat, sendErrorText } from "@/features/chat/ChatProvider";
import { Avatar } from "@/features/chat/bits";
import { confirmWord, messageIntent } from "@/lib/ai/messageRules";
import { matchPerson } from "@/lib/names";
import { GROUPS, canReceipts, isAthleteSide } from "@/lib/kinds";
import { localNavigate } from "@/lib/nav";
import { fromMessage } from "@/lib/ai/assistant";

const SILENCE_MS = 0; // Otomatik kapanma kapalı
// Canlı sohbet: konuşma bitince (bu kadar sessizlikte) söylenen kendiliğinden gönderilir; kısa duraksama kesmez
const ENDPOINT = 1300;
const BEAT = 350;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
const EMPTY = { show: [], pending: null, nav: "", chat: "", att: null, engine: "", awaiting: false };
// Biten adım geçmiş zamanla yazılır ("Yoklama kaydediliyor" → "Yoklama kaydedildi")
const PAST = [[/ekleniyor$/, "eklendi"], [/yükleniyor$/, "yüklendi"], [/eşleştiriliyor$/, "eşleştirildi"], [/kaydediliyor$/, "kaydedildi"], [/gönderiliyor$/, "gönderildi"], [/alınıyor$/, "alındı"]];
// Alışveriş listesi komutları: "listeye süt ve ekmek ekle", "süt alışveriş listesine ekle", "listede ne var"
const SHOP_ADD = [
  /^(?:alışveriş\s+)?(?:listeye|listesine|alınacaklara)\s+(.+?)\s+(?:ekle|yaz|koy)\.?$/i,
  /^(.+?)\s+(?:alışveriş\s+)?(?:listeye|listesine|alınacaklara)\s+(?:ekle|yaz|koy)\.?$/i,
];
const SHOP_READ = /(alışveriş listesi|listede ne var|listede neler|ne alacağız|ne alınacak|markette ne)/i;
const pastOf = (s) => PAST.reduce((t, [re, to]) => t.replace(re, to), s);
const TEAM_WORD = /^(ekip|ekibe|herkes|herkese|grup|gruba|ekip grubu|aile|aileye|sporcu|sporcular|sporculara)/i;
// Söylenen grup adı → sabit grup ("ekibe" → team, "aileye" → family, "sporculara" → athletes; "herkese" → ilk grubum)
const groupOf = (t, mine = []) => {
  const s = String(t || "").toLocaleLowerCase("tr-TR");
  const g = /^aile/.test(s) ? "family" : /^sporcu/.test(s) ? "athletes" : /^(ekip|ekib)/.test(s) ? "team" : mine[0] || "";
  return mine.includes(g) ? g : "";
};
// Sohbeti bitiren sözler ("bitir", "kapat", "tamam teşekkürler", "şimdilik bu kadar")
const END = /^(?:tamam\s+)?(bitir|bitti|kapat|yeter|teşekkürler|teşekkür ederim|sağ ?ol|görüşürüz|şimdilik bu kadar|bu kadar|çıkış)(?=$|[\s.,!?])/i;
// Taslak varken kaydetme / vazgeçme
const SAVE = /^(kaydet|kaydedebilirsin|evet|tamam|olur|onayla|ekle|ekleyebilirsin|kaydet gitsin)(?=$|[\s.,!?])/i;
const DROP = /^(vazgeç|iptal|hayır|kaydetme|sil|boş ?ver)(?=$|[\s.,!?])/i;
// Taslak varken sorulan soru taslağı değiştirmesin, asistana gitsin
const QUESTION = /\?\s*$|\b(neler var|ne var|kaç|hangi|ne zaman|göster|listele|özetle)\b/i;
const KIND_ICON = { plan: "cal", task: "task", note: "note" };

export function AssistantSheet({ open, onClose, seed, onLive, onAct, stageOn }) {
  const router = useRouter();
  const toast = useToast();
  const tts = useTts();
  const { profile } = useAuth();
  const { openBirthday } = useBirthday();
  const { plans, tasks, notes, receipts, toggleTask, updateRecord, deleteRecord, members, isStaff, saveDrafts, saveBirthday, addReply } = useData();
  // Çalışan adları (ana hesap): ses çevirisine ipucu, yapay zekaya sorumlu atama ve "kimde ne iş var" soruları için
  const staff = isStaff ? [] : members;
  const staffNames = staff.map((m) => m.name).filter(Boolean);
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openMeeting } = useMeeting();
  const [text, setText] = useState("");
  const [turns, setTurns] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | thinking | preparing
  const [secs, setSecs] = useState(0);
  const [voice, setVoice] = useState(false);
  const [heard, setHeard] = useState("");
  const [cards, setCards] = useState(EMPTY);
  const [error, setError] = useState("");
  // Uzun işlemlerde yapılan adımlar panelde görünür: [{ label, st: "run" | "done" | "fail" }]
  const [steps, setSteps] = useState([]);
  const stepTo = (label) => (setDock(false), setSteps((p) => [...p.map((x) => (x.st === "run" ? { ...x, st: "done" } : x)), ...(label ? [{ label, st: "run" }] : [])]));
  const stepsEnd = (ok = true) => setSteps((p) => p.map((x) => (x.st === "run" ? { ...x, st: ok ? "done" : "fail" } : x)));
  const { idx: nameIdx } = useNameIndex();
  const [booting, setBooting] = useState(false); // mikrofonla açıldı, dinleme başlıyor
  const [min, setMin] = useState(false); // küçültüldü: sol kenarda baloncuk, sohbet sürer
  // Canlı alt panel: sayfa/sohbet açınca asistan kapanmaz, ekranın altında küçük durur ve dinlemeye devam eder.
  // Kart, taslak, onay ya da uzun cevap gelince kendiliğinden tam açılır.
  const [dock, setDock] = useState(false);
  const [menu, setMenu] = useState(false); // üstteki ⋯ menüsü: sesli yanıt, küçült, bugünkü hak
  const quota = useQuota("assistant");
  // Tür sayfasından açıldıysa ("plan" | "task" | "note"): ilk cümle o türde kayda çevrilir
  const preferRef = useRef("");
  const [prefer, setPrefer] = useState("");
  // Açık ekran (sohbet ya da kayıt konuşması): { title, to, rec: { kind, id }, text } — asistan bu konuşmayı bilir,
  // alıcı söylenmeden "yaz/cevap ver" denirse mesaj buraya gider
  const focusRef = useRef(null);
  const sentOk = useRef(false); // bu konuşmada gerçekten mesaj gönderildi mi ("gönderdin mi?" sorusuna doğru cevap için)
  const askTo = useRef(null); // "Ekibe ne yazayım?" sorulduysa alıcı: sonraki cümle mesaj olur
  const [focus, setFocus] = useState(null);
  const [drafts, setDrafts] = useState([]); // panelde hazırlanan yeni kayıtlar ("kaydet" deyince kaydedilir)
  const convo = useRef(false); // sesli sohbet: her cevaptan sonra mikrofon kendiliğinden açılır
  // Canlı akış: yanıtı beklenen son sesli istek. Yanıt gelmeden konuşmaya devam edilirse yenisiyle birleştirilip yeniden gönderilir.
  const inflight = useRef(null);
  const scrollRef = useRef(null);
  const runId = useRef(0);
  const startedFor = useRef(null); // geliştirme modunda (Strict Mode) açılış iki kez çalışmasın
  const ctrl = useRef(null);
  const live = useRef({});

  // Mesaj alıcıları: sohbet rehberindeki kişiler (ana hesap "ana hesap" adıyla da bulunur)
  const { people: chatPeople = [], send: chatSend, uid: myUid, groupIds = [] } = useChat() || {};
  const contacts = chatPeople.map((p) => ({ name: p.name || "", aliases: p.role === "owner" ? ["ana hesap", "patron"] : [], p })).filter((c) => c.name);
  const contactNames = [...(focus?.rec ? [`${RECORD_TO} (kayıt)`] : []), ...groupIds.map((g) => `${GROUPS[g].name} (grup)`), ...contacts.map((c) => (c.p.role === "owner" ? `${c.name} (ana hesap)` : c.name))];

  const myKind = useKind();
  const firstName = (profile?.name || "").split(" ")[0];
  const by = { name: profile?.name ?? "Kullanıcı" };
  const find = (kind, id) => ({ plan: plans, task: tasks, note: notes }[kind] || []).find((x) => x.id === id);
  const busy = phase !== "idle";

  const sp = useSpeech({
    names: staffNames,
    onFinal: (raw, mode) => {
      const tx = fixNames(raw, staffNames); // "san ver" → "Sanver"
      if (mode === "edit") setText((p) => (p ? `${p} ${tx}` : tx));
      else if (inflight.current) {
        // Kullanıcı yanıt gelmeden konuşmaya devam etti: bekleyen isteği bırak, öncekiyle birleştirip yeniden gönder
        const merged = `${inflight.current} ${tx}`.replace(/\s+/g, " ").trim();
        inflight.current = null;
        cancelRun();
        setTurns((p) => (p.at(-1)?.role === "user" ? p.slice(0, -1) : p));
        run(merged, true);
      } else run(text ? `${text} ${tx}` : tx, true);
    },
    onFail: (m) => toast(m),
  });
  // heardNow: o an duyulan (yanıt gelirken hâlâ konuşuyor mu); spStatus: mikrofon durumu
  live.current = { open, text, min, heardNow: `${sp.finalText}${sp.interim}`.trim(), spStatus: sp.status };
  const listening = sp.status === "listening";
  const transcribing = sp.status === "transcribing";

  // Sesli sohbette cevaptan sonra dinlemeye devam (15 sn konuşulmazsa mikrofon durur, sohbet açık kalır)
  // Kısa gecikme: cevap aynı anda hazırlandıysa (yerel komut) yazı kutusunun temizlenmiş hali okunsun
  const startAuto = () =>
    setTimeout(() => {
      if (live.current.open && !live.current.min && !live.current.text) sp.start({ autoStop: SILENCE_MS, auto: true, quiet: true, endpoint: ENDPOINT });
    }, 150);
  // Yapay zeka düşünürken de dinle: kullanıcı devam ederse söylediği öncekine eklenir
  const listenWhileThinking = () =>
    setTimeout(() => {
      if (live.current.open && !live.current.min && live.current.spStatus === "idle" && inflight.current) sp.start({ auto: true, quiet: true, endpoint: ENDPOINT });
    }, 120);
  const scrollLater = () =>
    setTimeout(() => scrollRef.current?.querySelector("[data-last-reply]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);

  function cancelRun() {
    runId.current += 1;
    ctrl.current?.abort();
    setPhase("idle");
  }

  // Yanıtı akışa ekler, kartları günceller, sesli okur. Sesli sohbetteyse okuma bitince mikrofon yeniden açılır
  // (kullanıcı "bitir" diyene ya da kapatana kadar sohbet sürer).
  function reply(message, extra = {}, viaVoice = false) {
    // Yanıt geldiğinde kullanıcı hâlâ konuşuyorsa yanıtı gösterme ve sözünü kesme: konuşması kendiliğinden
    // bitince (sessizlik) söyledikleri öncekiyle birleştirilip yeniden sorulur
    if (inflight.current && live.current.spStatus === "listening" && live.current.heardNow) return;
    inflight.current = null;
    if (live.current.spStatus === "listening") sp.cancel(); // düşünürken açılan mikrofon: konuşulmadı, kapat
    const { show = [], pending = null, nav = "", chat = "", att = null, engine = "", expect = false, keepDock = false } = extra;
    if (!keepDock && (pending || show.length || att || String(message).length > 170)) setDock(false);
    const awaiting = expect || !!pending;
    setTurns((p) => [...p, { role: "assistant", text: message }]);
    setCards({ show, pending, nav, chat, att, engine, awaiting });
    scrollLater();
    navigator.vibrate?.([8, 30, 8]);
    if (viaVoice || convo.current) tts.speakThen(message, startAuto);
    else tts.maybeSpeak(message);
  }

  // Başka bir tam ekran açılırken (fiş kamerası, kayıt, toplantı…) panel baloncuğa döner; sohbet kaybolmaz
  function park() {
    sp.cancel();
    setMin(true);
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
    return need || /\?\s*$/.test(base) ? base : `${base} Kaydedeyim mi?`;
  }
  function startDrafts(items, s, msg, engine, viaVoice) {
    let next = items.map((x) => withAssignees(x, s)).map(fresh);
    const need = firstNeed(next);
    if (need) next = next.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d));
    setDrafts(next);
    setDock(false);
    reply(draftSay(msg, next), { engine }, viaVoice);
  }
  async function refineDrafts(s, viaVoice) {
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
      const items = r.items.map((x) => withAssignees(x, s));
      let next = items.length ? carry(known, items) : drafts;
      const need = firstNeed(next);
      if (need && !next[need.idx]._asked) next = next.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d));
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
  async function saveDraftsNow(viaVoice) {
    for (const d of drafts) {
      const e = check(d);
      if (e) return reply(`${e}. Söyler misin?`, {}, viaVoice);
    }
    const list = drafts;
    const r = await saveDrafts(list.map(tidy), { source: viaVoice || convo.current ? "voice" : "manual", by });
    if (!r || r.plans + r.tasks + r.notes === 0) return toast("Kayıt sırasında hata oluştu");
    const said = turns.find((t) => t.role === "user" && !t.chip)?.text;
    if (said) record(said, labelFromItems(list), "user");
    const parts = [r.plans && `${r.plans} plan`, r.tasks && `${r.tasks} görev`, r.notes && `${r.notes} not`].filter(Boolean);
    const who = uidsToNames([...new Set(list.flatMap((d) => d.assignees || []))], members).map((n) => n.split(" ")[0]);
    setDrafts([]);
    toast(`${parts.join(", ")} kaydedildi${who.length ? ` · ${who.join(", ")}` : ""}`);
    navigator.vibrate?.([10, 40, 10]);
    reply(`Kaydettim: ${parts.join(", ")}${who.length ? `, ${who.join(" ve ")} sorumlu` : ""}. Başka bir şey var mı?`, { engine: "local" }, viaVoice);
  }
  function dropDrafts(viaVoice) {
    setDrafts([]);
    reply("Tamam, kaydetmedim.", { engine: "local" }, viaVoice);
  }
  // Tam ekranda düzenle: taslaklar yeni kayıt penceresine taşınır
  function editDraftsFull() {
    const said = turns.find((t) => t.role === "user" && !t.chip)?.text || heard;
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
    setDock(true);
    reply(message, { engine: "local", keepDock: true }, viaVoice);
  }

  function go(page, message, viaVoice = false) {
    if (!PAGES[page]) return reply("O sayfayı bulamadım.", { engine: "local", keepDock: true }, viaVoice);
    if (!canOpen(page)) return reply(`${PAGES[page].label} sayfası senin hesabında açık değil.`, { engine: "local", keepDock: true }, viaVoice);
    navigator.vibrate?.(8);
    router.push(PAGES[page].path);
    setDock(true);
    reply(message || `${PAGES[page].label} sayfasını açtım.`, { engine: "local", keepDock: true }, viaVoice);
  }

  function handle(r, s, viaVoice) {
    // Yanıt geldiğinde kullanıcı hâlâ konuşuyorsa bekle, sözünü kesme (konuşması bitince öncekiyle birleştirilip yeniden sorulur)
    if (inflight.current && live.current.spStatus === "listening" && live.current.heardNow) return;
    inflight.current = null;
    if (live.current.spStatus === "listening") sp.cancel();
    const msg = (r.message || "").trim();
    record(s, labelFromAI(r), "ai"); // öğrenme verisi

    // Mesaj: alıcı ve düzenlenmiş metin kartta gösterilir; onaylanınca gönderilir
    if (r.intent === "message" && r.send?.text) return prepareSend(r.send.to, r.send.text, msg, r.source, viaVoice);
    // Yapay zeka mesajı yalnızca cevabına yazdıysa ("Ekibe şunu göndereyim mi: …") kart yine hazırlanır
    const sendRec = r.intent === "message" && !r.send?.text ? fromMessage(msg) : null;
    if (sendRec?.text) return prepareSend(sendRec.to, sendRec.text, msg, r.source, viaVoice);
    // Gönderim yalnızca kartta onayla olur: yapay zeka "gönderdim" dese de gerçekte gönderilmediyse bunu söyleme
    // ("gönderdin mi?" sorusuna, gerçekten gönderildiyse "gönderdim" demesi doğrudur)
    if (r.intent === "message" || (SENT_CLAIM.test(msg) && !(sentOk.current && ASKED.test(s)))) {
      const to = r.send?.to || "";
      if (to && resolveTo(to)) askTo.current = to;
      return reply(SENT_CLAIM.test(msg) || !msg ? `Mesajı henüz göndermedim. ${to ? "Ne yazayım?" : "Kime ve ne yazayım?"}` : msg, { engine: r.source, expect: true }, viaVoice);
    }

    // Yeni kayıt: panelde taslak olarak hazırlanır, "kaydet" deyince kaydedilir (eksik bilgi sohbetle tamamlanır)
    if (r.intent === "create" && r.items?.length) {
      startDrafts(r.items, s, msg, r.source, viaVoice);
      return;
    }

    // İşlemler: görev tamamlama hemen, silme ve güncelleme onayla
    const pending = [];
    let done = 0;
    let missing = 0;
    let opened = null;
    for (const a of r.actions || []) {
      const rec = find(a.kind, a.id);
      if (!rec) {
        missing++;
        continue;
      }
      if (a.op === "complete_task" && a.kind === "task") {
        if (!rec.done) {
          toggleTask(a.id);
          done++;
        }
      } else if (a.op === "reopen_task" && a.kind === "task") {
        if (rec.done) {
          toggleTask(a.id);
          done++;
        }
      } else if (a.op === "delete") pending.push(a);
      else if (a.op === "update") {
        if (Object.keys(buildPatch(a.kind, a.patch, rec)).length) pending.push(a);
      } else if (a.op === "open" && !opened) opened = a;
    }

    if (opened) {
      if (msg) tts.maybeSpeak(msg);
      park();
      openAdd({ edit: { kind: opened.kind, id: opened.id } });
      return;
    }
    // Yapay zeka sohbet açmayı seçtiyse ("Sanver'le yazışmamı aç" gibi belirsiz söyleyişler)
    if (r.openChat && r.intent === "navigate") {
      const g = groupOf(r.openChat, groupIds);
      return openNav(TEAM_WORD.test(r.openChat) && g ? { chat: g } : { chatWith: r.openChat }, viaVoice);
    }
    if (r.navigate && !pending.length && (r.intent === "navigate" || !r.show?.length)) {
      go(r.navigate, msg, viaVoice);
      return;
    }

    let said = msg || (done ? "Tamamdır." : "");
    if (!said) said = missing ? "Bunu kayıtlarda bulamadım." : "Bunu tam anlayamadım, bir daha söyler misin?";
    if (missing && !done && !pending.length && !/bulam/.test(said)) said += " Bir kaydı da bulamadım.";
    if (pending.length && !/\?\s*$/.test(said)) said += " Onaylıyor musun?";
    if (done) toast(`${done} görev güncellendi`);
    reply(said, { show: (r.show || []).filter((x) => find(x.kind, x.id)), pending: pending.length ? { actions: pending } : null, nav: r.navigate || "", engine: r.source, expect: !!r.expectReply }, viaVoice);
  }

  async function run(t, viaVoice = false, fresh = false) {
    const s = t.trim();
    if (!s) return toast("Yaz veya mikrofona bas");
    if (viaVoice) {
      setVoice(true);
      convo.current = true; // sesle konuşuldu: sohbet sesli sürer
    }
    // Sohbeti bitir ("bitir", "kapat", "tamam teşekkürler")
    if (END.test(s)) {
      tts.speak("Görüşürüz.");
      finish(true);
      return;
    }
    const history = fresh ? [] : turns.slice(-6).map((x) => ({ role: x.role, text: x.text }));
    setTurns((p) => [...p, { role: "user", text: s }]);
    setText("");
    setHeard(s);
    setError("");
    setSteps([]);
    tts.stop();

    // Panelde bekleyen taslak: "kaydet" / "vazgeç"; soru değilse söylenen taslağı tamamlar/değiştirir
    if (drafts.length && !fresh) {
      if (SAVE.test(s)) return saveDraftsNow(viaVoice);
      if (DROP.test(s)) return dropDrafts(viaVoice);
      if (!QUESTION.test(s)) return refineDrafts(s, viaVoice);
    }
    // Onay bekleyen işlem varsa "evet / hayır" yerelde çözülür
    if (!fresh && cards.pending) {
      const cw = cards.pending.send ? confirmWord(s) : "";
      if (cw === "yes" || isYes(s)) return confirmPending(true);
      if (cw === "no" || isNo(s)) return cancelPending(true);
      setCards((c) => ({ ...c, pending: null, awaiting: false }));
    }
    // Sayfa ya da sohbet açma ("yoklamayı aç", "ana sayfaya dön", "ekip ile mesaj sayfamı aç"): yapay zekaya gitmeden
    const nav = localNavigate(s, { names: contacts.map((c) => c.name) });
    if (nav) {
      record(s, `nav:${nav.page || "messages"}`, "local");
      countHit("local");
      return openNav(nav, viaVoice);
    }
    // Doğum günü cümlesi ("Annemin doğum günü 12 Mart"): doğum günü formu dolu açılır, sen kaydedersin (her yıl tekrar eder)
    const bday = !/\?\s*$|ne zaman|kaçında|hangi gün|kaç yaş/iu.test(s) && parseBirthday(s);
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
    // Alışveriş listesi: ekle / oku (yapay zekaya gitmeden)
    const shopLists = listsFor(myKind, members);
    if (shopLists.length) {
      const m = SHOP_ADD.map((re) => re.exec(s)).find(Boolean);
      const list = /ekip|kulüp|kulup/i.test(s) && shopLists.includes("team") ? "team" : shopLists[0];
      if (m) return runShopAdd(m[1].replace(/^(alışveriş|ekip|aile)\s+/i, ""), list, viaVoice);
      if (SHOP_READ.test(s)) return runShopRead(list, viaVoice);
    }
    // Önceki turda "Ekibe ne yazayım?" diye sorulduysa bu cümle mesajın kendisidir
    if (askTo.current && !QUESTION.test(s)) {
      const to = askTo.current;
      askTo.current = null;
      return prepareSend(to, focusBody(s), "", "local", viaVoice);
    }
    askTo.current = null;
    // Sporcu yoklaması: sayfa değiştirmeden panelde yapılır (adımlar görünür); adlar net eşleşirse kaydedilir, geri alınabilir
    if (canSeeAthletes(profile?.email) && wantsAttendance(s)) return runAttendance(s, viaVoice);
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
    const cmd = !toFocus && localCommand(s, { plans, tasks, notes });
    if (cmd) {
      record(s, labelFromCommand(cmd), "local");
      countHit("local");
      return runLocal(cmd, s, viaVoice);
    }
    // Öğrenilenler: bu cümleye çok benzeyenler daha önce hep aynı işe gittiyse yapay zekaya sormadan hazırla
    // (hızlı ve ücretsiz; sonuç yine taslak ya da onay kartıdır). Soru ve açık sohbet/kayıt cümleleri hariç.
    const sure = !toFocus && !QUESTION.test(s) && sureGuess(s);
    if (sure) {
      if (sure.label === "send") {
        const toTeam = TEAM_WORD.test(s);
        const mi = messageIntent(toTeam ? s.replace(/^\S+(\s+grubuna)?\s+/i, "") : s, contacts);
        const to = toTeam ? s.split(/\s+/)[0] : mi?.to;
        if (to && String(mi?.send || "").trim() && resolveTo(to)) {
          countHit("brain");
          return prepareSend(to, mi.send, "", "brain", viaVoice);
        }
      } else {
        const bc = brainCommand(s, undefined, sure);
        if (bc) {
          countHit("brain");
          return runLocal(bc, s, viaVoice);
        }
      }
    }

    const id = ++runId.current;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setPhase("thinking");
    if (viaVoice) {
      inflight.current = s;
      listenWhileThinking();
    }
    try {
      // Hava sorusuysa (ya da önceki soru havaysa, "peki pazar?" gibi) güncel hava verisi de gider
      const wx = wantsWeather(s) || history.slice(-2).some((h) => h.role === "user" && wantsWeather(h.text));
      const weather = wx ? weatherDigest(await loadWeather().catch(() => cachedWeather())) : "";
      const digest = [buildDigest({ plans, tasks, notes, receipts, name: firstName, members: staff }), weather, focusRef.current?.text && `## AÇIK EKRAN\n${focusRef.current.text}`].filter(Boolean).join("\n\n");
      if (id !== runId.current) return;
      countHit("ai");
      const r = await askAssistant({ text: s, name: firstName, digest, history, people: staffNames, contacts: contactNames }, c.signal);
      if (id !== runId.current) return;
      setPhase("preparing");
      await sleep(BEAT);
      if (id !== runId.current) return;
      handle(r, s, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      inflight.current = null;
      if (live.current.spStatus === "listening" && !live.current.heardNow) sp.cancel();
      // Yapay zeka yok: önce öğrenilmiş örneklerden tahmin (kendi küçük modelimiz)
      const guessed = brainCommand(s);
      if (guessed) {
        toast("Yapay zekaya ulaşamadım, öğrendiklerime göre hazırladım. Kontrol et.");
        return runLocal(guessed, s, viaVoice);
      }
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
          askTo.current = to;
          return reply(`${dest.team ? `${dest.label} grubuna` : dest.label === "kaydın konuşması" ? "Kayda" : `${dest.label} için`} ne yazayım?`, { engine: "rules", expect: true }, viaVoice);
        }
      }
      if (mi?.send && (toTeam || mi.to || mi.unknown)) {
        toast("Yapay zekaya ulaşamadım, mesajı olduğu gibi hazırladım. Kontrol et.");
        return prepareSend(toTeam ? s.split(/\s+/)[0] : mi.to || mi.unknown, mi.send, "", "rules", viaVoice);
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
      if (id === runId.current) setPhase("idle");
    }
  }

  // Hızlı komutlar (lib/commands): fiş kamerası, sayfa, yeni kayıt, görev tamamlama, özet
  function runLocal(cmd, s, viaVoice) {
    if (cmd.type === "receipt") {
      navigator.vibrate?.(8);
      park();
      openReceipt({ camera: true });
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
    if (TEAM_WORD.test(t)) {
      const g = groupOf(t, groupIds);
      return g ? { cid: g, label: GROUPS[g].name, team: true, icon: GROUPS[g].icon, create: { type: "team" } } : null;
    }
    const name = contacts.find((c) => c.name === t)?.name || matchPerson(t, contacts);
    const c = contacts.find((x) => x.name === name);
    if (!c || !myUid) return null;
    return { cid: dmId(myUid, c.p.uid), label: c.name, create: { type: "dm", members: [myUid, c.p.uid].sort() } };
  }
  function prepareSend(to, text, msg, engine, viaVoice) {
    const dest = resolveTo(to);
    if (!dest) {
      const who = String(to || "").trim();
      return reply(`${who ? `${who} adında birini bulamadım. ` : ""}Kime göndereyim? Bir kişinin adını ya da "ekip" de.`, { engine, expect: true }, viaVoice);
    }
    const said = msg || `${dest.team ? `${dest.label} grubu` : dest.label} için mesaj hazır: “${text}” Göndereyim mi?`;
    reply(/\?\s*$/.test(said) || /göndereyim mi/i.test(said) ? said : `${said} Göndereyim mi?`, { pending: { send: { ...dest, text } }, engine, expect: true }, viaVoice);
  }
  const setSendText = (t) => setCards((c) => (c.pending?.send ? { ...c, pending: { send: { ...c.pending.send, text: t } } } : c));

  async function confirmPending(fromText = false) {
    const pend = cards.pending;
    if (!pend) return;
    if (!fromText) setTurns((p) => [...p, { role: "user", text: pend.send ? "Gönder" : "Onayla", chip: true }]);
    if (pend.att) {
      setCards((c) => ({ ...c, pending: null, awaiting: false }));
      setSteps([]);
      try {
        await saveAtt(pend.att, fromText && convo.current);
      } catch (e) {
        stepsEnd(false);
        reply(e.message || "Kaydedemedim.", { engine: "local" });
      }
      return;
    }
    if (pend.send) {
      const { cid, text: body, create, label, team, rec } = pend.send;
      if (!body.trim()) return reply("Mesaj boş; ne yazayım?", { engine: "local", expect: true }, fromText && convo.current);
      setCards((c) => ({ ...c, pending: null, awaiting: false }));
      setSteps([]);
      if (rec) {
        stepTo("Mesaj kaydın konuşmasına gönderiliyor");
        const ok = await Promise.resolve(addReply?.(rec.kind, rec.id, body)).then(() => true, () => false);
        if (ok) sentOk.current = true;
        stepsEnd(ok);
        toast(ok ? "Mesaj gönderildi" : sendErrorText());
        return reply(ok ? "Gönderdim, kayıttaki herkes görecek." : "Mesajı gönderemedim; tekrar dene.", { engine: "local" }, fromText && convo.current);
      }
      stepTo(`Mesaj ${team ? `${label} grubuna` : label} gönderiliyor`);
      const ok = await chatSend?.(cid, body, { create });
      if (ok) sentOk.current = true;
      stepsEnd(!!ok);
      toast(ok ? "Mesaj gönderildi" : "Mesaj gönderilemedi");
      navigator.vibrate?.([10, 40, 10]);
      return reply(ok ? `Gönderdim${team ? `, ${label} grubu gördü` : `, ${label} görecek`}.` : `Mesajı gönderemedim. ${sendErrorText()}`, { engine: "local", chat: ok ? cid : "" }, fromText && convo.current);
    }
    let n = 0;
    for (const a of pend.actions) {
      const rec = find(a.kind, a.id);
      if (!rec) continue;
      if (a.op === "delete") {
        deleteRecord(a.kind, a.id);
        n++;
      } else if (a.op === "update") {
        const patch = buildPatch(a.kind, a.patch, rec);
        if (Object.keys(patch).length) {
          updateRecord(a.kind, a.id, patch, by);
          n++;
        }
      }
    }
    const said = n ? "Tamamdır, yaptım." : "O kayıtları bulamadım.";
    toast(n ? "Yapıldı" : "Kayıt bulunamadı");
    reply(said, { engine: "local" }, fromText && convo.current);
    navigator.vibrate?.([10, 40, 10]);
  }

  function cancelPending(fromText = false) {
    if (!fromText) setTurns((p) => [...p, { role: "user", text: "Vazgeç", chip: true }]);
    reply(cards.pending?.send ? "Tamam, göndermedim." : "Tamam, vazgeçtim.", { engine: "local" }, fromText && convo.current);
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
  async function runAttendance(s, viaVoice) {
    const id = ++runId.current;
    setPhase("thinking");
    setSteps([]);
    try {
      const r = await parseAttendance(s, nameIdx, stepTo);
      if (id !== runId.current) return;
      const n = Object.keys(r.changes).length;
      if (!n) {
        stepsEnd(false);
        return reply(r.message || (r.unknown.length ? `Şu adları sporcularda bulamadım: ${r.unknown.join(", ")}.` : "Kimseyi eşleştiremedim. Adları bir daha söyler misin?"), { engine: "ai", nav: "attendance", expect: true }, viaVoice);
      }
      // Bulunamayan ad varsa kaydetmeden sor
      if (r.unknown.length) {
        stepsEnd();
        return reply(`${r.unknown.join(", ")} adını bulamadım. ${attSummary(r)}. Bunları kaydedeyim mi?`, { pending: { att: r }, att: { ...r, saved: false }, engine: "ai", expect: true }, viaVoice);
      }
      await saveAtt(r, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      stepsEnd(false);
      const denied = e.code === "permission-denied";
      reply(denied ? "Kulüp hesabına bağlı değilsin. Yoklama sayfasından bir kez bağlanman gerekiyor." : e.message || "Yoklama yapılamadı.", { engine: "local", nav: "attendance" }, viaVoice);
    } finally {
      if (id === runId.current) setPhase("idle");
    }
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
    if (!keepSpeech) tts.stop();
    convo.current = false;
    setMin(false);
    setDock(false);
    onClose();
  }
  const shut = () => finish(false);

  // Panel açıkken sayfanın alttaki çubuğu (Konuş · Yaz) gizlenir; paneldeki yazma alanı ve mikrofon yeter (globals.css: [data-bar])
  const panelUp = open && !min && !dock;
  const [drag, setDrag] = useState(0); // tutamaçtan aşağı çekme (px)
  const dragFrom = useRef(null);
  useEffect(() => {
    if (!panelUp) return;
    document.body.dataset.asst = "open";
    return () => delete document.body.dataset.asst;
  }, [panelUp]);
  // Canlı alt panelde sayfa kayar ve görünür; yalnızca alttaki çubuk gizlenir (panel onun yerinde)
  const docked = open && !min && dock;
  // Sahneye canlı durum: dinliyor mu, ne duyuldu, son cevap, düşünüyor mu
  const lastReply = [...turns].reverse().find((x) => x.role === "assistant")?.text || "";
  const heardNow = `${sp.finalText || ""}${sp.interim || ""}`.trim();
  useEffect(() => {
    onLive?.({ open, docked, listening, transcribing, busy, heard: heardNow || (busy ? heard : ""), lastReply, speaking: tts.speaking, booting });
  }, [onLive, open, docked, listening, transcribing, busy, heardNow, heard, lastReply, tts.speaking, booting]);
  // Sahnenin düğmeleri buradaki işleri çağırır
  const stageListen = () => {
    convo.current = true;
    tts.stop();
    sp.start({ autoStop: SILENCE_MS, endpoint: ENDPOINT });
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
      expand: () => setDock(false),
      close: () => finish(false),
    });
  });
  useEffect(() => {
    if (!docked) return;
    document.body.dataset.asst = "dock";
    return () => delete document.body.dataset.asst;
  }, [docked]);

  useEffect(() => {
    if (phase !== "thinking") return;
    setSecs(0);
    const id = setInterval(() => setSecs((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

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
      const t = setTimeout(() => {
        setTurns([]);
        setDrafts([]);
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
    setMin(false);
    preferRef.current = seed?.prefer || "";
    setPrefer(seed?.prefer || "");
    focusRef.current = seed?.focus || null;
    askTo.current = null;
    sentOk.current = false;
    setFocus(seed?.focus || null);
    // Panel zaten açıktı (alttaki "Konuş"/"Yaz"): sohbet sıfırlanmaz, kaldığı yerden devam
    if (cont) {
      if (seed?.dock === false) setDock(false);
      if (seed?.text) run(seed.text, !!seed.voice);
      else if (seed?.listen) {
        convo.current = true;
        sp.start({ autoStop: SILENCE_MS, auto: true, endpoint: ENDPOINT });
      }
      return;
    }
    convo.current = !!(seed?.listen || seed?.voice);
    setDock(!!seed?.dock); // alttaki sahneden açıldıysa sahnede kalır (sayfa soluklaşır), gerekirse tam açılır
    setDrafts([]);
    setText("");
    setTurns([]);
    setCards(EMPTY);
    setPhase("idle");
    setHeard("");
    setError("");
    setVoice(!!seed?.voice);
    if (seed?.text) run(seed.text, !!seed.voice, true);
    else if (seed?.listen) {
      setBooting(true);
      sp.start({ autoStop: SILENCE_MS, auto: true, endpoint: ENDPOINT });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed?.id]);

  // Yapay zeka aynı kaydı birden çok kez gösterebilir: her kayıt bir kez listelenir
  const shown = cards.show
    .filter((x, i, a) => a.findIndex((y) => y.kind === x.kind && y.id === x.id) === i)
    .map((x) => ({ kind: x.kind, rec: find(x.kind, x.id) }))
    .filter((x) => x.rec);
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
      d.place,
      d.assignees?.length && `→ ${uidsToNames(d.assignees, members).map((n) => n.split(" ")[0]).join(", ")}`,
    ]
      .filter(Boolean)
      .join(" · ");
  const status = listening ? "Dinliyorum" : transcribing ? "Yazıya çeviriyorum" : busy ? "Düşünüyorum" : voice ? "Sesli sohbet · konuşmak için mikrofona dokun" : focus?.title ? `${focus.title} · yaz ya da konuş` : "Yaz ya da konuş";

  // Sahne görünen sayfalarda canlı durum sahnede çizilir (Stage.jsx); burada yalnız sahnesiz sayfalar için küçük panel
  if (docked && stageOn) return null;
  // Canlı alt panel: son cevap ya da duyulan, dinleme durumu; dokununca tam açılır, mikrofonla devam edilir
  if (docked) {
    const lastSaid = [...turns].reverse().find((x) => x.role === "assistant")?.text || "Buradayım, söyle.";
    const heardLine = `${sp.finalText || ""}${sp.interim || ""}`.trim();
    return (
      <div data-voice="" role="region" aria-label="Asistan" className="fade-in fixed inset-x-0 bottom-0 z-[55] mx-auto max-w-[30rem] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2.5 rounded-[1.5rem] bg-card p-2 pl-2.5 shadow-[0_-6px_30px_-10px_rgba(38,40,44,.45)] ring-1 ring-line">
          <span className={`grid size-11 shrink-0 place-items-center rounded-full ${listening ? "bg-rec/10" : "bg-[#2c5163]"}`} aria-hidden="true">
            {listening || tts.speaking ? (
              <span className="eq"><i /><i /><i /><i /></span>
            ) : busy || transcribing ? (
              <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <span className="flex h-4 items-end gap-[2.5px]">
                {[6, 11, 16, 10, 5].map((h, i) => (
                  <i key={i} className="w-[2.5px] rounded-full bg-white" style={{ height: h }} />
                ))}
              </span>
            )}
          </span>
          <button type="button" onClick={() => setDock(false)} className="min-w-0 flex-1 text-left" aria-label="Asistanı büyüt">
            <small className={`block text-[0.6875rem] font-bold uppercase tracking-[.08em] ${listening ? "text-rec" : "text-acc"}`}>{listening ? "Dinliyorum" : transcribing ? "Yazıya çeviriyorum" : busy ? "Düşünüyorum" : "Asistan"}</small>
            <span className="line-clamp-2 text-[0.875rem] leading-snug">{listening ? heardLine || <span className="text-mut">Söyle, dinliyorum…</span> : busy ? heard : lastSaid}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (listening) return sp.stop("send");
              convo.current = true;
              tts.stop();
              sp.start({ autoStop: SILENCE_MS, endpoint: ENDPOINT });
            }}
            aria-label={listening ? "Bitti, gönder" : "Konuş"}
            className={`grid size-11 shrink-0 place-items-center rounded-full text-white active:scale-90 ${listening ? "bg-acc" : "bg-[#2c5163]"}`}
          >
            <Icon name={listening ? "check" : "mic"} className="size-5" />
          </button>
          <button type="button" onClick={shut} aria-label="Asistanı kapat" className="grid size-9 shrink-0 place-items-center rounded-full text-mut active:bg-bg">
            <Icon name="x" className="size-[1.125rem]" />
          </button>
        </div>
      </div>
    );
  }

  // Küçültülmüş: sol kenarda baloncuk (sohbet sürer; dokununca açılır)
  if (open && min)
    return (
      <button
        type="button"
        onClick={() => setMin(false)}
        aria-label="Asistanı aç"
        data-voice=""
        className="fade-in fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-3 z-40 grid size-14 place-items-center rounded-full bg-acc text-white shadow-[0_12px_32px_-12px_rgba(38,40,44,.6)] ring-4 ring-bg transition active:scale-90"
      >
        <Icon name="spark" className="size-6" />
        {(drafts.length > 0 || cards.pending) && <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full bg-rec ring-2 ring-bg" />}
      </button>
    );

  return (
    <section
      role="dialog"
      aria-label="Asistan"
      aria-modal="false"
      data-voice=""
      inert={!open}
      style={drag > 0 ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
      className={`fixed inset-x-0 top-0 z-[55] mx-auto flex h-dvh w-full max-w-[30rem] flex-col overflow-hidden bg-card shadow-[0_-12px_40px_-16px_rgba(38,40,44,.45)] transition-transform duration-300 ease-out sm:top-3 sm:h-[calc(100dvh-0.75rem)] sm:rounded-t-[1.75rem] sm:ring-1 sm:ring-line ${
        open ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      {/* Tutamaç: aşağı çek → küçült (sohbet sürer) */}
      <div
        onPointerDown={(e) => {
          if (e.target.closest("button")) return; // düğmeler kendi işini yapsın
          dragFrom.current = e.clientY;
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => dragFrom.current != null && setDrag(Math.max(0, e.clientY - dragFrom.current))}
        onPointerUp={() => {
          const d = drag;
          dragFrom.current = null;
          setDrag(0);
          if (d > 90) park();
        }}
        onPointerCancel={() => {
          dragFrom.current = null;
          setDrag(0);
        }}
        className="shrink-0 touch-none pt-[env(safe-area-inset-top)]"
      >
        <span className="mx-auto mt-2 block h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
      {/* Üst çubuk: küçült · durum · ayarlar · bitir (büyük dokunma alanları) */}
      <header className="flex items-center gap-2 px-3 pb-2.5 pt-1.5">
        <button type="button" onClick={park} aria-label="Küçült" className="grid size-11 shrink-0 place-items-center rounded-full bg-bg text-fg active:scale-90">
          <Icon name="chev" className="size-5 rotate-90" />
        </button>
        <span className="min-w-0 flex-1 text-center leading-tight">
          <b className="flex items-center justify-center gap-1.5 text-[1.0625rem] font-semibold tracking-tight">
            {listening && <span className="size-2 animate-pulse rounded-full bg-rec" />}
            Asistan
          </b>
          <small className="block truncate text-[0.75rem] text-mut">{status}</small>
        </span>
        {quota && quota.left <= 0 && <QuotaPill kind="assistant" />}
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-label="Panel ayarları"
          aria-expanded={menu}
          className={`grid size-11 shrink-0 place-items-center rounded-full text-mut active:scale-90 ${menu ? "bg-bg" : ""}`}
        >
          <Icon name="more" className="size-5" />
        </button>
        <button type="button" onClick={shut} aria-label="Sohbeti bitir" className="grid size-11 shrink-0 place-items-center rounded-full bg-bg text-fg active:scale-90">
          <Icon name="x" className="size-5" />
        </button>
      </header>
      </div>

      {/* ⋯ menüsü: sesli yanıt, küçült, bugünkü hak */}
      {menu && (
        <div className="fade-in absolute right-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 w-64 overflow-hidden rounded-2xl bg-card shadow-[0_16px_40px_-12px_rgba(38,40,44,.45)] ring-1 ring-line">
          {tts.supported && (
            <button type="button" role="switch" aria-checked={tts.enabled} onClick={tts.toggle} className="flex w-full items-center gap-3 px-4 py-3 text-left text-[0.875rem] active:bg-bg">
              <Icon name={tts.enabled ? "volume" : "mute"} className="size-[1.125rem] text-acc" />
              <span className="flex-1 font-medium">Sesli yanıt</span>
              <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${tts.enabled ? "bg-acc" : "bg-line"}`}>
                <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${tts.enabled ? "left-[1.125rem]" : "left-0.5"}`} />
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              park();
            }}
            className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left text-[0.875rem] font-medium active:bg-bg"
          >
            <Icon name="chev" className="size-[1.125rem] rotate-90 text-acc" />
            Küçült · sohbet sürsün
          </button>
          {quota && (
            <p className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[0.8125rem] text-mut">
              Bugün kalan hak
              <b className="font-semibold tabular-nums text-fg">
                {quota.left}/{quota.limit}
              </b>
            </p>
          )}
        </div>
      )}

      {/* Sohbet (kayar) */}
      <div ref={scrollRef} onPointerDown={() => menu && setMenu(false)} className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-4 pb-4 pt-2 text-[1rem]">
        {turns.length === 0 && !listening && !busy && !transcribing && (
          <div className="pt-3">
            {/* Hazır örnek düğmeleri yok: öneriler, hızlı öğrenme verisi hazır olunca gelecek */}
            <p className="text-[0.8125rem] text-mut">
              {prefer
                ? `Yeni ${{ plan: "plan", task: "görev", note: "not" }[prefer] || "kayıt"}: söyle ya da yaz, ben hazırlayayım; sonra “kaydet” de. Soru da sorabilirsin.`
                : "Arka arkaya isteyebilirsin; bitince “bitir” de."}
            </p>
          </div>
        )}

        <Thread turns={turns} engine={cards.engine} tts={tts} ask={askObj} canFix={false} onFix={() => { }} />

        {/* Yapılan işlem adım adım (yoklama, mesaj gönderme…) */}
        {steps.length > 0 && (
          <ol className="fade-in mt-2 space-y-1.5 rounded-2xl bg-bg px-3.5 py-3 text-[0.875rem]" aria-live="polite">
            {steps.map((x, i) => (
              <li key={i} className="flex items-center gap-2.5">
                {x.st === "run" ? (
                  <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-acc/25 border-t-acc" />
                ) : x.st === "done" ? (
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-ok text-white">
                    <Icon name="check" className="size-3 [stroke-width:3]" />
                  </span>
                ) : (
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-rec text-white">
                    <Icon name="x" className="size-3 [stroke-width:3]" />
                  </span>
                )}
                <span className={x.st === "run" ? "font-semibold" : "text-mut"}>{x.st === "done" ? pastOf(x.label) : x.label}{x.st === "run" ? "…" : ""}</span>
              </li>
            ))}
          </ol>
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
              <button type="button" onClick={() => (park(), router.push(PAGES.attendance.path))} className="ml-auto h-9 rounded-xl px-3 text-[0.8125rem] font-semibold text-acc active:bg-bg">
                Yoklamayı aç
              </button>
            </div>
          </div>
        )}

        {(busy || transcribing) && steps.every((x) => x.st !== "run") && (
          <div className="fade-in mt-2 flex items-center gap-2 text-[0.8125rem] text-mut">
            <span className="flex gap-1 rounded-2xl rounded-tl-md bg-bg px-3 py-2.5" aria-hidden="true">
              <i className="size-1.5 animate-bounce rounded-full bg-mut [animation-delay:-.3s]" />
              <i className="size-1.5 animate-bounce rounded-full bg-mut [animation-delay:-.15s]" />
              <i className="size-1.5 animate-bounce rounded-full bg-mut" />
            </span>
            {transcribing ? "Yazıya çeviriyorum…" : secs > 3 ? `Düşünüyorum · ${secs} sn` : "Düşünüyorum…"}
            <button type="button" onClick={transcribing ? sp.cancel : abort} className="ml-auto text-[0.75rem] font-semibold text-acc">
              Vazgeç
            </button>
          </div>
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
          <div className="fade-in mt-3 overflow-hidden rounded-2xl ring-1 ring-acc/30">
            <p className="bg-acc/[.06] px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-acc">Kaydedilecek · {drafts.length}</p>
            <ul className="divide-y divide-line">
              {drafts.map((d) => (
                <li key={d._id} className="flex items-center gap-2.5 px-3 py-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-acc/10 text-acc"><Icon name={KIND_ICON[d.type]} className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.875rem] font-semibold">{d.title || d.body || "Başlıksız"}</b>
                    <small className="block truncate text-[0.75rem] text-mut">{draftMeta(d)}</small>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-1.5 border-t border-line p-2">
              <button type="button" onClick={() => saveDraftsNow(false)} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-acc text-[0.8125rem] font-semibold text-white active:scale-[.98]">
                <Icon name="check" className="size-4" /> Kaydet
              </button>
              <button type="button" onClick={editDraftsFull} className="h-9 rounded-xl bg-bg px-3 text-[0.8125rem] font-semibold active:scale-[.98]">Düzenle</button>
              <button type="button" onClick={() => dropDrafts(false)} className="h-9 rounded-xl px-2.5 text-[0.8125rem] font-semibold text-mut active:bg-bg">Vazgeç</button>
            </div>
          </div>
        )}

        {cards.pending?.send && (
          <div className="fade-in mt-3 overflow-hidden rounded-2xl ring-1 ring-acc/30">
            <p className="flex items-center gap-2.5 bg-acc/[.06] px-3 py-2">
              <Avatar name={cards.pending.send.label} icon={cards.pending.send.team ? cards.pending.send.icon : null} size="size-8" text="text-[0.75rem]" tone={cards.pending.send.team ? "bg-[#2c5163] text-white" : undefined} />
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
              <button type="button" onClick={() => confirmPending()} disabled={!cards.pending.send.text.trim()} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2c5163] text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-40">
                <Icon name="up" className="size-4" /> Gönder
              </button>
              <button type="button" onClick={() => cancelPending()} className="h-11 rounded-xl bg-bg px-4 text-[0.9375rem] font-semibold text-mut active:scale-[.98]">
                Vazgeç
              </button>
            </div>
            <p className="border-t border-line px-3 py-1.5 text-[0.75rem] text-mut">Metne dokunup düzeltebilir ya da sesle değişiklik söyleyebilirsin.</p>
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

        {shown.length > 0 && (
          <RecordList
            items={shown}
            plans={plans}
            onToggle={toggleTask}
            onOpen={(kind, id) => {
              park();
              openAdd({ edit: { kind, id } });
            }}
          />
        )}

        {cards.chat && (
          <button
            type="button"
            onClick={() => {
              const to = cards.chat;
              finish(false);
              router.push(`/messages?c=${to}`);
            }}
            className="fade-in mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-bg text-[0.875rem] font-semibold active:scale-[.98]"
          >
            <Icon name="chat" className="size-4" /> Sohbeti aç
          </button>
        )}

        {cards.nav && (
          <button type="button" onClick={() => go(cards.nav, "")} className="fade-in mt-3 h-10 w-full rounded-xl bg-bg text-[0.875rem] font-semibold active:scale-[.98]">
            {PAGES[cards.nav].label} sayfasını aç
          </button>
        )}
      </div>

      {/* Alt: dinlerken canlı yazı + dalga; değilse yazma alanı ve mikrofon */}
      <footer className="shrink-0 border-t border-line bg-card px-3 pt-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)-0.25rem))]">
        {listening ? (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 items-center gap-[3px]" aria-hidden="true">
              {[0.5, 0.85, 1, 0.7, 0.45].map((m, i) => (
                <i key={i} className="w-[3px] rounded-full bg-rec transition-[height] duration-100" style={{ height: `${6 + Math.min(1, sp.level * 2.2) * m * 22}px` }} />
              ))}
            </span>
            <p className="line-clamp-3 min-w-0 flex-1 text-[1rem] leading-snug">
              {sp.finalText || sp.interim ? (
                <>
                  {sp.finalText}
                  <span className="text-mut">{sp.interim}</span>
                </>
              ) : (
                <span className="text-mut">{busy ? "Devam edebilirsin, eklerim…" : "Konuş; susunca kendiliğinden gönderilir"}</span>
              )}
            </p>
            <button type="button" onClick={() => sp.cancel()} aria-label="Dinlemeyi durdur" className="grid size-12 shrink-0 place-items-center rounded-full bg-bg text-mut active:scale-90">
              <Icon name="x" className="size-4" />
            </button>
            <button type="button" onClick={() => sp.stop("send")} aria-label="Gönder" className="grid size-14 shrink-0 place-items-center rounded-full bg-acc text-white active:scale-90">
              <Icon name="check" className="size-6 [stroke-width:2.4]" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                  e.preventDefault();
                  if (text.trim() && !busy) say(text);
                }
              }}
              rows={1}
              placeholder={drafts.length ? "Değiştir ya da “kaydet” de…" : cards.awaiting ? "Cevabını yaz…" : "Bir şey sor ya da iste…"}
              aria-label="Asistana yaz"
              className="max-h-36 min-h-12 flex-1 resize-none rounded-[1.5rem] bg-bg px-4 py-3 text-base outline-none [field-sizing:content] focus:bg-card focus:ring-1 focus:ring-acc"
            />
            {text.trim() ? (
              <button type="button" onClick={() => say(text)} disabled={busy} aria-label="Gönder" className="grid size-12 shrink-0 place-items-center rounded-full bg-[#2c5163] text-white active:scale-90 disabled:opacity-40">
                <Icon name="up" className="size-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  convo.current = true;
                  setVoice(true);
                  sp.start({ autoStop: SILENCE_MS, endpoint: ENDPOINT });
                }}
                disabled={busy || transcribing}
                aria-label="Konuş"
                className="grid size-12 shrink-0 place-items-center rounded-full bg-[#2c5163] text-white active:scale-90 disabled:opacity-40"
              >
                <Icon name="mic" className="size-6" />
              </button>
            )}
          </div>
        )}
      </footer>
    </section>
  );
}
