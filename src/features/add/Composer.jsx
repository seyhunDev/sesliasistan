"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";

const btn = "grid size-10 shrink-0 place-items-center rounded-full transition duration-200 ease-out";

// Yukarı oklu gönder düğmesi: metin yokken sönük, varken dolu; gönderirken ok yukarı kayar, yerine bekleme simgesi gelir
function SendButton({ active, busy, onClick }) {
  const on = active || busy;
  return (
    <button
      key={on ? "on" : "off"}
      type="button"
      onClick={() => !busy && onClick?.()}
      disabled={!on}
      aria-label="Gönder"
      className={`${btn} relative overflow-hidden active:scale-90 ${on ? "pop-btn bg-fg text-bg" : "bg-line text-mut"}`}
    >
      <span className={`absolute inset-0 grid place-items-center transition duration-300 ease-out ${busy ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
        <Icon name="up" className="size-5 [stroke-width:2.2]" />
      </span>
      <span className={`absolute inset-0 grid place-items-center transition duration-300 ease-out ${busy ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
        <Icon name="load" className="size-[18px] animate-spin" />
      </span>
    </button>
  );
}

// Yazı alanı + mikrofon + ↑ gönder. Konuşma ekranı (dinleme, işleme) AddSheet'te gösterilir.
export function Composer({ value, onChange, onSend, onMic, busy, placeholder = "Yaz veya konuş…" }) {
  const ta = useRef(null);
  const canSend = value.trim().length > 0 && !busy;

  // Yazı alanı içeriğe göre büyür
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
  }, [value]);

  return (
    <div className="rounded-3xl border border-line bg-card transition-[box-shadow,border-color] duration-300 focus-within:border-acc focus-within:shadow-[0_0_0_4px_rgba(79,70,229,0.10)]">
      <div className="fade-in flex items-end gap-1 py-1.5 pl-4 pr-1.5">
        <textarea
          ref={ta}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Bilgisayarda Enter gönderir, Shift+Enter yeni satır. Telefonda Enter yeni satırdır.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              if (canSend) onSend?.();
            }
          }}
          placeholder={placeholder}
          className="max-h-[132px] min-w-0 flex-1 resize-none self-stretch bg-transparent py-[9px] text-base leading-[1.4] text-fg outline-none placeholder:text-mut"
        />
        <button type="button" onClick={onMic} aria-label="Sesle yaz" className={`${btn} text-mut hover:bg-bg active:scale-90 active:bg-line`}>
          <Icon name="mic" className="size-5" />
        </button>
        <SendButton active={canSend} busy={!!busy} onClick={onSend} />
      </div>
    </div>
  );
}
