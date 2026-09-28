"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useSpeech } from "@/hooks/useSpeech";

const BARS = 28;
const SILENCE_MS = 0; // Otomatik kapanma devre dışı
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function VoiceOrb({ onResult, onFail }) {
  const sp = useSpeech({ onFinal: (t) => onResult?.(t), onFail });
  const listening = sp.status === "listening";
  const busy = sp.status === "transcribing";
  const [tap, setTap] = useState(false);
  const tapRef = useRef(false);
  const downAt = useRef(0);
  const [bars, setBars] = useState(() => Array(BARS).fill(0.08));

  useEffect(() => {
    if (sp.status === "idle") {
      tapRef.current = false;
      setTap(false);
    }
  }, [sp.status]);

  useEffect(() => {
    if (!listening) {
      setBars(Array(BARS).fill(0.08));
      return;
    }
    setBars((p) => [...p.slice(1), Math.max(0.08, sp.level)]);
  }, [sp.level, listening]);

  // Basılı tut: bırakınca gönderir. Kısa dokun: konuş, sessizlikte kendiliğinden gönderir (veya tekrar dokun).
  const down = (e) => {
    e.preventDefault();
    if (listening && tapRef.current) {
      sp.stop();
      return;
    }
    if (sp.status !== "idle") return;
    downAt.current = Date.now();
    tapRef.current = false;
    setTap(false);
    sp.start();
  };
  const up = () => {
    if (!listening || tapRef.current) return;
    if (Date.now() - downAt.current > 350) sp.stop();
    else {
      tapRef.current = true;
      setTap(true);
      sp.setAutoStop(SILENCE_MS);
    }
  };

  const color = listening ? "var(--rec)" : busy ? "var(--proc)" : "var(--acc)";
  const iconState = listening ? "stop" : busy ? "load" : "mic";
  const hint = busy ? "Yazıya çevriliyor…" : listening ? "Dinliyorum…" : "Konuşmak için basılı tut";
  const sub = listening
    ? `${fmt(sp.elapsed)}${tap ? (sp.remaining != null ? ` · ${sp.remaining} sn sonra gönderilecek` : " · bitirmek için tekrar dokun") : " · bırakınca gönderir"}`
    : busy
      ? "Birazdan yapay zekaya gidecek"
      : sp.provider === "none"
        ? "Bu tarayıcıda ses yok, yazarak ekleyebilirsin"
        : "Örn. “Bu hafta neler var?” veya “Görevleri aç”";

  return (
    <div className="flex flex-col items-center px-2 py-6 text-center">
      <div className="relative grid size-24 place-items-center">
        {listening &&
          [0, 0.7].map((d) => (
            <span key={d} className="animate-ripple absolute inset-2 rounded-full border-2" style={{ borderColor: color, animationDelay: `${d}s` }} />
          ))}

        <button
          type="button"
          onClick={sp.cancel}
          aria-label="Kaydı iptal et"
          className={`absolute right-full top-1/2 mr-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-card text-fg transition duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] active:scale-90 ${listening && tap ? "scale-100 opacity-100" : "pointer-events-none scale-50 opacity-0"
            }`}
        >
          <Icon name="x" className="size-5" />
        </button>

        <button
          type="button"
          aria-label="Konuşmak için basılı tut veya dokun"
          onPointerDown={down}
          onPointerUp={up}
          onPointerCancel={up}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              if (listening) sp.stop();
              else if (sp.status === "idle") {
                tapRef.current = true;
                setTap(true);
                sp.start({ autoStop: SILENCE_MS });
              }
            }
          }}
          className={`relative grid size-20 select-none place-items-center overflow-hidden rounded-full text-white shadow-md transition duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acc active:scale-95 ${listening ? "scale-95" : ""}`}
          style={{ background: color, touchAction: "none", WebkitUserSelect: "none" }}
        >
          {["mic", "stop", "load"].map((n) => (
            <Icon
              key={n}
              name={n}
              className={`absolute size-8 transition duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] ${iconState === n ? "rotate-0 scale-100 opacity-100" : "-rotate-45 scale-50 opacity-0"
                } ${n === "load" && iconState === "load" ? "animate-spin" : ""}`}
            />
          ))}
        </button>
      </div>

      <p className="mt-4 text-[17px] font-semibold">{hint}</p>
      <p className="mt-1 min-h-5 max-w-[300px] text-[13px] leading-snug text-mut">{sub}</p>

      {(listening || busy) && (
        <div className="fade-in mt-3 w-full max-w-[340px] rounded-xl border border-line bg-card px-3.5 py-2.5 text-left text-[15px] leading-snug">
          {sp.finalText || sp.interim ? (
            <>
              {sp.finalText}
              <span className="text-mut">{sp.interim}</span>
            </>
          ) : (
            <span className="text-mut">
              {busy ? "Yazıya çevriliyor…" : sp.provider === "webspeech" ? "Konuş, yazı burada görünecek…" : "Kayıt sürüyor. Bitince yazıya çevrilecek."}
            </span>
          )}
        </div>
      )}

      <div className={`mt-2 flex h-7 items-center justify-center gap-[3px] transition-opacity duration-300 ${listening ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
        {bars.map((v, i) => (
          <i key={i} className="w-[3px] rounded-full bg-rec" style={{ height: 4 + v * 22, transition: "height 90ms linear" }} />
        ))}
      </div>
    </div>
  );
}
