"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/ui/Screen";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useTts } from "@/features/speech/TtsProvider";
import { SpeakToggle } from "@/features/speech/SpeakToggle";
import { Composer } from "@/features/add/Composer";
import { Thread } from "@/features/add/Thread";
import { ListeningStage, ProcessingStage } from "@/features/add/Stage";
import { useSpeech } from "@/hooks/useSpeech";
import { askAssistant } from "@/services/assistantService";
import { buildDigest } from "@/lib/ai/digest";
import { PAGES, buildPatch, describeAction, isNo, isYes, localNavigate, localQuery, looksLikeCreate } from "@/lib/assistantLocal";
import { RecordList } from "./RecordList";

const SILENCE_MS = 0; // Otomatik kapanma kapalı
const BEAT = 350;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXAMPLES = ["Bu hafta neler var?", "Görevleri aç", "Tekneleri hazırla görevini tamamla", "Yarınki antrenmanı sil", "Bu yıl kaç plan yaptık?"];
const EMPTY = { show: [], pending: null, nav: "", engine: "", awaiting: false };

export function AssistantSheet({ open, onClose, seed }) {
  const router = useRouter();
  const toast = useToast();
  const tts = useTts();
  const { profile } = useAuth();
  const { plans, tasks, notes, receipts, toggleTask, updateRecord, deleteRecord } = useData();
  const { openAdd } = useAdd();
  const [text, setText] = useState("");
  const [turns, setTurns] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | thinking | preparing
  const [secs, setSecs] = useState(0);
  const [voice, setVoice] = useState(false);
  const [heard, setHeard] = useState("");
  const [cards, setCards] = useState(EMPTY);
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(false); // mikrofonla açıldı, dinleme başlıyor
  const scrollRef = useRef(null);
  const runId = useRef(0);
  const startedFor = useRef(null); // geliştirme modunda (Strict Mode) açılış iki kez çalışmasın
  const ctrl = useRef(null);
  const live = useRef({});
  live.current = { open, text };

  const firstName = (profile?.name || "").split(" ")[0];
  const by = { name: profile?.name ?? "Kullanıcı" };
  const find = (kind, id) => ({ plan: plans, task: tasks, note: notes }[kind] || []).find((x) => x.id === id);
  const busy = phase !== "idle";

  const sp = useSpeech({
    onFinal: (tx, mode) => {
      if (mode === "edit") setText((p) => (p ? `${p} ${tx}` : tx));
      else run(text ? `${text} ${tx}` : tx, true);
    },
    onFail: (m) => toast(m),
  });
  const listening = sp.status === "listening";
  const transcribing = sp.status === "transcribing";

  const startAuto = () => {
    if (live.current.open && !live.current.text) sp.start({ autoStop: SILENCE_MS, auto: true });
  };
  const scrollLater = () =>
    setTimeout(() => scrollRef.current?.querySelector("[data-last-reply]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);

  function cancelRun() {
    runId.current += 1;
    ctrl.current?.abort();
    setPhase("idle");
  }

  // Yanıtı akışa ekler, kartları günceller, sesli okur. Soruysa ve sesle konuşulduysa okuma bitince mikrofon açılır.
  function reply(message, extra = {}, viaVoice = false) {
    const { show = [], pending = null, nav = "", engine = "", expect = false } = extra;
    const awaiting = expect || !!pending;
    setTurns((p) => [...p, { role: "assistant", text: message }]);
    setCards({ show, pending, nav, engine, awaiting });
    scrollLater();
    navigator.vibrate?.([8, 30, 8]);
    const isQuestion = message.trim().includes("?");
    if ((awaiting || isQuestion) && viaVoice) tts.speakThen(message, startAuto);
    else tts.maybeSpeak(message);
  }

  // Sayfayı aç. Okuma kesilmesin diye TTS'i durdurmadan kapatır.
  function go(page, message) {
    if (message) tts.maybeSpeak(message);
    navigator.vibrate?.(8);
    onClose();
    router.push(PAGES[page].path);
  }

  function handle(r, s, viaVoice) {
    const msg = (r.message || "").trim();

    // Yeni kayıt: "Yeni kayıt" ekranına devret (eksik bilgiyi orada tamamlar)
    if (r.intent === "create" && r.items?.length) {
      onClose();
      openAdd({ prefill: { text: s, items: r.items, message: msg, engine: r.source }, voice: viaVoice });
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
      onClose();
      openAdd({ edit: { kind: opened.kind, id: opened.id } });
      return;
    }
    if (r.navigate && !pending.length && (r.intent === "navigate" || !r.show?.length)) {
      go(r.navigate, msg);
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
    if (viaVoice) setVoice(true);
    const history = fresh ? [] : turns.slice(-6).map((x) => ({ role: x.role, text: x.text }));
    setTurns((p) => [...p, { role: "user", text: s }]);
    setText("");
    setHeard(s);
    setError("");
    tts.stop();

    // Onay bekleyen işlem varsa "evet / hayır" yerelde çözülür
    if (!fresh && cards.pending) {
      if (isYes(s)) return confirmPending(true);
      if (isNo(s)) return cancelPending(true);
      setCards((c) => ({ ...c, pending: null, awaiting: false }));
    }
    // Yalnızca "görevleri aç" gibi kısa gezinme komutları anında
    const page = localNavigate(s);
    if (page) return go(page, `${PAGES[page].label} sayfasını açıyorum.`);

    const id = ++runId.current;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setPhase("thinking");
    try {
      const r = await askAssistant({ text: s, name: firstName, digest: buildDigest({ plans, tasks, notes, receipts, name: firstName }), history }, c.signal);
      if (id !== runId.current) return;
      setPhase("preparing");
      await sleep(BEAT);
      if (id !== runId.current) return;
      handle(r, s, viaVoice);
    } catch (e) {
      if (id !== runId.current) return;
      // Yapay zeka yok: ekleme isteğiyse Yeni kayıt ekranına devret (orada yedek kurallarla kart hazırlanır)
      if (looksLikeCreate(s)) {
        toast("Yapay zekaya ulaşamadım, kaydı basit kurallarla hazırlıyorum. Kontrol et.");
        onClose();
        openAdd({ text: s, voice: viaVoice });
        return;
      }
      const lq = localQuery(s, { plans, tasks });
      if (lq) reply(lq.show.length ? lq.message : `Yapay zekaya şu an ulaşamadım. ${lq.message}`, { show: lq.show, engine: "rules" }, viaVoice);
      else setError(e.message || "Asistan şu an yanıt vermedi");
    } finally {
      if (id === runId.current) setPhase("idle");
    }
  }

  function confirmPending(fromText = false) {
    const pend = cards.pending;
    if (!pend) return;
    if (!fromText) setTurns((p) => [...p, { role: "user", text: "Onayla", chip: true }]);
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
    setCards(EMPTY);
    setTurns((p) => [...p, { role: "assistant", text: said }]);
    tts.maybeSpeak(said);
    toast(n ? "Yapıldı" : "Kayıt bulunamadı");
    navigator.vibrate?.([10, 40, 10]);
  }

  function cancelPending(fromText = false) {
    if (!fromText) setTurns((p) => [...p, { role: "user", text: "Vazgeç", chip: true }]);
    const said = "Tamam, vazgeçtim.";
    setCards(EMPTY);
    setTurns((p) => [...p, { role: "assistant", text: said }]);
    tts.maybeSpeak(said);
  }

  // Bekleyen isteği bırak, metni geri getir
  function abort() {
    const t = heard;
    cancelRun();
    setTurns((p) => p.slice(0, -1));
    setText(t);
  }

  const shut = () => {
    sp.cancel();
    cancelRun();
    tts.stop();
    onClose();
  };

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
        setCards(EMPTY);
        setText("");
        setHeard("");
        setError("");
        setPhase("idle");
      }, 350);
      return () => clearTimeout(t);
    }
    if (startedFor.current === seed?.id) return;
    startedFor.current = seed?.id;
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
      sp.start({ autoStop: SILENCE_MS, auto: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed?.id]);

  const shown = cards.show.map((x) => ({ kind: x.kind, rec: find(x.kind, x.id) })).filter((x) => x.rec);
  const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant")?.text || "";
  const askObj = cards.awaiting
    ? {
      chips: cards.pending ? [{ label: "Onayla", onPick: () => confirmPending() }, { label: "Vazgeç", onPick: () => cancelPending() }] : [],
      onMic: () => sp.start({ autoStop: SILENCE_MS }),
      hint: "",
    }
    : null;
  const composer = (
    <Composer
      value={text}
      onChange={setText}
      onSend={() => run(text, false)}
      onMic={() => sp.start({ autoStop: SILENCE_MS })}
      busy={busy}
      placeholder={cards.awaiting ? "Cevabını yaz veya konuş…" : "Sor veya söyle · örn. “bu hafta neler var?”"}
    />
  );

  return (
    <Screen open={open} onClose={shut} title="Asistan">
      <header className="flex shrink-0 items-center justify-between px-5 py-3">
        <h2 className="text-xl font-bold tracking-tight">Asistan</h2>
        <div className="flex items-center gap-2">
          <SpeakToggle />
          <button onClick={shut} aria-label="Kapat" className="grid size-9 place-items-center rounded-full bg-card text-mut ring-1 ring-line transition active:scale-90">
            <Icon name="x" className="size-[18px]" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        {listening || booting || (open && seed?.listen && startedFor.current !== seed?.id) ? (
          <ListeningStage
            sp={sp}
            total={SILENCE_MS / 1000}
            prompt={cards.awaiting ? lastAssistant : ""}
            onCancel={() => {
              setBooting(false);
              sp.cancel();
            }}
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
        ) : (
          <>
            {turns.length === 0 && (
              <>
                {composer}
                <p className="mt-5 px-1 text-[13px] text-mut">Programını özetlerim, sayfa açarım, görev tamamlarım, yeni kayıt başlatırım. Örnekler:</p>
                <div className="mt-2.5 flex flex-col gap-2">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => run(ex, false, true)} className="rounded-xl border border-line bg-card px-3.5 py-2.5 text-left text-[14.5px] transition active:scale-[.98]">
                      “{ex}”
                    </button>
                  ))}
                </div>
              </>
            )}

            <Thread turns={turns} engine={cards.engine} tts={tts} ask={askObj} canFix={false} onFix={() => { }} />

            {error && (
              <div className="fade-in mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                <p className="flex items-center gap-2 text-[15px] font-semibold"><Icon name="alert" className="size-[18px]" /> Şu an yanıt veremedim</p>
                <p className="mt-1 text-[13.5px] opacity-90">{error}</p>
                <button onClick={() => run(heard, voice, true)} className="mt-3 h-10 rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white transition active:scale-95">Tekrar dene</button>
              </div>
            )}

            {cards.pending && (
              <div className="fade-in mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                <p className="text-[15px] font-semibold">Onayına sunuyorum</p>
                <ul className="mt-1.5 space-y-1 text-[14px]">
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
                  onClose();
                  openAdd({ edit: { kind, id } });
                }}
              />
            )}

            {cards.nav && (
              <button onClick={() => go(cards.nav, "")} className="fade-in mt-4 h-11 w-full rounded-xl border border-line bg-card text-[15px] font-semibold transition active:scale-[.98]">
                {PAGES[cards.nav].label} sayfasını aç
              </button>
            )}

            {turns.length > 0 && <div className="sticky bottom-0 -mx-5 mt-4 bg-bg px-5 pb-2 pt-3">{composer}</div>}
          </>
        )}
      </div>
    </Screen>
  );
}
