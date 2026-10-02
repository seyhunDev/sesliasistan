"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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
import { precue } from "@/lib/precue";
import { askAssistant } from "@/services/assistantService";
import { buildDigest } from "@/lib/ai/digest";
import { cached as cachedWeather, dayHours, loadWeather, wantsWeather, weatherDigest } from "@/features/weather/weather";
import { canSeeAthletes, wantsAttendance } from "@/features/athletes/access";
import { ATT_LABEL, applyAttendance, attSummary, parseAttendance } from "@/features/athletes/assistAttendance";
import { runRaceCommand, wantsRace } from "@/features/athletes/assistRace";
import { raceNames } from "@/features/athletes/raceNames";
import { loadRaces } from "@/features/athletes/races";
import { useNameIndex } from "@/features/athletes/names";
import { LISTS, addItems, listsFor, splitItems } from "@/features/shop/shop";
import { useKind } from "@/features/auth/useKind";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { PAGES, buildPatch, describeAction, isEnd, isNo, isYes, localQuery, looksLikeCreate } from "@/lib/assistantLocal";
import { brainCommand, localCommand } from "@/lib/commands";
import { labelFromAI, labelFromCommand, labelFromItems } from "@/lib/brain/model";
import { countHit, guess as brainGuess, record } from "@/lib/brain/store";
import { RecordList } from "./RecordList";
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
const ENDPOINT = 2000;
const BEAT = 350;
const clock = () => Date.now(); // konuşma kuyruğu zamanlaması (olay anında çağrılır)
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
// Taslak varken kaydetme / vazgeçme
const SAVE = /^(kaydet|kaydedebilirsin|evet|tamam|olur|onayla|ekle|ekleyebilirsin|kaydet gitsin)(?=$|[\s.,!?])/i;
const BARE_SAVE = /^(kaydet|kaydeder misin|kaydedebilirsin|kaydet gitsin|onayla)[\s.!]*$/i;
const DROP = /^(vazgeç|iptal|hayır|kaydetme|sil|boş ?ver)(?=$|[\s.,!?])/i;
// Taslak varken sorulan soru taslağı değiştirmesin, asistana gitsin
const QUESTION = /\?\s*$|\b(neler var|ne var|kaç|hangi|ne zaman|göster|listele|özetle)\b/i;
const KIND_ICON = { plan: "cal", task: "task", note: "note" };

export function AssistantSheet({ open, onClose, seed, onLive, onAct, slot }) {
  const router = useRouter();
  const toast = useToast();
  const tts = useTts();
  const { profile } = useAuth();
  const { openBirthday } = useBirthday();
  const { plans, tasks, notes, receipts, toggleTask, updateRecord, deleteRecord, members, isStaff, saveDrafts, saveBirthday, addReply } = useData();
  // Çalışan adları (ana hesap): ses çevirisine ipucu, yapay zekaya sorumlu atama ve "kimde ne iş var" soruları için
  const staff = isStaff ? [] : members;
  const staffNames = staff.map((m) => m.name).filter(Boolean);
  // Yarış adları (zor yazılanlar): ses çevirisine ipucu. Hafıza bir kez kayıtlı yarışlardan doldurulur.
  const racer = canSeeAthletes(profile?.email);
  const raceOrg = racer ? profile?.orgId : "";
  useEffect(() => {
    if (raceOrg) loadRaces(raceOrg).catch(() => {});
  }, [raceOrg]);
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openMeeting } = useMeeting();
  const [text, setText] = useState("");
  const [turns, setTurns] = useState([]);
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
  const [focus, setFocus] = useState(null);
  const [drafts, setDrafts] = useState([]); // panelde hazırlanan yeni kayıtlar ("kaydet" deyince kaydedilir)
  const convo = useRef(false); // sesli sohbet: her cevaptan sonra mikrofon kendiliğinden açılır
  // Canlı akış: yanıtı beklenen son sesli istek. Yanıt gelmeden konuşmaya devam edilirse yenisiyle birleştirilip yeniden gönderilir.
  const inflight = useRef(null);
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
    terms: racer ? raceNames().slice(0, 12) : [],
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
  live.current = { open, text, heardNow: `${sp.finalText}${sp.interim}`.trim(), spStatus: sp.status };
  const listening = sp.status === "listening";
  const transcribing = sp.status === "transcribing";

  // Sesli sohbette cevaptan sonra dinlemeye devam (15 sn konuşulmazsa mikrofon durur, sohbet açık kalır)
  // Kısa gecikme: cevap aynı anda hazırlandıysa (yerel komut) yazı kutusunun temizlenmiş hali okunsun
  const startAuto = () =>
    setTimeout(() => {
      if (live.current.open && !live.current.text) sp.start({ autoStop: SILENCE_MS, auto: true, quiet: true, endpoint: ENDPOINT });
    }, 150);
  // Yapay zeka düşünürken de dinle: kullanıcı devam ederse söylediği öncekine eklenir
  const listenWhileThinking = () =>
    setTimeout(() => {
      if (live.current.open && live.current.spStatus === "idle" && inflight.current) sp.start({ auto: true, quiet: true, endpoint: ENDPOINT });
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
  const streamSaid = useRef(""); // akışta okunmak üzere kuyruğa giren metin (yanıt gelince yalnız kalanı okunur)
  const [streamText, setStreamText] = useState(""); // akışta gelen yanıt (kelime kelime)

  function reply(message, extra = {}, viaVoice = false) {
    // Yanıt geldiğinde kullanıcı hâlâ konuşuyorsa yanıtı gösterme ve sözünü kesme: konuşması kendiliğinden
    // bitince (sessizlik) söyledikleri öncekiyle birleştirilip yeniden sorulur
    if (inflight.current && live.current.spStatus === "listening" && live.current.heardNow) return;
    inflight.current = null;
    if (live.current.spStatus === "listening") sp.cancel(); // düşünürken açılan mikrofon: konuşulmadı, kapat
    const { show = [], pending = null, nav = "", chat = "", att = null, engine = "", expect = false } = extra;
    const awaiting = expect || !!pending;
    setStreamText("");
    setTurns((p) => [...p, { role: "assistant", text: message }]);
    setCards({ show, pending, nav, chat, att, engine, awaiting });
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
    return need || /\?\s*$/.test(base) ? base : `${base} Kaydedeyim mi?`;
  }
  function startDrafts(items, s, msg, engine, viaVoice) {
    let next = items.map((x) => withAssignees(x, s)).map(fresh);
    const need = firstNeed(next);
    if (need) next = next.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d));
    setDrafts(next);
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
    setPhase("thinking");
    const r = await saveDrafts(list.map(tidy), { source: viaVoice || convo.current ? "voice" : "manual", by });
    setPhase("idle");
    // Kayıt veritabanına yazılamadıysa "kaydettim" denmez; taslak durur, yeniden "kaydet" denebilir
    if (!r || r.error || r.plans + r.tasks + r.notes === 0)
      return reply("Kaydedemedim, bir sorun çıktı. Taslak duruyor; tekrar “kaydet” diyebilirsin.", { engine: "local" }, viaVoice);
    const said = turns.find((t) => t.role === "user" && !t.chip)?.text;
    if (said) record(said, labelFromItems(list), "user");
    const parts = [r.plans && `${r.plans} plan`, r.tasks && `${r.tasks} görev`, r.notes && `${r.notes} not`].filter(Boolean);
    const who = uidsToNames([...new Set(list.flatMap((d) => d.assignees || []))], members).map((n) => n.split(" ")[0]);
    setDrafts([]);
    toast(`${parts.join(", ")} kaydedildi${who.length ? ` · ${who.join(", ")}` : ""}`);
    navigator.vibrate?.([10, 40, 10]);
    const what = `${parts.join(", ")}${who.length ? `, ${who.join(" ve ")} sorumlu` : ""}`;
    reply(r.queued ? `Bağlantı zayıf: ${what} sıraya alındı, internet gelince kaydedilecek.` : `Kaydettim: ${what}. Başka bir şey var mı?`, { engine: "local" }, viaVoice);
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
    leave(message, viaVoice);
  }
  // Başka sayfaya geçince asistan açık kalır: ne yapıldığı söylenir ve gösterilir, sohbet kullanıcı kapatana kadar sürer
  function leave(message, viaVoice) {
    reply(message, { engine: "local" }, viaVoice);
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
    if (isEnd(s)) {
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
    // Taslak yokken yalnızca "kaydet": yapay zekaya gitmez (kaydetmeden "kaydettim" diyebiliyordu)
    if (!drafts.length && !cards.pending && BARE_SAVE.test(s))
      return reply("Kaydedecek bir taslak görmüyorum. Ne eklememi istersin?", { engine: "local", expect: true }, viaVoice);
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
    // Yarış ekleme / yarışa sporcu ya da not ekleme: yarış evrakı sayfasındaki kayda yazılır, yeni yarış planlara da düşer
    if (canSeeAthletes(profile?.email) && wantsRace(s)) return runRace(s, viaVoice);
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
    // Öğrenilenler (brain) artık yapay zekadan önce kayıt hazırlamaz: yalnızca yapay zekaya ulaşılamazsa yedek (aşağıda)
    const id = ++runId.current;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setPhase("thinking");
    // Ön cevap: yapay zeka düşünürken hemen kısa bir giriş (veriden bilgiyle) söylenir ve gösterilir; bildiği alanlar
    // taslak kartta belirir. Yapay zekaya da ne söylendiği gider, cevabı bunun devamı olur (lib/precue.js).
    const pc = precue(s, { plans, today: todayStr(), guess: brainGuess(s), weatherRows: (d) => dayHours(cachedWeather(), d) });
    clearSay();
    streamSaid.current = "";
    setStreamText("");
    if (pc) {
      setTurns((p) => [...p, { role: "assistant", text: pc.line, pre: true }]);
      enqueueSay(pc.line); // yanıtın okunması bunun ardından (kuyruk)
    }
    if (viaVoice) {
      inflight.current = s;
      // Ön cevap ve akış okunurken mikrofon açılmaz (kendi sesini duymasın); ön cevap yoksa eskisi gibi
      if (!pc) listenWhileThinking();
    }
    // Akış: yanıt metni geldikçe ekranda büyür; tamamlanan cümleler hemen kuyruğa (bekleme 1–2 sn'ye iner)
    const onText = (m) => {
      if (id !== runId.current) return;
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
      const digest = [buildDigest({ plans, tasks, notes, receipts, name: firstName, members: staff }), weather, focusRef.current?.text && `## AÇIK EKRAN\n${focusRef.current.text}`].filter(Boolean).join("\n\n");
      if (id !== runId.current) return;
      countHit("ai");
      const r = await askAssistant({ text: s, name: firstName, digest, history, people: staffNames, contacts: contactNames, precue: pc?.hint || "", onText }, c.signal);
      if (id !== runId.current) return;
      setPhase("preparing");
      await sleep(BEAT);
      if (id !== runId.current) return;
      handle(r, s, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
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
  async function runRace(s, viaVoice) {
    const id = ++runId.current;
    setPhase("thinking");
    setSteps([]);
    try {
      const orgId = profile?.orgId || myUid;
      const r = await runRaceCommand(s, { idx: nameIdx, orgId, uid: myUid, saveDrafts, by }, stepTo);
      if (id !== runId.current) return;
      stepsEnd(!r.expect);
      if (!r.expect) {
        navigator.vibrate?.([10, 40, 10]);
        toast("Yarış kaydedildi");
      }
      reply(r.said, { engine: "ai", nav: "races", expect: !!r.expect }, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      stepsEnd(false);
      const denied = e.code === "permission-denied";
      reply(denied ? "Kulüp hesabına bağlı değilsin. Sporcular sayfasından bir kez bağlanman gerekiyor." : e.message || "Yarış kaydedilemedi.", { engine: "local", nav: "races" }, viaVoice);
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
    if (!keepSpeech) clearSay();
    if (!keepSpeech) tts.stop();
    convo.current = false;
    onClose();
  }

  const docked = open; // tek görünüm: açıkken konuşma hep kubbede
  // Sahneye canlı durum: dinliyor mu, ne duyuldu, son cevap, düşünüyor mu
  const lastReply = [...turns].reverse().find((x) => x.role === "assistant")?.text || "";
  const heardNow = `${sp.finalText || ""}${sp.interim || ""}`.trim();
  const lvl = listening ? Math.round(Math.min(1, sp.level * 2.2) * 10) / 10 : 0; // sahnedeki ses dalgası (kaba adımlarla: az yeniden çizim)
  useEffect(() => {
    onLive?.({ open, docked, listening, transcribing, busy, heard: heardNow || (busy ? heard : ""), lastReply, speaking: tts.speaking, booting, level: lvl, talked: turns.length > 0 });
  }, [onLive, open, docked, listening, transcribing, busy, heardNow, heard, lastReply, tts.speaking, booting, lvl, turns.length]);
  // Sahnenin düğmeleri buradaki işleri çağırır
  const stageListen = () => {
    convo.current = true;
    clearSay();
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
        sp.start({ autoStop: SILENCE_MS, auto: true, endpoint: ENDPOINT });
      }
      return;
    }
    convo.current = !!(seed?.listen || seed?.voice);
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

        <Thread turns={turns} engine={cards.engine} tts={tts} ask={askObj} canFix={false} onFix={() => { }} />

        {/* Akışta gelen yanıt: kelime kelime; bitince yerini asıl yanıt alır */}
        {busy && streamText && (
          <div className="mt-3.5" aria-live="polite">
            <p className="min-w-0 pr-6 text-[1.0625rem] leading-relaxed tracking-[-.005em]">
              {streamText}
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-acc" aria-hidden="true" />
            </p>
          </div>
        )}

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
              <button type="button" onClick={() => (!embedded && park(), router.push(PAGES.attendance.path))} className="ml-auto h-9 rounded-xl px-3 text-[0.8125rem] font-semibold text-acc active:bg-bg">
                Yoklamayı aç
              </button>
            </div>
          </div>
        )}

        {/* Düşünüyor / yazıya çeviriyor: sahnede yazı yok, küre anlatır; yalnız tam panelde nokta + yazı */}
        {!embedded && (busy || transcribing) && !streamText && steps.every((x) => x.st !== "run") && (
          <div className="fade-in mt-2 flex items-center gap-2 text-[0.8125rem] text-mut">
            <span className="flex gap-1 rounded-2xl rounded-tl-md bg-bg px-3 py-2.5" aria-hidden="true">
              <i className="size-1.5 animate-bounce rounded-full bg-mut [animation-delay:-.3s]" />
              <i className="size-1.5 animate-bounce rounded-full bg-mut [animation-delay:-.15s]" />
              <i className="size-1.5 animate-bounce rounded-full bg-mut" />
            </span>
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
              <button type="button" onClick={() => confirmPending()} disabled={!cards.pending.send.text.trim()} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-40">
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
              if (!embedded) park();
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
    </>
  );

  // Tek görünüm: konuşma alttaki yeşil kubbenin (TabBar › Dome) içindeki yuvaya çizilir; ayrı pencere yok
  return slot ? createPortal(<div className="pb-1 text-[1rem]">{convoView(true)}</div>, slot) : null;
}
