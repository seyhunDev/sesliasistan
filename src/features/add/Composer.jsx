"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";

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
        <Loader size="xs" className="text-current" />
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
    <div className="rounded-3xl border border-line bg-card transition-[box-shadow,border-color] duration-300 focus-within:border-acc focus-within:shadow-[0_0_0_4px_rgba(47,125,107,0.10)]">
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
          className="max-h-[8.25rem] min-w-0 flex-1 resize-none self-stretch bg-transparent py-[0.5625rem] text-base leading-[1.4] text-fg outline-none placeholder:text-mut"
        />
        <button type="button" onClick={onMic} aria-label="Sesle yaz" className={`${btn} text-mut hover:bg-bg active:scale-90 active:bg-line`}>
          <Icon name="mic" className="size-5" />
        </button>
        <SendButton active={canSend} busy={!!busy} onClick={onSend} />
      </div>
    </div>
  );
}

// Konuşma sırasındaki alt çubuk (sabit): yazı alanı üstte, altında büyük mikrofon + tek ana düğme.
// Ana düğme duruma göre değişir: yazı varsa "Gönder" (asistana), yoksa idle ile verilen iş (yeni kayıtta "Kaydet (N)",
// asistanda bekleyen işlem varsa "Onayla"). Böylece kaydet/onayla, konuş ve gönder hep aynı yerde ve başparmak erişiminde.
// idle: { label, icon, on, run }; verilmezse yazı yokken sönük "Gönder".
export function ActionDock({ value, onChange, onSend, onMic, busy, placeholder, idle }) {
  const ta = useRef(null);
  const typed = value.trim().length > 0;
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 110) + "px";
  }, [value]);
  const primary = typed || !idle ? { label: "Gönder", icon: "up", on: typed && !busy, run: onSend } : { ...idle, on: idle.on !== false && !busy };

  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl border border-line bg-card px-3.5 transition-[box-shadow,border-color] duration-300 focus-within:border-acc focus-within:shadow-[0_0_0_4px_rgba(47,125,107,0.10)]">
        <textarea
          ref={ta}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              if (typed && !busy) onSend?.();
            }
          }}
          placeholder={placeholder}
          aria-label="Asistana yaz"
          className="block max-h-[6.875rem] w-full resize-none bg-transparent py-3 text-base leading-[1.4] text-fg outline-none placeholder:text-mut"
        />
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onMic}
          disabled={busy}
          aria-label="Konuş"
          className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-acc/10 px-4 text-[0.9375rem] font-semibold text-acc transition active:scale-95 disabled:opacity-40"
        >
          <Icon name="mic" className="size-5" /> Konuş
        </button>
        <button
          type="button"
          onClick={() => primary.on && primary.run?.()}
          disabled={!primary.on}
          className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl text-[0.9375rem] font-semibold transition active:scale-[.98] disabled:opacity-40 ${typed ? "bg-fg text-bg" : "bg-acc text-white"}`}
        >
          {busy ? <Loader size="xs" className="text-current" /> : <Icon name={primary.icon} className="size-5 [stroke-width:2.2]" />}
          <span className="truncate">{busy ? "Hazırlanıyor…" : primary.label}</span>
        </button>
      </div>
    </div>
  );
}
