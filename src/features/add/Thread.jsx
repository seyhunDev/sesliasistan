"use client";

// Konuşma akışı (sade): senin mesajların sağda hafif deniz mavisi balon, asistanın yanıtı solda büyük düz metin.
// ask: { chips: [{ label, onPick }] }  ->  son yanıtın altında hızlı cevap düğmeleri (Onayla, Vazgeç…).
// Yanıtın altında "Dinle", kaynak etiketi (AI…) ya da "Sesle cevapla" yok: sade (sesli yanıt ayarlardan, cevap küreyle).
// extra(turn, i): cevabın altına sabit düğmeler (sohbet bunların altında sürer)
export function Thread({ turns, ask, canFix, onFix, extra }) {
  if (!turns.length) return null;
  const last = turns.length - 1;
  const lastUser = turns.map((t) => t.role).lastIndexOf("user");

  return (
    <div className="mt-4 space-y-3.5">
      {turns.map((t, i) =>
        t.role === "user" ? (
          <div key={i} className="fade-in flex flex-col items-end">
            <p data-user-bubble="" className="max-w-[85%] rounded-[1.25rem] rounded-br-md bg-acc/10 px-3.5 py-2 text-[0.9375rem] leading-snug">{t.text}</p>
            {canFix && i === lastUser && (
              <button onClick={onFix} data-press className="btn btn-text btn-sm mt-1 text-mut">
                {t.chip ? "Geri al" : "Düzelt"}
              </button>
            )}
          </div>
        ) : (
          <div key={i} className={i === last ? "animate-pop" : "fade-in"} {...(i === last ? { "data-last-reply": "1" } : {})}>
            <p className="min-w-0 pr-6 text-[1.0625rem] leading-relaxed tracking-[-.005em]">{t.text}</p>
            {extra?.(t, i)}
            {i === last && (
              <>
                {ask?.chips?.length > 0 && (
                  <div className="fade-in mt-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {ask.chips.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={c.onPick}
                          data-press className="btn btn-secondary btn-sm"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
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
