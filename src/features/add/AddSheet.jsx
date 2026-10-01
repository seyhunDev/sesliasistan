"use client";

import { doneOf } from "@/lib/doneWords";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/ui/Screen";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { useTts } from "@/features/speech/TtsProvider";
import { SpeakToggle } from "@/features/speech/SpeakToggle";
import { useSpeech } from "@/hooks/useSpeech";
import { interpretText } from "@/services/aiService";
import { addDays, cap, rel, todayStr } from "@/lib/utils/format";
import { localReceipt } from "@/lib/assistantLocal";
import { localCreate } from "@/lib/commands";
import { labelFromItems } from "@/lib/brain/model";
import { ackState, assigneesOf, lockedFor, unseenNotes } from "@/lib/people";
import { assigneeHints, assigneesInText, fixNames, namesToUids, uidsToNames } from "@/lib/names";
import { record } from "@/lib/brain/store";
import { spokenDay, spokenTime } from "@/lib/utils/speak";
import { ActionDock, Composer } from "./Composer";
import { DraftCard } from "./DraftCard";
import { AssignedView, AssistantPanel, Replies, ReplyComposer, recordFocus } from "./Assigned";
import { MiniOrb } from "@/features/assistant/ConvoComposer";
import { confirmWord } from "@/lib/ai/messageRules";
import { EditCard } from "./EditCard";
import { ItemCard } from "./ItemCard";
import { Thread } from "./Thread";
import { ListeningStage, ProcessingStage } from "./Stage";
import { blank, carry, check, firstNeed, fresh, isBlank, nid, pub, tidy, toPatch } from "./drafts";

const SILENCE_MS = 0; // Otomatik kapanma kapalı
const BEAT = 450; // "hazırlanıyor" adımının görünme süresi (ms)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIME_CHIPS = [["Sabah 09:00", "09:00"], ["Öğleden sonra 14:00", "14:00"], ["Akşam 18:00", "18:00"]];

const EDIT_TITLE = { plan: "Plan", task: "Görev", note: "Not" };
const NEW_TITLE = { plan: "Yeni plan", task: "Yeni görev", note: "Yeni not" };
const MANUAL = [["plan", "Plan", "cal"], ["task", "Görev", "task"], ["note", "Not", "note"]];

const fromRecord = (kind, r) => ({
  ...(kind === "plan"
    ? { ...blank("plan"), title: r.title, date: r.date, endDate: r.endDate || "", time: r.time || "", allDay: r.allDay ?? !r.time, place: r.place || "", cat: r.cat }
    : kind === "task"
      ? { ...blank("task"), title: r.title, date: r.due || "", cat: r.cat }
      : { ...blank("note"), title: r.title, body: r.body, cat: r.cat }),
  assignees: assigneesOf(r),
});

// "bugün", "dün" küçük; diğer tarihler olduğu gibi ("27 Eyl Paz")
const relLow = (isoStr) => {
  const t = rel(isoStr.slice(0, 10));
  return /^(Bugün|Dün|Yarın)$/.test(t) ? t.toLocaleLowerCase("tr-TR") : t;
};

// Düzenlemede değişiklik var mı: kaydedilecek alanlar + sorumlular
const editKey = (d) => JSON.stringify([toPatch(d), [...(d.assignees || [])].sort()]);


export function AddSheet({ open, onClose, seed }) {
  const toast = useToast();
  const tts = useTts();
  const { stop: stopTts } = tts;
  const { profile } = useAuth();
  const { plans, tasks, notes, saveDrafts, updateRecord, removeWithUndo, toggleTask, members, isStaff, nameOf, markSeen, setViewing, myUid, setMyDone, addReply } = useData();
  const { openReceipt } = useReceipt();
  const router = useRouter();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | thinking | preparing
  const [secs, setSecs] = useState(0);
  const [voice, setVoice] = useState(false);
  const [heard, setHeard] = useState(""); // yapay zekaya giden son metin
  const [reply, setReply] = useState({ engine: "", message: "" });
  const [turns, setTurns] = useState([]); // konuşma: { role: "user" | "assistant", text, chip? }
  const [whoAsk, setWhoAsk] = useState(null); // aynı adlı birden çok kişi: { said, options: [ad] } → "Hangi Ali?"
  const [ask, setAsk] = useState(null); // bekleyen soru: { idx, kind: "date" | "time" }
  const [editReply, setEditReply] = useState("");
  const [outbox, setOutbox] = useState(null); // asistanın hazırladığı, onay bekleyen: { text, done }
  const [aiMode, setAiMode] = useState("msg"); // kayıt içi yazma modu: msg (aynen gider) | ai (asistan)
  const [msgText, setMsgText] = useState(""); // kayıt içi mesaj kutusunun yazısı
  const [pickAssign, setPickAssign] = useState(null); // kaydetmeden önce sorumlu sorusu: null | seçilen uid'ler
  const orig = useRef(""); // düzenlemede açılıştaki hâl (değişiklik var mı?)
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const runId = useRef(0);
  const startedFor = useRef(null); // geliştirme modunda (Strict Mode) açılış iki kez çalışmasın
  const ctrl = useRef(null);
  const snaps = useRef([]); // "Son mesajı düzelt" için önceki durumlar
  const live = useRef({});
  live.current = { open, text };

  // Çalışan adları (ana hesap): ses çevirisine ipucu, yapay zekaya sorumlu atama için gider
  const staffNames = !isStaff ? members.map((m) => m.name).filter(Boolean) : [];
  const sp = useSpeech({
    names: staffNames,
    onFinal: (raw, mode) => {
      const tx = fixNames(raw, staffNames); // "san ver" → "Sanver"
      if (mode === "edit") setText((p) => (p ? `${p} ${tx}` : tx)); // metin kutuda kalsın, düzenleyip gönder
      else if (edit) runEdit(text ? `${text} ${tx}` : tx, true);
      else run(text ? `${text} ${tx}` : tx, true);
    },
    onFail: (m) => toast(m),
  });

  const edit = seed?.edit;
  const by = { name: profile?.name ?? "Kullanıcı" };
  const firstName = (profile?.name || "").split(" ")[0];
  const rec = edit ? ({ plan: plans, task: tasks, note: notes }[edit.kind] || []).find((x) => x.id === edit.id) : null;
  const linkedPlan = rec?.planId ? plans.find((p) => p.id === rec.planId)?.title : "";
  // Çalışan, başkasının verdiği kaydı değiştiremez: salt okunur görünüm + tamamladım + not
  const locked = !!edit && lockedFor(rec, myUid, isStaff);
  // Kaydın konuşmasındaki diğer kişiler (asistan mesajı bunlara gider); çalışan için ana hesap her zaman var
  const threadNames = rec
    ? [...new Set([...[rec.createdByUid, ...assigneesOf(rec)].filter((u) => u && u !== myUid).map((u) => nameOf(u)).filter(Boolean), ...(isStaff ? ["Ana hesap"] : [])])]
    : [];
  const hasThread = !!rec && (assigneesOf(rec).some((u) => u !== rec.createdByUid) || !!rec.replies);
  const plan = drafts.find((d) => d.type === "plan");
  // Ana hesap her kayda sorumlu çalışan(lar) seçebilir; çalışanın eklediği kayıt yine onda kalır
  const canAssign = !isStaff && members.length > 0;
  // Ana hesapta her zaman dizi (çalışan yoksa boş: kartta "Çalışan ekle" bağlantısı çıkar); çalışanda null
  const assign = !isStaff ? members : null;
  const addStaff = () => {
    shut();
    router.push("/staff");
  };
  const assignable = assign || [];
  // Yapay zekanın verdiği sorumlu adlarını çalışan kimliklerine çevirir (atama yetkisi yoksa yok sayılır)
  // Yapay zeka sorumlu vermediyse kullanıcının kendi cümlesinden bulunur ("Ali'nin benzin alma görevi", "Ali'ye ver", "Ali alsın")
  const withAssignees = ({ assignTo, ...x }, text = "") => {
    if (!canAssign) return x;
    const names = Array.isArray(assignTo) && assignTo.length ? assignTo : assigneesInText(text, staffNames);
    if (names.length) return { ...x, assignees: namesToUids(names, members) };
    return Array.isArray(assignTo) ? { ...x, assignees: [] } : x;
  };
  const manual = !edit && turns.length === 0 && drafts.length > 0; // konuşmadan, elle ekleme
  const dirty = !!edit && !!drafts[0] && editKey(drafts[0]) !== orig.current;
  const recMeta = rec
    ? [
      rec.createdByUid ? (nameOf(rec.createdByUid) === "Sen" ? "Sen ekledin" : `${nameOf(rec.createdByUid) || "Başkası"} ekledi`) : "",
      rec.createdAt ? relLow(rec.createdAt) : "",
      rec.updatedAt ? `düzenlendi ${relLow(rec.updatedAt)}` : "",
    ].filter(Boolean).join(" · ")
    : "";
  const title = edit ? EDIT_TITLE[edit.kind] : manual && drafts.length === 1 ? NEW_TITLE[drafts[0].type] : "Yeni kayıt";
  const listening = sp.status === "listening";
  const transcribing = sp.status === "transcribing";
  const busy = phase !== "idle";
  const chat = turns.length > 0;
  const placeholder = edit
    ? "Sesle veya yazıyla değiştir · örn. “saati 10 yap”"
    : ask?.kind === "time"
      ? "Saati yaz veya söyle · örn. “10 olsun” veya “fark etmez”"
      : ask?.kind === "date"
        ? "Günü yaz veya söyle · örn. “pazartesi”"
        : chat
          ? "Eklemek veya değiştirmek istediğin bir şey var mı?"
          : "örn. Yarın 10'da antrenman";

  function cancelRun() {
    runId.current += 1;
    ctrl.current?.abort();
    setPhase("idle");
  }

  const scrollToReply = () =>
    setTimeout(() => scrollRef.current?.querySelector("[data-last-reply]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);

  // Sesle konuşulduysa asistan da sesle dinlemeye devam eder (sessizlikte kapanır, hata çıkarsa sessiz kalır)
  const startAuto = () => {
    const L = live.current;
    if (L.open && !L.text) sp.start({ autoStop: SILENCE_MS, auto: true, quiet: true });
  };

  // ---- Yeni kayıt: her mesaj aynı taslağı tamamlar veya günceller ----
  async function run(t, viaVoice = false) {
    const s = t.trim();
    if (!s) return toast("Yaz veya mikrofona bas");
    // "Fiş yükle" gibi istekler plan/görev değil: fiş kamerasını aç
    if (!drafts.length && localReceipt(s)) {
      shut();
      openReceipt({ camera: true });
      return;
    }
    // İlk mesaj kısa ve kalıba uyuyorsa ("yarın 10'da antrenman ekle") yapay zekaya gitmeden hazırla
    const quick = !drafts.length && !reply.message ? localCreate(s) : null;
    const id = ++runId.current;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    if (viaVoice) setVoice(true);

    const known = drafts.filter((d) => !isBlank(d));
    // Devamlılık: ilk mesaj + sonraki mesajlar + asistan yanıtları + güncel taslaklar birlikte gider
    const history = turns.slice(-10).map((t) => ({ role: t.role, text: t.text }));
    const ctx = known.length || reply.message || history.length ? { mode: "create", drafts: known.map((d) => pub(d, assignable)), last: reply.message, history } : null;
    snaps.current.push({ drafts, reply, turns, ask });
    setTurns((p) => [...p, { role: "user", text: s }]);
    setText("");
    setHeard(s);
    setError("");
    setAsk(null);
    setPhase("thinking");
    try {
      const r = quick ? { items: quick.items, message: quick.message, source: "local" } : await interpretText(s, firstName, c.signal, ctx, staffNames, seed?.prefer);
      if (id !== runId.current) return;
      setPhase("preparing");
      await sleep(BEAT);
      if (id !== runId.current) return;

      const items = r.items.map((x) => withAssignees(x, s));
      askWhich(s, items);
      let next = !items.length ? drafts : ctx ? carry(known, items) : [...drafts, ...items.map(fresh)];
      const need = firstNeed(next);
      const first = !!need && !next[need.idx]._asked; // bu soru ilk kez soruluyor
      if (need) next = next.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d));
      const msg = r.message || "";

      setDrafts(next);
      setAsk(need);
      setReply({ engine: r.source, message: msg });
      if (msg) setTurns((p) => [...p, { role: "assistant", text: msg }]);
      if (r.warning) toast(r.warning);
      scrollToReply();
      navigator.vibrate?.([8, 30, 8]);
      if (msg) {
        const isQuestion = msg.trim().includes("?");
        if ((first || isQuestion) && viaVoice) tts.speakThen(msg, startAuto); // soru: okunsun, sonra mikrofon açılsın
        else tts.maybeSpeak(msg);
      }
    } catch (e) {
      if (id !== runId.current) return;
      const snap = snaps.current.pop();
      if (snap) {
        setTurns(snap.turns); // gönderilemeyen mesajı akıştan çıkar
        setAsk(snap.ask || null);
      }
      setError(e.message || "Yapay zeka yanıt vermedi");
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }

  // ---- Hızlı cevap düğmeleri: yapay zekayı beklemeden kartı hemen günceller ----
  function pickChip(kind, value) {
    if (!ask) return;
    const i = ask.idx;
    snaps.current.push({ drafts, reply, turns, ask });
    tts.stop();
    let label;
    let said;
    let next = drafts.map((d, k) => {
      if (k !== i) return d;
      if (kind === "time") return value === "allday" ? { ...d, time: "", allDay: true } : { ...d, time: value, allDay: false };
      return { ...d, date: value };
    });
    if (kind === "time") {
      label = value === "allday" ? "Tüm gün" : `Saat ${value}`;
      said = value === "allday" ? "Tamam, tüm gün olarak ekliyorum. Saati istersen sonra kartta ekleyebilirsin." : `Tamam, saati ${spokenTime(value)} yaptım.`;
    } else {
      label = value === todayStr() ? "Bugün" : "Yarın";
      said = `Tamam, günü ${spokenDay(value)} yaptım.`;
    }
    const need = firstNeed(next);
    if (need) {
      said += need.kind === "time" ? " Saat kaçta olsun?" : " Hangi gün olsun?";
      next = next.map((d, k) => (k === need.idx ? { ...d, _asked: true } : d));
    } else said += " Hazırsa oluşturabilirsin.";
    setDrafts(next);
    setAsk(need);
    setReply((r) => ({ ...r, message: said }));
    setTurns((p) => [...p, { role: "user", text: label, chip: true }, { role: "assistant", text: said }]);
    tts.maybeSpeak(said);
    scrollToReply();
    navigator.vibrate?.(8);
  }

  // ---- Düzenleme: sesle veya yazıyla yalnızca bu kaydı değiştir (Kaydet'e basana kadar kaydedilmez) ----
  async function runEdit(t, viaVoice = false) {
    const s = t.trim();
    if (!s) return toast("Yaz veya mikrofona bas");
    const cur = drafts[0];
    if (!cur) return;
    // Bekleyen taslak varsa kısa onay/ret ("gönder", "evet", "vazgeç") doğrudan uygulanır; başka bir şey taslağı değiştirir
    if (outbox) {
      const c = confirmWord(s);
      if (c === "yes") return confirmOutbox();
      if (c === "no") return cancelOutbox(true);
    }
    const id = ++runId.current;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    if (viaVoice) setVoice(true);
    setText("");
    setHeard(s);
    setError("");
    setEditReply("");
    setPhase("thinking");
    try {
      const r = await interpretText(
        s,
        firstName,
        c.signal,
        { mode: locked ? "reply" : "edit", kind: edit.kind, drafts: [pub(cur, assignable)], last: editReply, thread: threadNames, pendingSend: outbox?.text || "" },
        staffNames,
      );
      if (id !== runId.current) return;
      setPhase("preparing");
      await sleep(BEAT);
      if (id !== runId.current) return;
      const n = locked ? null : r.items.map((x) => withAssignees(x, s))[0]; // çalışan başkasının kaydını değiştiremez
      if (n && n.type === cur.type) {
        const clearTime = n.allDay === true && !n.time; // "tüm gün yap" / "saati kaldır"
        setDrafts([
          {
            ...cur,
            title: n.title || cur.title,
            ...(n.assignees?.length ? { assignees: n.assignees } : {}),
            ...(cur.type === "plan"
              ? {
                date: n.date || cur.date,
                endDate: n.endDate || cur.endDate,
                time: clearTime ? "" : n.time || cur.time,
                allDay: clearTime ? true : n.time ? false : cur.allDay,
                place: n.place || cur.place,
              }
              : {}),
            ...(cur.type === "task" ? { date: n.date || cur.date } : {}),
            ...(cur.type === "note" ? { body: n.body || cur.body } : {}),
          },
        ]);
      }
      const out = r.send || r.done ? { text: r.send || "", done: !!r.done } : null;
      setOutbox(out);
      setEditReply(r.message || (out ? "Göndereyim mi?" : "Güncelledim, kontrol edip kaydedebilirsin."));
      // Taslak hazırsa: sesle konuşulduysa taslağı okuyup mikrofonu açar, "gönder" / "vazgeç" diye cevap verilebilir
      const say = out?.text ? `${r.message || "Göndereyim mi?"} ${out.text}` : r.message;
      if (out && viaVoice) tts.speakThen(say, startAuto);
      else if (say) tts.maybeSpeak(say);
      navigator.vibrate?.([8, 30, 8]);
    } catch (e) {
      if (id !== runId.current) return;
      setError(e.message || "Yapay zeka yanıt vermedi");
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }

  // Asistan yeni kayıt niyetini çözdüyse taslak kartlarla ve yanıtla açılır; eksik bilgiyi burada tamamlarsın
  // Cümlede aynı ada sahip birden çok kişi geçtiyse ve sorumlu seçilemediyse kullanıcıya sor
  function askWhich(text, items) {
    if (!canAssign) return;
    const amb = assigneeHints(text, staffNames).ambiguous[0];
    setWhoAsk(amb && items.some((d) => !d.assignees?.length) ? amb : null);
  }
  function pickWhich(name) {
    const uid = members.find((m) => m.name === name)?.uid;
    if (uid) setDrafts((ds) => ds.map((d) => (d.assignees?.length ? d : { ...d, assignees: [uid], _general: false })));
    setWhoAsk(null);
  }

  function startPrefill(pf) {
    let next = pf.items.map((x) => withAssignees(x, pf.text)).map(fresh);
    askWhich(pf.text, next);
    const need = firstNeed(next);
    if (need) next = next.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d));
    setDrafts(next);
    setAsk(need);
    setHeard(pf.text);
    setTurns([{ role: "user", text: pf.text }, ...(pf.message ? [{ role: "assistant", text: pf.message }] : [])]);
    setReply({ engine: pf.engine || "", message: pf.message || "" });
    if (pf.message) {
      const isQuestion = pf.message.trim().includes("?");
      if ((need || isQuestion) && seed?.voice) tts.speakThen(pf.message, startAuto);
      else tts.maybeSpeak(pf.message);
    }
  }

  // Kayıt açıkken: gelen mesajlar hemen "görüldü" olur (ana sayfada ve simgedeki sayıda birikmez) ve
  // sunucuya "bu konuşmadayım" bilgisi gider (bu kayıttaki yeni mesaj için telefona bildirim gelmez)
  const viewKey = open && edit && rec ? `${edit.kind}-${edit.id}` : "";
  const unseen = rec && open ? unseenNotes(rec, myUid).length : 0;
  useEffect(() => {
    if (unseen && viewKey && document.visibilityState === "visible") markSeen(edit.kind, edit.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseen, viewKey]);
  useEffect(() => {
    if (!viewKey) return;
    const beat = () => setViewing(document.visibilityState === "visible" ? viewKey : null);
    beat();
    const t = setInterval(() => document.visibilityState === "visible" && beat(), 30e3);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", beat);
      setViewing(null);
    };
  }, [viewKey, setViewing]);

  // Beklerken geçen saniyeler
  useEffect(() => {
    if (phase !== "thinking") return;
    setSecs(0);
    const id = setInterval(() => setSecs((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Ekran kapanınca ses, dinleme ve bekleyen istek durur
  useEffect(() => {
    if (!open) {
      stopTts();
      cancelRun();
      sp.cancel();
      startedFor.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Her açılışta sıfırla; başlangıç metni varsa otomatik yapay zekaya gönder
  useEffect(() => {
    if (!open) return;
    snaps.current = [];
    if (startedFor.current === seed?.id) return;
    startedFor.current = seed?.id;
    setText("");
    setPhase("idle");
    setHeard("");
    setError("");
    setTurns([]);
    setAsk(null);
    setEditReply("");
    setOutbox(null);
    setAiMode("msg");
    setMsgText("");
    setPickAssign(null);
    setReply({ engine: "", message: "" });
    setVoice(!!seed?.voice);
    if (edit) {
      const list = { plan: plans, task: tasks, note: notes }[edit.kind] || [];
      const r = list.find((x) => x.id === edit.id);
      const d0 = r ? fromRecord(edit.kind, r) : null;
      if (r) markSeen(edit.kind, edit.id); // başkası eklediyse: "görüldü"
      orig.current = d0 ? editKey(d0) : "";
      setDrafts(d0 ? [d0] : []);
      return;
    }
    setDrafts(seed?.type ? [{ ...blank(seed.type), ...(seed.date ? { date: seed.date } : {}) }] : []); // takvimden: seçili gün hazır gelir
    if (seed?.prefill) startPrefill(seed.prefill);
    else if (seed?.text) run(seed.text, !!seed.voice);
    else if (seed?.listen) sp.start({ autoStop: SILENCE_MS }); // sayfa çubuğundaki mikrofon: açılır açılmaz dinler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed?.id]);

  const update = (i, patch) => setDrafts((p) => p.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  const remove = (i) => setDrafts((p) => p.filter((_, k) => k !== i));
  const changeType = (i, type) => update(i, { type, ...(type === "note" && !drafts[i].body ? { body: drafts[i].title } : {}) });

  const shut = () => {
    sp.cancel();
    cancelRun();
    onClose();
  };

  // Bekleyen isteği bırak, metni geri getir (tekrar düzenleyip gönderebilsin)
  function abort() {
    const t = heard;
    cancelRun();
    const snap = snaps.current.pop();
    if (snap && !edit) {
      setTurns(snap.turns);
      setDrafts(snap.drafts);
      setReply(snap.reply);
      setAsk(snap.ask || null);
    }
    setText(t);
  }

  // Son mesajı geri al: önceki duruma dön, metni yazı alanına getir
  function fixLast() {
    const snap = snaps.current.pop();
    if (!snap) return;
    tts.stop();
    const lastUser = [...turns].reverse().find((t) => t.role === "user");
    setText(lastUser?.chip ? "" : lastUser?.text || "");
    setTurns(snap.turns);
    setDrafts(snap.drafts);
    setReply(snap.reply);
    setAsk(snap.ask || null);
    setError("");
  }

  // Kaydet: sorumlusu olmayan kayıt varsa önce "Sorumlu eklemek ister misin?" sorulur (ana hesap, çalışan varken).
  // Yapay zeka görevliyi anlamadıysa buradan elle seçilir.
  async function create() {
    if (text.trim()) return toast("Yazdığın metni önce gönder (↑) ya da sil");
    if (!drafts.length) return toast("Yaz, konuş veya aşağıdan ekle");
    for (const d of drafts) {
      const e = check(d);
      if (e) return toast(e);
    }
    if (canAssign && drafts.some((d) => !d.assignees?.length && !d._general)) {
      setPickAssign([]);
      navigator.vibrate?.(8);
      return;
    }
    finishCreate(drafts);
  }

  // pick: sorumlu sorusunda seçilenler; yalnızca sorumlusu olmayan kayıtlara eklenir
  function saveWith(pick) {
    setPickAssign(null);
    finishCreate(drafts.map((d) => (!d.assignees?.length && !d._general && pick.length ? { ...d, assignees: pick } : d)));
  }

  async function finishCreate(list) {
    const noTime = list.some((d) => d.type === "plan" && !d.time && !d.endDate && !d.allDay);
    const r = await saveDrafts(list.map(tidy), { source: voice ? "voice" : "manual", by });
    if (!r || (r.plans + r.tasks + r.notes === 0)) return toast("Kayıt sırasında hata oluştu");
    // Kullanıcının onayladığı sonuç: en değerli öğrenme örneği (ilk söylediği cümle + kaydettiği türler)
    const said = turns.find((t) => t.role === "user" && !t.chip)?.text || heard;
    if (said) record(said, labelFromItems(list), "user");
    const parts = [];
    if (r.plans) parts.push(`${r.plans} plan`);
    if (r.tasks) parts.push(`${r.tasks} görev`);
    if (r.notes) parts.push(`${r.notes} not`);
    const who = uidsToNames([...new Set(list.flatMap((d) => d.assignees || []))], members).map((n) => n.split(" ")[0]);
    toast(`${parts.join(", ")} kaydedildi${who.length ? ` · ${who.join(", ")}` : ""}${noTime ? " · saat yok, tüm gün" : ""}`);
    navigator.vibrate?.([10, 40, 10]);
    onClose();
  }

  // Asistanın hazırladığı mesajı gönderir / tamamlandı işaretler (onaydan sonra). Kaydedilmemiş değişiklik varsa önce kaydeder.
  function confirmOutbox() {
    const o = outbox;
    if (!o || !edit) return;
    if (!locked && dirty) {
      const e = drafts[0] ? check(drafts[0]) : "Kayıt bulunamadı";
      if (e) return toast(e);
    }
    if (o.text) addReply(edit.kind, edit.id, o.text);
    if (o.done) {
      if (locked) setMyDone(edit.kind, edit.id, true);
      else if (edit.kind === "task" && !rec?.done) toggleTask(edit.id);
    }
    setOutbox(null);
    setEditReply("");
    tts.maybeSpeak(o.text ? "Gönderdim." : "Tamamdır.");
    toast(o.text && o.done ? `Mesaj gönderildi · ${doneOf(edit.kind).state.toLocaleLowerCase("tr-TR")}` : o.text ? "Mesaj gönderildi" : doneOf(edit.kind).toast);
    if (!locked && dirty) saveEdit();
  }
  function cancelOutbox(spoken = false) {
    setOutbox(null);
    setEditReply(spoken ? "Tamam, göndermedim." : "");
    if (spoken) tts.maybeSpeak("Tamam, göndermedim.");
  }

  function saveEdit() {
    const d = drafts[0];
    const e = d ? check(d) : "Kayıt bulunamadı";
    if (e) return toast(e);
    updateRecord(edit.kind, edit.id, { ...toPatch(d), ...(canAssign ? { assignees: d.assignees || [] } : {}) }, by);
    toast("Güncellendi");
    onClose();
  }

  // Tek dokunuşla siler; bildirimdeki "Geri al" ile 5 sn içinde geri alınabilir
  function removeRecord() {
    removeWithUndo(edit.kind, edit.id);
    onClose();
  }

  const staged = listening || transcribing || busy;
  const send = () => (edit ? runEdit(text, false) : run(text, false));
  const composer = <Composer value={text} onChange={setText} onSend={send} onMic={() => sp.start({ autoStop: SILENCE_MS })} busy={busy} placeholder={placeholder} />;
  // Kayıt içi asistan (mesaj kutusunda): değiştir ya da mesajı yazdır; taslak onayla gider
  const panel = edit ? (
    <AssistantPanel
      kind={edit.kind}
      reply={editReply}
      out={outbox}
      saveToo={!locked && dirty}
      onConfirm={confirmOutbox}
      onCancel={() => cancelOutbox(false)}
      onEdit={() => {
        setMsgText(outbox?.text || "");
        setAiMode("msg");
        setOutbox(null);
        setEditReply("Mesajı düzenleyip Mesaj modunda gönderebilirsin.");
      }}
    />
  ) : null;
  const assistant = edit
    ? {
        onAsk: (t) => runEdit(t, false),
        onMic: () => sp.start({ autoStop: SILENCE_MS }),
        busy,
        panel,
        mode: aiMode,
        setMode: setAiMode,
        text: msgText,
        setText: setMsgText,
        hint: locked ? "örn. tamamladım, ana hesaba faturanın masada olduğunu yaz" : "örn. saati 10 yap · Ali'ye kargonun geciktiğini söyle",
      }
    : null;
  const primary = "h-12 flex-[1.6] rounded-xl bg-acc text-base font-semibold text-white transition active:scale-[.98] disabled:opacity-40";
  const secondary = "h-12 flex-1 rounded-xl border border-line bg-card text-base font-semibold transition active:scale-[.98]";

  const askObj = ask
    ? {
      chips:
        ask.kind === "time"
          ? [...TIME_CHIPS.map(([l, v]) => ({ label: l, onPick: () => pickChip("time", v) })), { label: "Tüm gün", onPick: () => pickChip("time", "allday") }]
          : [{ label: "Bugün", onPick: () => pickChip("date", todayStr()) }, { label: "Yarın", onPick: () => pickChip("date", addDays(1)) }],
      onMic: () => sp.start({ autoStop: SILENCE_MS }),
      hint: ask.kind === "time" ? "Cevap vermezsen tüm gün olarak eklerim." : "",
    }
    : null;

  const errorCard = error && (
    <div className="fade-in mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <p className="flex items-center gap-2 text-[0.9375rem] font-semibold">
        <Icon name="alert" className="size-[1.125rem]" /> Şu an anlayamadım
      </p>
      <p className="mt-1 text-[0.875rem] opacity-90">{error}</p>
      <button onClick={() => (edit ? runEdit(heard, voice) : run(heard, voice))} className="mt-3 h-10 rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white transition active:scale-95">
        Tekrar dene
      </button>
    </div>
  );

  return (
    <Screen voice open={open} onClose={shut} title={title}>
      {/* Üst çubuk (sabit) */}
      <header className="flex shrink-0 items-center justify-between px-5 py-3">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <div className="flex items-center gap-2">
          {edit && locked ? null : edit ? (
            <button onClick={removeRecord} aria-label="Sil" className="grid size-9 place-items-center rounded-full text-rec transition active:scale-90 active:bg-rec/10">
              <Icon name="trash" className="size-5" />
            </button>
          ) : (
            <SpeakToggle />
          )}
          <button onClick={shut} aria-label="Kapat" className="grid size-9 place-items-center rounded-full bg-card text-mut ring-1 ring-line transition active:scale-90">
            <Icon name="x" className="size-[1.125rem]" />
          </button>
        </div>
      </header>

      {/* İçerik (kayar) */}
      <div ref={scrollRef} data-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        {listening ? (
          <ListeningStage
            sp={sp}
            total={SILENCE_MS / 1000}
            prompt={
              edit
                ? [editReply, outbox?.text && `“${outbox.text}”`].filter(Boolean).join("\n")
                : turns.at(-1)?.role === "assistant"
                  ? turns.at(-1).text
                  : ask
                    ? reply.message
                    : ""
            }
            onCancel={sp.cancel}
            onStopEdit={() => sp.stop("edit")}
            onSend={() => sp.stop("send")}
          />
        ) : transcribing || busy ? (
          <ProcessingStage
            step={transcribing ? "transcribing" : phase}
            voice={voice || transcribing}
            heard={transcribing ? `${sp.finalText}${sp.interim}`.trim() : heard}
            secs={secs}
            onCancel={transcribing ? sp.cancel : abort}
          />
        ) : edit && locked && rec ? (
          <AssignedView
            kind={edit.kind}
            rec={rec}
            planTitle={linkedPlan}
            myUid={myUid}
            nameOf={nameOf}
            onDone={(on) => {
              setMyDone(edit.kind, edit.id, on);
              toast(on ? doneOf(edit.kind).toast : "Geri alındı");
            }}
            onReply={(t) => {
              addReply(edit.kind, edit.id, t);
              toast("Mesaj gönderildi");
            }}
            assistant={assistant}
            docked
          />
        ) : edit ? (
          <>
            {errorCard}
            {drafts[0] && (
              <EditCard
                d={drafts[0]}
                meta={recMeta}
                planTitle={linkedPlan}
                done={!!rec?.done}
                onToggleDone={() => {
                  toggleTask(edit.id);
                  toast(rec?.done ? "Görev yeniden açıldı" : "Görev yapıldı");
                }}
                assign={assign}
                onAddStaff={addStaff}
                onChange={(patch) => update(0, patch)}
                acks={
                  rec && !isStaff
                    ? assigneesOf(rec)
                      .filter((u) => u !== rec.createdByUid)
                      .map((u) => ({ uid: u, name: nameOf(u) || "Kişi", ...ackState(rec, u) }))
                    : []
                }
              />
            )}
            {/* Mesajlar (atananlar ve ana hesap) + asistan: değiştir ya da mesajı yazdır */}
            {hasThread && <Replies key={rec.id} rec={rec} myUid={myUid} nameOf={nameOf} onSend={(t) => addReply(edit.kind, edit.id, t)} placeholder="Mesaj yaz…" assistant={assistant} docked />}
            <div className="mt-3" />
            {/* Konuşması olmayan kayıtta: ana asistan bu kaydı bilerek açılır (değiştir, tamamla, sil, birine yaz) */}
            {!hasThread && rec && (
              <div className="flex items-center gap-3 rounded-2xl bg-card px-3.5 py-3 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
                <MiniOrb focus={recordFocus(edit.kind, rec, nameOf, myUid)} examples={[edit.kind === "task" ? "Bu görevi tamamla" : "Saatini değiştir", "Yarına ertele", "Ali'ye bununla ilgili yaz"]} />
                <span className="min-w-0 text-[0.8125rem] leading-snug text-mut">
                  <b className="block text-[0.875rem] font-semibold text-fg">Asistana söyle</b>
                  Dokun konuş, basılı tut yaz: değiştir, ertele, birine yaz.
                </span>
              </div>
            )}
            {!hasThread && outbox && <div className="mt-3 overflow-hidden rounded-2xl bg-card">{panel}</div>}
            {!hasThread && !outbox && editReply && (
              <div className="fade-in mt-3 flex items-start gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-acc text-white"><Icon name="spark" className="size-3.5" /></span>
                <div className="min-w-0 rounded-2xl rounded-tl-md bg-card px-3.5 py-2.5 ring-1 ring-line">
                  <p className="text-[0.9375rem] leading-snug">{editReply}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {manual ? (
              /* Elle ekleme: yalnızca form */
              <>
                {drafts.map((d, i) => (
                  <div key={d._id} className={i ? "mt-6" : ""}>
                    <DraftCard d={d} index={i} plan={plan} bare noRemove={drafts.length === 1} assign={assign} onAddStaff={addStaff} onChange={update} onType={changeType} onRemove={remove} />
                  </div>
                ))}
                <button onClick={() => setDrafts((p) => [...p, blank(drafts[drafts.length - 1].type)])} className="mx-auto mt-5 block text-[0.875rem] font-medium text-mut transition active:opacity-50">
                  + Bir kayıt daha
                </button>
              </>
            ) : !chat ? (
              /* Başlangıç: tek soru, tek yazı alanı, elle ekleme için üç sade düğme */
              <div className="pt-6">
                <p className="px-1 text-[1.375rem] font-semibold leading-snug tracking-tight">Ne eklemek istersin?</p>
                <p className="mt-1 px-1 text-[0.875rem] text-mut">Yaz ya da konuş; plan, görev ya da not olarak ben ayırırım.</p>
                <div className="mt-5">{composer}</div>
                <div className="mt-8 flex items-center gap-2 px-1">
                  <span className="mr-1 text-[0.8125rem] text-mut">Elle ekle</span>
                  {MANUAL.map(([t, l, ic]) => (
                    <button
                      key={t}
                      onClick={() => setDrafts([blank(t)])}
                      className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-[0.875rem] font-medium shadow-[0_1px_3px_rgba(38,40,44,.07)] transition active:scale-95"
                    >
                      <Icon name={ic} className="size-4 text-acc" />
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Konuşma: mesajlar + kaydedilecekler + altta yazı alanı */
              <>
                <Thread turns={turns} engine={reply.engine} tts={tts} ask={askObj} canFix={!busy} onFix={fixLast} />
                {errorCard}
                {whoAsk && (
                  <div className="fade-in mt-4 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-line">
                    <b className="block text-[0.9375rem] font-semibold">Birden fazla {whoAsk.said} var, hangisi?</b>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {whoAsk.options.map((n) => (
                        <button key={n} type="button" onClick={() => pickWhich(n)} className="rounded-full bg-acc/10 px-3.5 py-1.5 text-[0.9375rem] font-medium text-acc transition active:scale-95">
                          {n}
                        </button>
                      ))}
                      <button type="button" onClick={() => setWhoAsk(null)} className="rounded-full px-3 py-1.5 text-[0.875rem] text-mut">
                        Hiçbiri
                      </button>
                    </div>
                  </div>
                )}
                <section className="mt-6">
                  {drafts.length > 0 && <h3 className="px-1 text-[0.8125rem] font-medium text-mut">Kaydedilecek · {drafts.length}</h3>}
                  {drafts.length > 0 && (
                    <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
                      {drafts.map((d, i) => (
                        <ItemCard key={d._id} d={d} index={i} plan={plan} assign={assign} onAddStaff={addStaff} onChange={update} onType={changeType} onRemove={remove} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>

      {/* Alt butonlar (sabit). Dinleme ve işleme sahnelerinde kendi butonları var.
          Konuşma sırasında (yeni kayıt): yazı alanı + Konuş + tek ana düğme (yazı varsa Gönder, yoksa Kaydet) bir arada. */}
      {!staged && edit && rec && (locked || hasThread) ? (
        /* Mesajlaşma: yazma alanı altta sabit (WhatsApp gibi); değişiklik varsa üstünde Kaydet */
        <footer className="shrink-0 border-t border-line bg-bg px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
          {!locked && dirty && (
            <button onClick={saveEdit} className="mb-2.5 h-11 w-full rounded-xl bg-acc text-[0.9375rem] font-semibold text-white transition active:scale-[.98]">
              Değişikliği kaydet
            </button>
          )}
          <ReplyComposer
            onSend={(t) => {
              addReply(edit.kind, edit.id, t);
              if (locked) toast("Mesaj gönderildi");
            }}
            placeholder={locked ? "Ana hesaba mesaj yaz…" : "Mesaj yaz…"}
            assistant={assistant}
            kind={edit.kind}
            rec={rec}
            nameOf={nameOf}
            myUid={myUid}
          />
        </footer>
      ) : !staged && !locked && !edit && chat && !manual && !pickAssign ? (
        <footer className="shrink-0 border-t border-line bg-bg px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <ActionDock
            value={text}
            onChange={setText}
            onSend={send}
            onMic={() => sp.start({ autoStop: SILENCE_MS })}
            busy={busy}
            placeholder={placeholder}
            idle={{ label: drafts.length > 1 ? `Kaydet (${drafts.length})` : "Kaydet", icon: "check", on: drafts.length > 0, run: create }}
          />
        </footer>
      ) : !staged && !locked && (edit || drafts.length > 0) && (
        <footer className="flex shrink-0 gap-2.5 bg-bg px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {edit ? (
            <button onClick={saveEdit} disabled={!dirty} className={`${primary} flex-1`}>
              {dirty ? "Kaydet" : "Değişiklik yok"}
            </button>
          ) : pickAssign ? (
            <AssignAsk
              members={members}
              pick={pickAssign}
              count={drafts.filter((d) => !d.assignees?.length && !d._general).length}
              total={drafts.length}
              onPick={setPickAssign}
              onSave={saveWith}
              onBack={() => setPickAssign(null)}
            />
          ) : (
            <button onClick={create} className={`${primary} flex-1`}>
              {drafts.length > 1 ? `Kaydet (${drafts.length})` : "Kaydet"}
            </button>
          )}
        </footer>
      )}
    </Screen>
  );
}

// Kaydetmeden önce: "Sorumlu eklemek ister misin?" Çalışan seçilirse sorumlusu olmayan kayıtlara eklenir.
function AssignAsk({ members, pick, count, total, onPick, onSave, onBack }) {
  const toggle = (uid) => onPick(pick.includes(uid) ? pick.filter((u) => u !== uid) : [...pick, uid]);
  const names = pick.map((u) => members.find((m) => m.uid === u)?.name.split(" ")[0]).filter(Boolean);
  return (
    <div className="animate-pop w-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <b className="block text-[1rem] font-semibold tracking-tight">Sorumlu eklemek ister misin?</b>
          <small className="text-[0.8125rem] text-mut">
            {total > 1 && count < total ? `Sorumlusu olmayan ${count} kayda eklenir.` : total > 1 ? `${total} kaydın hepsine eklenir.` : "Birden fazla kişi seçebilirsin."}
          </small>
        </div>
        <button type="button" onClick={onBack} aria-label="Geri" className="grid size-8 shrink-0 place-items-center rounded-full text-mut active:bg-line">
          <Icon name="x" className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {members.map((m) => {
          const on = pick.includes(m.uid);
          return (
            <button
              key={m.uid}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(m.uid)}
              className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3.5 text-[0.9375rem] font-medium transition active:scale-95 ${on ? "bg-acc text-white" : "bg-card text-fg ring-1 ring-line"}`}
            >
              <span className={`grid size-7 place-items-center rounded-full text-[0.75rem] font-semibold ${on ? "bg-white/20" : "bg-acc/10 text-acc"}`}>
                {on ? <Icon name="check" className="size-4" /> : (m.name || "?")[0]}
              </span>
              {m.name}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2.5">
        <button type="button" onClick={() => onSave([])} className="h-12 flex-1 whitespace-nowrap rounded-xl border border-line bg-card px-2 text-[0.9375rem] font-semibold transition active:scale-[.98]">
          Sorumlusuz kaydet
        </button>
        <button
          type="button"
          onClick={() => onSave(pick)}
          disabled={!pick.length}
          className="h-12 min-w-0 flex-1 truncate rounded-xl bg-acc px-3 text-[0.9375rem] font-semibold text-white transition active:scale-[.98] disabled:opacity-40"
        >
          {names.length ? `${names.join(", ")} ile kaydet` : "Kişi seç"}
        </button>
      </div>
    </div>
  );
}
