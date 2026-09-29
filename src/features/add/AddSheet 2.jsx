"use client";

import { useEffect, useRef, useState } from "react";
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
import { addDays, cap, todayStr } from "@/lib/utils/format";
import { localReceipt } from "@/lib/assistantLocal";
import { localCreate } from "@/lib/commands";
import { labelFromItems } from "@/lib/brain/model";
import { assigneesOf } from "@/lib/people";
import { fixNames, namesToUids, uidsToNames } from "@/lib/names";
import { record } from "@/lib/brain/store";
import { spokenDay, spokenTime } from "@/lib/utils/speak";
import { Composer } from "./Composer";
import { DraftCard } from "./DraftCard";
import { ItemCard } from "./ItemCard";
import { Thread } from "./Thread";
import { ListeningStage, ProcessingStage } from "./Stage";

const SILENCE_MS = 0; // Otomatik kapanma kapalı
const BEAT = 450; // "hazırlanıyor" adımının görünme süresi (ms)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIME_CHIPS = [["Sabah 09:00", "09:00"], ["Öğleden sonra 14:00", "14:00"], ["Akşam 18:00", "18:00"]];

const EDIT_TITLE = { plan: "Planı düzenle", task: "Görevi düzenle", note: "Notu düzenle" };
const NEW_TITLE = { plan: "Yeni plan", task: "Yeni görev", note: "Yeni not" };
const MANUAL = [["plan", "Plan", "cal"], ["task", "Görev", "task"], ["note", "Not", "note"]];

let seq = 0;
const nid = () => `d${Date.now()}_${seq++}`;
const blank = (type) => ({ _id: nid(), type, title: "", body: "", date: "", endDate: "", time: "", allDay: false, place: "", link: false, cat: "Genel", assignees: [] });
const isBlank = (d) => !(d.title || "").trim() && !(d.body || "").trim();
// Yapay zekaya gönderilecek sade taslak (askedTime: bu plan için saat zaten soruldu, tekrar sorma)
const pub = (d, members = []) => ({
  ...(members.length ? { assignTo: uidsToNames(d.assignees, members) } : {}),
  type: d.type, title: d.title || "", body: d.body || "", date: d.date || "", endDate: d.endDate || "", time: d.time || "",
  allDay: !!d.allDay, askedTime: !!d._asked, place: d.place || "", category: d.cat || "Genel", linkToPlan: !!d.link,
});
// Güncel listede kartlar aynı sıra ve türdeyse kimlik ve bayraklarını koru (açık kartlar kapanmasın)
const carry = (old, next) =>
  next.map((d, i) => {
    const o = old[i] && old[i].type === d.type ? old[i] : null;
    return { ...d, title: cap(d.title || ""), _id: o ? o._id : nid(), _asked: o ? !!o._asked : false, assignees: d.assignees?.length ? d.assignees : o?.assignees || [], allDay: !!(d.allDay || o?.allDay) && !d.time };
  });
const fresh = (x) => ({ ...x, title: cap(x.title || ""), _id: nid(), _asked: false, assignees: x.assignees || [], allDay: !!x.allDay && !x.time });
// Kaydetmeden önce: başlık ve not metni büyük harfle başlasın, boşluklar temizlensin
const tidy = (d) => ({ ...d, title: cap((d.title || "").trim()), body: cap((d.body || "").trim()), place: cap((d.place || "").trim()) });

// Eksik bilgi: plan günü (zorunlu) ve tek günlük planın saati (cevap gelmezse tüm gün olur)
const needOf = (d) => (d.type !== "plan" ? "" : !d.date ? "date" : !d.time && !d.endDate && !d.allDay ? "time" : "");
function firstNeed(list) {
  for (const kind of ["date", "time"]) {
    const idx = list.findIndex((d) => needOf(d) === kind);
    if (idx >= 0) return { idx, kind };
  }
  return null;
}

const fromRecord = (kind, r) => ({
  ...(kind === "plan"
    ? { ...blank("plan"), title: r.title, date: r.date, endDate: r.endDate || "", time: r.time || "", allDay: r.allDay ?? !r.time, place: r.place || "", cat: r.cat }
    : kind === "task"
      ? { ...blank("task"), title: r.title, date: r.due || "", cat: r.cat }
      : { ...blank("note"), title: r.title, body: r.body, cat: r.cat }),
  assignees: assigneesOf(r),
});

const toPatch = (raw) => {
  const d = tidy(raw);
  return d.type === "plan"
    ? {
      title: d.title.trim(),
      date: d.date,
      endDate: d.endDate && d.endDate !== d.date ? d.endDate : "",
      time: d.time || "",
      allDay: !d.time,
      durationMin: d.time ? 60 : null,
      timeSource: d.time ? "user" : "none",
      place: (d.place || "").trim(),
    }
    : d.type === "task"
      ? { title: d.title.trim(), due: d.date || null }
      : { title: (d.title || d.body).trim(), body: (d.body || d.title).trim() };
};

const check = (d) => {
  if (d.type === "note" ? !(d.title.trim() || d.body.trim()) : !d.title.trim()) return "Başlık gerekli";
  if (d.type === "plan" && !d.date) return "Plan için tarih seç";
  return "";
};

export function AddSheet({ open, onClose, seed }) {
  const toast = useToast();
  const tts = useTts();
  const { stop: stopTts } = tts;
  const { profile } = useAuth();
  const { plans, tasks, notes, saveDrafts, updateRecord, removeWithUndo, members, isStaff } = useData();
  const { openReceipt } = useReceipt();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | thinking | preparing
  const [secs, setSecs] = useState(0);
  const [voice, setVoice] = useState(false);
  const [heard, setHeard] = useState(""); // yapay zekaya giden son metin
  const [reply, setReply] = useState({ engine: "", message: "" });
  const [turns, setTurns] = useState([]); // konuşma: { role: "user" | "assistant", text, chip? }
  const [ask, setAsk] = useState(null); // bekleyen soru: { idx, kind: "date" | "time" }
  const [editReply, setEditReply] = useState("");
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
  const plan = drafts.find((d) => d.type === "plan");
  // Ana hesap her kayda sorumlu çalışan(lar) seçebilir; çalışanın eklediği kayıt yine onda kalır
  const canAssign = !isStaff && members.length > 0;
  const assign = canAssign ? members : null;
  const assignable = assign || [];
  // Yapay zekanın verdiği sorumlu adlarını çalışan kimliklerine çevirir (atama yetkisi yoksa yok sayılır)
  const withAssignees = ({ assignTo, ...x }) => (canAssign && Array.isArray(assignTo) ? { ...x, assignees: namesToUids(assignTo, members) } : x);
  const manual = !edit && turns.length === 0 && drafts.length > 0; // konuşmadan, elle ekleme
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
      const r = quick ? { items: quick.items, message: quick.message, source: "local" } : await interpretText(s, firstName, c.signal, ctx, staffNames);
      if (id !== runId.current) return;
      setPhase("preparing");
      await sleep(BEAT);
      if (id !== runId.current) return;

      const items = r.items.map(withAssignees);
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
      const r = await interpretText(s, firstName, c.signal, { mode: "edit", drafts: [pub(cur, assignable)], last: "" }, staffNames);
      if (id !== runId.current) return;
      setPhase("preparing");
      await sleep(BEAT);
      if (id !== runId.current) return;
      const n = r.items.map(withAssignees)[0];
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
      setEditReply(r.message || "Güncelledim, kontrol edip kaydedebilirsin.");
      if (r.message) tts.maybeSpeak(r.message);
      navigator.vibrate?.([8, 30, 8]);
    } catch (e) {
      if (id !== runId.current) return;
      setError(e.message || "Yapay zeka yanıt vermedi");
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }

  // Asistan yeni kayıt niyetini çözdüyse taslak kartlarla ve yanıtla açılır; eksik bilgiyi burada tamamlarsın
  function startPrefill(pf) {
    let next = pf.items.map(withAssignees).map(fresh);
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
    setReply({ engine: "", message: "" });
    setVoice(!!seed?.voice);
    if (edit) {
      const list = { plan: plans, task: tasks, note: notes }[edit.kind] || [];
      const r = list.find((x) => x.id === edit.id);
      setDrafts(r ? [fromRecord(edit.kind, r)] : []);
      return;
    }
    setDrafts(seed?.type ? [blank(seed.type)] : []);
    if (seed?.prefill) startPrefill(seed.prefill);
    else if (seed?.text) run(seed.text, true);
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

  async function create() {
    if (text.trim()) return toast("Yazdığın metni önce gönder (↑) ya da sil");
    if (!drafts.length) return toast("Yaz, konuş veya aşağıdan ekle");
    for (const d of drafts) {
      const e = check(d);
      if (e) return toast(e);
    }
    const noTime = drafts.some((d) => d.type === "plan" && !d.time && !d.endDate && !d.allDay);
    const r = await saveDrafts(drafts.map(tidy), { source: voice ? "voice" : "manual", by });
    if (!r || (r.plans + r.tasks + r.notes === 0)) return toast("Kayıt sırasında hata oluştu");
    // Kullanıcının onayladığı sonuç: en değerli öğrenme örneği (ilk söylediği cümle + kaydettiği türler)
    const said = turns.find((t) => t.role === "user" && !t.chip)?.text || heard;
    if (said) record(said, labelFromItems(drafts), "user");
    const parts = [];
    if (r.plans) parts.push(`${r.plans} plan`);
    if (r.tasks) parts.push(`${r.tasks} görev`);
    if (r.notes) parts.push(`${r.notes} not`);
    toast(`${parts.join(", ")} kaydedildi${noTime ? " · saat yok, tüm gün" : ""}`);
    navigator.vibrate?.([10, 40, 10]);
    onClose();
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
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <Icon name="alert" className="size-[18px]" /> Şu an anlayamadım
      </p>
      <p className="mt-1 text-[14px] opacity-90">{error}</p>
      <button onClick={() => (edit ? runEdit(heard, voice) : run(heard, voice))} className="mt-3 h-10 rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white transition active:scale-95">
        Tekrar dene
      </button>
    </div>
  );

  return (
    <Screen open={open} onClose={shut} title={title}>
      {/* Üst çubuk (sabit) */}
      <header className="flex shrink-0 items-center justify-between px-5 py-3">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <div className="flex items-center gap-2">
          <SpeakToggle />
          <button onClick={shut} aria-label="Kapat" className="grid size-9 place-items-center rounded-full bg-card text-mut ring-1 ring-line transition active:scale-90">
            <Icon name="x" className="size-[18px]" />
          </button>
        </div>
      </header>

      {/* İçerik (kayar) */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        {listening ? (
          <ListeningStage
            sp={sp}
            total={SILENCE_MS / 1000}
            prompt={ask ? reply.message : ""}
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
        ) : edit ? (
          <>
            {composer}
            {editReply && (
              <div className="fade-in mt-3 flex items-start gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-acc text-white"><Icon name="spark" className="size-3.5" /></span>
                <div className="min-w-0 rounded-2xl rounded-tl-md bg-card px-3.5 py-2.5 ring-1 ring-line">
                  <p className="text-[15px] leading-snug">{editReply}</p>
                </div>
              </div>
            )}
            {errorCard}
            {drafts[0] && <DraftCard d={drafts[0]} index={0} plan={null} editing assign={assign} onChange={update} onType={changeType} onRemove={remove} />}
            {linkedPlan && (
              <p className="mt-3 flex items-center gap-1.5 px-1 text-[13px] text-mut">
                <Icon name="cal" className="size-4" /> Bağlı plan: {linkedPlan}
              </p>
            )}
          </>
        ) : (
          <>
            {manual ? (
              /* Elle ekleme: yalnızca form */
              <>
                {drafts.map((d, i) => (
                  <div key={d._id} className={i ? "mt-6" : ""}>
                    <DraftCard d={d} index={i} plan={plan} bare noRemove={drafts.length === 1} assign={assign} onChange={update} onType={changeType} onRemove={remove} />
                  </div>
                ))}
                <button onClick={() => setDrafts((p) => [...p, blank(drafts[drafts.length - 1].type)])} className="mx-auto mt-5 block text-[14px] font-medium text-mut transition active:opacity-50">
                  + Bir kayıt daha
                </button>
              </>
            ) : !chat ? (
              /* Başlangıç: tek soru, tek yazı alanı, elle ekleme için üç sade düğme */
              <div className="pt-6">
                <p className="px-1 text-[22px] font-semibold leading-snug tracking-tight">Ne eklemek istersin?</p>
                <p className="mt-1 px-1 text-[14px] text-mut">Yaz ya da konuş; plan, görev ya da not olarak ben ayırırım.</p>
                <div className="mt-5">{composer}</div>
                <div className="mt-8 flex items-center gap-2 px-1">
                  <span className="mr-1 text-[13px] text-mut">Elle ekle</span>
                  {MANUAL.map(([t, l, ic]) => (
                    <button
                      key={t}
                      onClick={() => setDrafts([blank(t)])}
                      className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-[14px] font-medium shadow-[0_1px_3px_rgba(38,40,44,.07)] transition active:scale-95"
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
                <section className="mt-6">
                  {drafts.length > 0 && <h3 className="px-1 text-[13px] font-medium text-mut">Kaydedilecek · {drafts.length}</h3>}
                  {drafts.length > 0 && (
                    <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
                      {drafts.map((d, i) => (
                        <ItemCard key={d._id} d={d} index={i} plan={plan} assign={assign} onChange={update} onType={changeType} onRemove={remove} />
                      ))}
                    </div>
                  )}
                </section>
                {/* Yazı alanı altta sabit: cevabı ya da değişikliği hemen yazar veya konuşursun */}
                <div className="sticky bottom-0 -mx-5 mt-4 bg-bg px-5 pb-2 pt-3">{composer}</div>
              </>
            )}
          </>
        )}
      </div>

      {/* Alt butonlar (sabit). Dinleme ve işleme sahnelerinde kendi butonları var. */}
      {!staged && (edit || drafts.length > 0) && (
        <footer className="flex shrink-0 gap-2.5 bg-bg px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          {edit ? (
            <>
              <button onClick={removeRecord} className={`${secondary} text-rec`}>
                Sil
              </button>
              <button onClick={saveEdit} className={primary}>Kaydet</button>
            </>
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
