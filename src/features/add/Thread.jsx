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
            <p className="max-w-[85%] rounded-[1.25rem] rounded-br-md bg-acc/10 px-3.5 py-2 text-[0.9375rem] leading-snug">{t.text}</p>
            {canFix && i === lastUser && (
              <button onClick={onFix} className="mt-1 px-1 text-[0.75rem] font-medium text-mut transition active:opacity-50">
                {t.chip ? "Geri al" : "Düzelt"}
              </button>
            )}
          </div>
        ) : (
          <div key={i} className="fade-in" {...(i === last ? { "data-last-reply": "1" } : {})}>
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
                          className="rounded-full bg-card px-3 py-1.5 text-[0.875rem] font-medium ring-1 ring-line transition active:scale-95"
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
