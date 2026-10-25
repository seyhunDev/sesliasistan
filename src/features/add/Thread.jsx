"use client";

import { useEffect, useState } from "react";

// Yeni yanıt klavyede yazılıyormuş gibi harf harf belirir (Seyhun 2026-10-25); bir yanıt bir kez yazılır (yeniden çizimde,
// eski yanıtlarda ve akışla gelmiş yanıtta yazma yok). Uzun yanıt da en çok TYPE_MS içinde biter.
const TYPE_MS = 1400;
const typed = new WeakSet();
function Typed({ turn, on }) {
  const text = String(turn.text || "");
  // İlk çizimde karar verilir; hareket azaltıldıysa yazma yok
  const [fresh] = useState(() => on && !typed.has(turn) && text.length > 1 && typeof window !== "undefined" && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [n, setN] = useState(fresh ? 0 : text.length);
  useEffect(() => {
    if (!fresh) return;
    typed.add(turn);
    const step = Math.max(8, Math.min(28, TYPE_MS / text.length));
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const k = Math.min(text.length, Math.ceil((performance.now() - t0) / step));
      setN(k);
      if (k < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fresh, turn, text]);
  if (n >= text.length) return text;
  return (
    <>
      {text.slice(0, n)}
      <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-acc" aria-hidden="true" />
    </>
  );
}

// Konuşma akışı (sade): senin mesajların sağda hafif deniz mavisi balon, asistanın yanıtı solda büyük düz metin.
// ask: { chips: [{ label, onPick }] }  ->  son yanıtın altında hızlı cevap düğmeleri (Onayla, Vazgeç…).
// Yanıtın altında "Dinle", kaynak etiketi (AI…) ya da "Sesle cevapla" yok: sade (sesli yanıt ayarlardan, cevap küreyle).
// extra(turn, i): cevabın altına sabit düğmeler (sohbet bunların altında sürer)
// typeLast: son yanıt harf harf yazılsın (akışla kelime kelime gelmediyse)
export function Thread({ turns, ask, canFix, onFix, extra, typeLast = false }) {
  if (!turns.length) return null;
  const last = turns.length - 1;
  const lastUser = turns.map((t) => t.role).lastIndexOf("user");

  return (
    <div className="mt-4 space-y-3.5">
      {turns.map((t, i) =>
        t.role === "user" ? (
          // Söylenen söz alttaki kutudan sohbete geçer: kutu boşalınca balon aşağıdan yükselerek belirir (Seyhun 2026-10-25)
          <div key={i} className="auser-in flex flex-col items-end">
            <p data-user-bubble="" className="max-w-[85%] rounded-[1.25rem] rounded-br-md bg-acc/10 px-3.5 py-2 text-[0.9375rem] leading-snug">{t.text}</p>
            {canFix && i === lastUser && (
              <button onClick={onFix} data-press className="btn btn-text btn-sm mt-1 text-mut">
                {t.chip ? "Geri al" : "Düzelt"}
              </button>
            )}
          </div>
        ) : (
          <div key={i} className={i === last ? "animate-pop" : "fade-in"} {...(i === last ? { "data-last-reply": "1" } : {})}>
            <p className="min-w-0 pr-6 text-[1.0625rem] leading-relaxed tracking-[-.005em]">{i === last ? <Typed turn={t} on={typeLast} /> : t.text}</p>
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
