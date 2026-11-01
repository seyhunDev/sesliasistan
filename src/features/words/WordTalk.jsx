"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useTts } from "@/features/speech/TtsProvider";
import { talkWord } from "./wordData";
import { primeEn, sayEn } from "./WordView";
import { useEnMic } from "./useEnMic";

const TURNS = 5;
const CYAN = "text-[#67e8f9]";

// Cümlede kelimenin geçtiği yer camgöbeği
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
export function WordTalk({ w, onClose, onQuiz }) {
  const toast = useToast();
  const tts = useTts();
  const [lines, setLines] = useState([]); // { who: "ai", e, t } | { who: "me", e, fix, ok, wait }
  const [hint, setHint] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState(() => !!tts?.enabled);
  const voiceRef = useRef(voice);
  const end = useRef(null);
  const press = useRef({ at: 0, tap: false });

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
      setHint(r.hint?.e ? r.hint : null);
      setShowHint(false);
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
  }, [lines, showHint]);

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

  const mic = useEnMic({ onFail: toast, onLong: () => finish() });
  const finish = async () => {
    press.current.tap = false;
    const blob = await mic.stop();
    if (!blob) return toast("Ses duyulmadı, tekrar dene.");
    const next = [...lines, { who: "me", e: "…", wait: true }];
    setLines(next);
    ask(next, blob);
  };
  const down = (e) => {
    e.preventDefault();
    if (busy || done) return;
    primeEn();
    if (mic.on) return;
    press.current = { at: Date.now(), tap: false };
    mic.start();
  };
  const up = () => {
    if (!mic.on) return;
    if (press.current.tap) return finish(); // ikinci dokunuş: gönder
    if (Date.now() - press.current.at < 300) press.current.tap = true; // kısa dokunuş: kayıt açık kalır
    else finish();
  };

  const toggleVoice = () => {
    primeEn();
    voiceRef.current = !voice;
    setVoice(!voice);
  };

  const answers = lines.filter((x) => x.who === "me" && !x.wait).length;
  const lastAi = lines.map((x, i) => (x.who === "ai" ? i : -1)).filter((i) => i >= 0).at(-1);

  return (
    <>
      <header className="relative flex items-center justify-between gap-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-[0.875rem] text-white/45">
        <Button variant="icon" size="sm" aria-label="Konuşmayı kapat" onClick={() => (mic.cancel(), onClose())} className="!text-white/50">
          <Icon name="x" className="size-5" />
        </Button>
        <span className="min-w-0 truncate">
          <b className="font-semibold text-white/85">{w.en}</b>
          <span className="tabular-nums">{` · ${Math.min(answers + (done ? 0 : 1), TURNS)} / ${TURNS}`}</span>
        </span>
        <Button variant="icon" size="sm" aria-label={voice ? "Sesli okumayı kapat" : "Sesli oku"} aria-pressed={voice} onClick={toggleVoice} className={voice ? "!text-[#67e8f9]" : "!text-white/40"}>
          <Icon name={voice ? "volume" : "mute"} className="size-5" />
        </Button>
      </header>

      <section aria-label="Konuşma" className="relative flex flex-1 flex-col justify-end gap-5 pb-4 pt-8">
        {lines.map((x, i) =>
          x.who === "ai" ? (
            <button key={i} type="button" onClick={() => sayEn(x.e)} className="block text-left">
              <span className={`block leading-snug ${i === lastAi ? "text-[1.3125rem] font-medium text-white" : "text-[1rem] text-white/55"}`}>
                <Marked text={x.e} word={w.kind === "phrase" ? "" : w.en} />
              </span>
              <span className={`mt-1 block text-white/40 ${i === lastAi ? "text-[0.875rem]" : "text-[0.8125rem]"}`}>{x.t}</span>
            </button>
          ) : (
            <div key={i} className="ml-auto max-w-[85%] text-right">
              <button type="button" disabled={x.wait} onClick={() => sayEn(x.e)} className={`text-right text-[1rem] leading-snug ${CYAN} ${x.wait ? "opacity-50" : ""}`}>
                {x.e}
              </button>
              {!x.wait && (x.fix ? (
                <button type="button" onClick={() => sayEn(x.fix)} className="mt-0.5 block w-full text-right text-[0.8125rem] leading-snug text-white/40">
                  Daha doğru: “{x.fix}”
                </button>
              ) : (
                <span className="mt-0.5 flex items-center justify-end gap-1 text-[0.8125rem] text-white/40">
                  <Icon name="check" className="size-3.5 text-[#9fe7c6]" />
                  Güzel
                </span>
              ))}
            </div>
          ),
        )}
        {busy && <span aria-label="Yazıyor" className="h-5 w-10 animate-pulse rounded-full bg-white/8" />}
        {failed && !busy && (
          <Button variant="text" onClick={() => ask([])} className="!px-0 !text-white/60">
            Tekrar dene
          </Button>
        )}
        {hint && !busy && !done && (showHint ? (
          <button type="button" onClick={() => sayEn(hint.e)} className="block border-l-2 border-[#67e8f9]/40 pl-3 text-left">
            <span className="block text-[1rem] leading-snug text-white/75">{hint.e}</span>
            <span className="mt-0.5 block text-[0.8125rem] text-white/40">{hint.t}</span>
          </button>
        ) : (
          <button type="button" onClick={() => setShowHint(true)} className="self-start py-1 text-[0.9375rem] text-white/45">
            İpucu
          </button>
        ))}
        <div ref={end} />
      </section>

      <footer className="sticky bottom-[calc(var(--dome-h,var(--stage-h,6rem))+0.5rem)] -mx-6 flex items-center gap-2.5 bg-[#08111f]/90 px-6 pb-1 pt-2 backdrop-blur">
        {done ? (
          <>
            <Button variant="text" onClick={onClose} className="!text-white/50">
              Bitir
            </Button>
            <span className="flex-1" />
            <Button variant="secondary" full={false} onClick={onQuiz} className="!h-12 !rounded-full !border-0 !bg-[#67e8f9]/14 !px-7 !text-[#67e8f9] !shadow-none">
              Sına
            </Button>
          </>
        ) : (
          <>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={mic.on ? "Dinliyorum…" : "Cevabını yaz…"}
              disabled={mic.on}
              autoCapitalize="sentences"
              lang="en"
              enterKeyHint="send"
              aria-label="Cevabın"
              className="h-12 min-w-0 flex-1 rounded-full bg-white/7 px-5 text-[1rem] text-white outline-none placeholder:text-white/35"
            />
            {text.trim() ? (
              <button type="button" data-press onClick={send} disabled={busy} aria-label="Gönder" className="grid size-12 shrink-0 place-items-center rounded-full bg-[#67e8f9]/14 disabled:opacity-50">
                <Icon name="up" className={`size-5 ${CYAN}`} />
              </button>
            ) : (
              <button
                type="button"
                onPointerDown={down}
                onPointerUp={up}
                onContextMenu={(e) => e.preventDefault()}
                disabled={busy}
                aria-label={mic.on ? "Gönder" : "Sesle cevapla"}
                className={`grid size-12 shrink-0 touch-none select-none place-items-center rounded-full disabled:opacity-50 ${mic.on ? "bg-[#67e8f9] text-[#0b1628]" : `bg-[#67e8f9]/14 ${CYAN}`}`}
              >
                <Icon name={mic.on ? "up" : "mic"} className="size-5" />
              </button>
            )}
          </>
        )}
      </footer>
    </>
  );
}
