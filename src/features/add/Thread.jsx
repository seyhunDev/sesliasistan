"use client";

import { Icon } from "@/components/ui/Icon";

const ENGINE = { ai: "AI", local: "Hızlı komut", brain: "Öğrenilmiş", rules: "Yedek kurallar" };

// Konuşma akışı (sade): senin mesajların sağda hafif balon, asistanın yanıtı solda düz metin.
// ask: { chips: [{ label, onPick }], onMic, hint }  ->  son yanıtın altında hızlı cevap düğmeleri ve "Sesle cevapla"
export function Thread({ turns, engine, tts, ask, canFix, onFix }) {
  if (!turns.length) return null;
  const last = turns.length - 1;
  const lastUser = turns.map((t) => t.role).lastIndexOf("user");

  return (
    <div className="mt-4 space-y-3.5">
      {turns.map((t, i) =>
        t.role === "user" ? (
          <div key={i} className="fade-in flex flex-col items-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-fg/[.06] px-3.5 py-2 text-[15px] leading-snug">{t.text}</p>
            {canFix && i === lastUser && (
              <button onClick={onFix} className="mt-1 px-1 text-[12px] font-medium text-mut transition active:opacity-50">
                {t.chip ? "Geri al" : "Düzelt"}
              </button>
            )}
          </div>
        ) : (
          <div key={i} className="fade-in" {...(i === last ? { "data-last-reply": "1" } : {})}>
            <div className="flex items-start gap-2">
              <Icon name="spark" className="mt-1 size-3.5 shrink-0 text-acc" />
              <p className="min-w-0 text-[15px] leading-snug">{t.text}</p>
            </div>
            {i === last && (
              <>
                <div className="mt-1.5 flex items-center gap-3 pl-5.5 text-[12px] text-mut">
                  {tts.supported && (
                    <button
                      type="button"
                      onClick={() => (tts.speaking ? tts.stop() : tts.speak(t.text))}
                      className="inline-flex items-center gap-1 font-medium transition active:opacity-50"
                    >
                      <Icon name={tts.speaking ? "stop" : "volume"} className="size-3.5" />
                      {tts.speaking ? "Durdur" : "Dinle"}
                    </button>
                  )}
                  {tts.speaking && (
                    <span className="eq" aria-hidden="true">
                      <i /><i /><i /><i />
                    </span>
                  )}
                  {engine && <span>{ENGINE[engine] || ENGINE.rules}</span>}
                </div>

                {ask && (
                  <div className="fade-in mt-2.5 pl-5.5">
                    <div className="flex flex-wrap gap-1.5">
                      {ask.chips.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={c.onPick}
                          className="rounded-full bg-card px-3 py-1.5 text-[14px] font-medium ring-1 ring-line transition active:scale-95"
                        >
                          {c.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={ask.onMic}
                        className="inline-flex items-center gap-1.5 rounded-full bg-acc px-3 py-1.5 text-[14px] font-semibold text-white transition active:scale-95"
                      >
                        <Icon name="mic" className="size-3.5" /> Sesle cevapla
                      </button>
                    </div>
                    {ask.hint && <p className="mt-1.5 text-[12px] text-mut">{ask.hint}</p>}
                  </div>
                )}
              </>
            )}
          </div>
        ),
      )}
    </div>
  );
}
