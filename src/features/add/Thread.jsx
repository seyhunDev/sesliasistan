"use client";

import { Icon } from "@/components/ui/Icon";

// Konuşma akışı: senin mesajların sağda, asistanın yanıtları solda.
// ask: { chips: [{ label, onPick }], onMic, hint }  ->  son yanıtın altında hızlı cevap düğmeleri ve "Sesle cevapla"
export function Thread({ turns, engine, tts, ask, canFix, onFix }) {
  if (!turns.length) return null;
  const last = turns.length - 1;
  const lastUser = turns.map((t) => t.role).lastIndexOf("user");

  return (
    <div className="mt-4 space-y-3">
      {turns.map((t, i) =>
        t.role === "user" ? (
          <div key={i} className="fade-in flex flex-col items-end">
            <p className="max-w-[88%] rounded-2xl rounded-br-md bg-fg px-3.5 py-2.5 text-[15px] leading-snug text-bg">{t.text}</p>
            {canFix && i === lastUser && (
              <button onClick={onFix} className="mt-1 px-1 text-xs font-semibold text-acc transition active:opacity-50">
                {t.chip ? "Geri al" : "Son mesajı düzelt"}
              </button>
            )}
          </div>
        ) : (
          <div key={i} className="fade-in flex items-start gap-2.5" {...(i === last ? { "data-last-reply": "1" } : {})}>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-acc text-white">
              <Icon name="spark" className="size-3.5" />
            </span>
            <div className="min-w-0 max-w-[92%] rounded-2xl rounded-tl-md bg-card px-3.5 py-2.5 ring-1 ring-line">
              <p className="text-[16px] leading-snug">{t.text}</p>
              {i === last && (
                <>
                  <div className="mt-2.5 flex items-center gap-2.5">
                    {tts.supported && (
                      <button
                        type="button"
                        onClick={() => (tts.speaking ? tts.stop() : tts.speak(t.text))}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-bg px-3 text-[13px] font-semibold transition active:scale-95"
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
                    {engine && (
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${engine === "ai" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {engine === "ai" ? "AI" : "Yedek kurallar"}
                      </span>
                    )}
                  </div>

                  {ask && (
                    <div className="fade-in mt-3 border-t border-line pt-3">
                      <div className="flex flex-wrap gap-2">
                        {ask.chips.map((c) => (
                          <button
                            key={c.label}
                            type="button"
                            onClick={c.onPick}
                            className="rounded-full border border-line bg-bg px-3.5 py-2 text-sm font-medium transition active:scale-95"
                          >
                            {c.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={ask.onMic}
                          className="softpulse inline-flex items-center gap-1.5 rounded-full bg-acc px-3.5 py-2 text-sm font-semibold text-white transition active:scale-95"
                        >
                          <Icon name="mic" className="size-4" /> Sesle cevapla
                        </button>
                      </div>
                      {ask.hint && <p className="mt-2 text-xs text-mut">{ask.hint}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
