"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@/components/ui/Loader";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useTts } from "@/features/speech/TtsProvider";
import { talkWord } from "./wordData";
import { primeEn, sayEn } from "./WordView";
import { useEnMic } from "./useEnMic";
import { SpeakPill } from "./Altyazi";
import { enHead } from "./fonts";

const TURNS = 5;
const CYAN = "text-[#ffe14d]";

// Cümlede kelimenin geçtiği yer mavi
function Marked({ text, word }) {
  const i = word ? text.toLowerCase().indexOf(word.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className={CYAN}>{text.slice(i, i + word.length)}</span>
      {text.slice(i + word.length)}
    </>
  );
}

// Konuş (Seyhun 2026-11-01: "yapay zeka ile karşılıklı diyalog… ipucu koy, tıklayınca vereceğim cevabı göstersin… sesli de yazarak da…
// her kelimede en az 5 karşılıklı… sesli şey açıksa gelen yapay zekayı da seslendirelim"; örnek /mnt/project-files/ingilizce-kelime/konusma/ornek.png).
// Yapay zeka soru ya da günlük cümle söyler (kelime geçer), kişi yazarak ya da mikrofonla cevaplar; hatalıysa altında "Daha doğru: …".
// 5 cevaptan sonra kapanış cümlesi ve Sına. Her İngilizce satır dokununca okunur; Sesli yanıt açıksa yapay zekanın cümlesi kendiliğinden okunur
// (üstteki hoparlörle bu ekranda kapatılır). Mikrofon: basılı tut-bırak gönderir; kısa dokunuş kaydı açar, ikinci dokunuş gönderir.
// 2026-11-26: Altyazı görünümü (Hatırla ile aynı): tam ekran, son cümle iri altyazı, senin sözün sarı; altta büyük "Bas ve konuş" (dokun-dokun),
// yanında küçük klavye (konuşamayan yazar). Alt çubuk İngilizce sayfasında gizli.
// 2026-11-25: sesli cevap sunucuda önce bağlamsız yazıya dökülür (kişinin kendi sözü yazılır); altta küçük 3 örnek cevap hep görünür (dokununca okunur).
export function WordTalk({ w, onClose, onQuiz }) {
  const toast = useToast();
  const tts = useTts();
  const [lines, setLines] = useState([]); // { who: "ai", e, t } | { who: "me", e, fix, ok, wait }
  const [hints, setHints] = useState([]); // kişinin verebileceği örnek cevaplar (altta küçük)
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState(() => !!tts?.enabled);
  const voiceRef = useRef(voice);
  const end = useRef(null);

  const ask = async (prev, audio = null) => {
    setBusy(true);
    setFailed(false);
    try {
      const r = await talkWord(
        w,
        prev.filter((x) => !(x.wait && audio)).map((x) => ({ who: x.who, e: x.e })),
        audio,
      );
      setLines((l) => [...l.map((x) => (x.wait ? { ...x, e: r.heard || x.e, fix: r.fix, ok: r.ok, wait: false } : x)), { who: "ai", ...r.next }]);
      setHints(r.hints?.length ? r.hints : r.hint?.e ? [r.hint] : []);
      setDone(!!r.done);
      if (voiceRef.current) sayEn(r.next.e);
    } catch (e) {
      setLines((l) => l.filter((x) => !(x.wait && audio)).map((x) => (x.wait ? { ...x, wait: false } : x)));
      if (!prev.length) setFailed(true);
      toast(e?.message || "Konuşmayı sürdüremedim, tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  // İlk cümle açılınca bir kez istenir
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    Promise.resolve().then(() => ask([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız açılışta
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [lines, hints]);

  const send = () => {
    const t = text.trim();
    if (!t || busy || done) return;
    primeEn();
    const me = { who: "me", e: t, wait: true };
    const next = [...lines, me];
    setLines(next);
    setText("");
    ask(next);
  };

  const lvRef = useRef(null);
  const [typing, setTyping] = useState(false); // klavye: konuşamayan yazar (Seyhun 2026-11-26 "öncelik konuşma")
  const mic = useEnMic({ onFail: toast, onLong: () => tapMic(), levelRef: lvRef });
  // Hatırla ile aynı: dokun → dinler, yine dokun → gönderir; açılırken ve bakarken dokunuş yok sayılır
  const tapMic = async () => {
    if (busy || done || mic.state === "opening" || mic.state === "stopping") return;
    primeEn();
    if (!mic.on) return mic.start();
    const blob = await mic.stop();
    if (!blob) return toast("Sesini duyamadım. Bas, söyle, sonra yeniden bas.");
    const next = [...lines, { who: "me", e: "…", wait: true }];
    setLines(next);
    ask(next, blob);
  };
  const st = busy || mic.state === "stopping" ? "wait" : mic.state === "opening" ? "open" : mic.rec ? "rec" : "idle";
  const label = st === "rec" ? "Dinliyorum · bitince bas" : st === "open" ? "Mikrofon açılıyor…" : st === "wait" ? "Bakıyorum…" : "Bas ve konuş";

  const toggleVoice = () => {
    primeEn();
    voiceRef.current = !voice;
    setVoice(!voice);
  };

  const answers = lines.filter((x) => x.who === "me" && !x.wait).length;
  const lastAi = lines.map((x, i) => (x.who === "ai" ? i : -1)).filter((i) => i >= 0).at(-1);

  return (
    <div role="dialog" aria-label="Konuş" className={`${enHead.variable} fixed inset-0 z-[54] flex flex-col overflow-hidden bg-black text-white`}>
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_45%_at_75%_18%,rgba(240,138,93,.35)_0%,rgba(240,138,93,0)_70%),linear-gradient(180deg,#221a3a,#120f22_55%,#000)]" />
      <header className="relative flex items-center justify-between px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] text-white/80">
        <button type="button" onClick={() => (mic.cancel(), onClose())} aria-label="Konuşmayı kapat" className="grid size-11 place-items-center rounded-full">
          <Icon name="x" className="size-5" />
        </button>
        <b className="min-w-0 truncate font-[family-name:var(--en-font)] text-[0.9375rem] font-bold tracking-[.06em]">
          KONUŞ · <span className="tabular-nums">{Math.min(answers + (done ? 0 : 1), TURNS)}/{TURNS}</span>
        </b>
        <button type="button" onClick={toggleVoice} aria-label={voice ? "Sesli okumayı kapat" : "Sesli oku"} aria-pressed={voice} className={`grid size-11 place-items-center rounded-full ${voice ? "text-[#ffe14d]" : "text-white/40"}`}>
          <Icon name={voice ? "volume" : "mute"} className="size-5" />
        </button>
      </header>

      <section aria-label="Konuşma" aria-live="polite" className="relative mx-auto flex w-full max-w-[48rem] flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4 pt-6 md:px-10">
        <div className="flex-1" />
        {lines.map((x, i) =>
          x.who === "ai" ? (
            <button key={i} type="button" onClick={() => sayEn(x.e)} className="block text-left">
              <span className={`block text-balance ${i === lastAi ? "font-[family-name:var(--en-font)] text-[1.65rem] font-extrabold leading-[1.18] text-white [text-shadow:0_2px_18px_rgba(0,0,0,.6)] md:text-[2.4rem]" : "text-[1rem] leading-snug text-white/45"}`}>
                <Marked text={x.e} word={w.kind === "phrase" ? "" : w.en} />
              </span>
              <span className={`mt-1 block text-white/40 ${i === lastAi ? "text-[0.9375rem] md:text-[1.05rem]" : "text-[0.8125rem]"}`}>{x.t}</span>
            </button>
          ) : (
            <div key={i} className="ml-auto max-w-[85%] text-right">
              <button type="button" disabled={x.wait} onClick={() => sayEn(x.e)} className={`text-right text-[1.0625rem] font-semibold leading-snug text-[#ffe14d] md:text-[1.2rem] ${x.wait ? "opacity-50" : ""}`}>
                {x.e}
              </button>
              {!x.wait && (x.fix ? (
                <button type="button" onClick={() => sayEn(x.fix)} className="mt-0.5 block w-full text-right text-[0.875rem] leading-snug text-white/55">
                  Daha doğru: <span className="text-[#7cf0b5]">{x.fix}</span>
                </button>
              ) : (
                <span className="mt-0.5 flex items-center justify-end gap-1 text-[0.8125rem] text-[#7cf0b5]">
                  <Icon name="check" className="size-3.5" />
                  Güzel
                </span>
              ))}
            </div>
          ),
        )}
        {failed && !busy && (
          <button type="button" onClick={() => ask([])} className="self-start text-[1rem] font-semibold text-white/70">
            Tekrar dene
          </button>
        )}
        {hints.length > 0 && !busy && !done && (
          <div aria-label="Örnek cevaplar" className="flex flex-col gap-2 border-l-2 border-[#ffe14d]/35 pl-3">
            {hints.map((h) => (
              <button key={h.e} type="button" onClick={() => sayEn(h.e)} className="block text-left">
                <span className="block text-[0.9375rem] leading-snug text-white/70">{h.e}</span>
                <span className="block text-[0.75rem] leading-snug text-white/35">{h.t}</span>
              </button>
            ))}
          </div>
        )}
        <div ref={end} />
      </section>

      <footer className="relative mx-auto flex w-full max-w-[48rem] items-center gap-3 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 md:px-10 md:pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {done ? (
          <>
            <button type="button" onClick={onClose} className="h-[3.6rem] flex-1 rounded-full border-[1.5px] border-white/30 text-[1.0625rem] font-semibold active:scale-[.98]">
              Bitir
            </button>
            {onQuiz && (
              <button type="button" onClick={onQuiz} className="h-[3.6rem] flex-[1.4] rounded-full bg-[#ffe14d] text-[1.0625rem] font-bold text-[#1a1505] active:scale-[.98]">
                Sına
              </button>
            )}
          </>
        ) : typing ? (
          <>
            <button type="button" onClick={() => setTyping(false)} aria-label="Konuşarak cevapla" className="grid size-14 shrink-0 place-items-center rounded-full bg-white/10 text-[#ffe14d]">
              <Icon name="mic" className="size-6" />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Cevabını yaz…"
              autoFocus
              autoCapitalize="sentences"
              lang="en"
              enterKeyHint="send"
              aria-label="Cevabın"
              className="h-14 min-w-0 flex-1 rounded-full bg-white/10 px-5 text-[1.0625rem] text-white outline-none placeholder:text-white/40"
            />
            <button type="button" onClick={send} disabled={busy || !text.trim()} aria-label="Gönder" className="grid size-14 shrink-0 place-items-center rounded-full bg-[#ffe14d] text-[#1a1505] disabled:opacity-40">
              {busy ? <Loader size="sm" className="text-[#1a1505]" label="Bakıyorum" /> : <Icon name="up" className="size-6" />}
            </button>
          </>
        ) : (
          <>
            <SpeakPill st={st} label={label} lvRef={lvRef} onClick={tapMic} disabled={failed && !lines.length} />
            <button type="button" onClick={() => (mic.cancel(), setTyping(true))} disabled={mic.on} aria-label="Yazarak cevapla" className="grid size-14 shrink-0 place-items-center rounded-full bg-white/10 text-white/75 disabled:opacity-40">
              <Icon name="keyboard" className="size-6" />
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
