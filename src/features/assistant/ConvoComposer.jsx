"use client";

import { useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useSpeech } from "@/hooks/useSpeech";
import { useAssistant } from "./AssistantProvider";

const HOLD_MS = 450;

// Küçük asistan küresi (alt çubuktakinin aynısı): dokun → konuş, basılı tut → yaz. Asistan açık konuşmayı bilir (focus).
export function MiniOrb({ focus, examples, className = "" }) {
  const { openAssistant } = useAssistant();
  const t = useRef(null);
  const held = useRef(false);
  const down = () => {
    held.current = false;
    t.current = setTimeout(() => {
      held.current = true;
      navigator.vibrate?.(12);
      openAssistant({ focus, examples });
    }, HOLD_MS);
  };
  const up = () => clearTimeout(t.current);
  return (
    <button
      type="button"
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => !held.current && openAssistant({ listen: true, focus, examples })}
      aria-label="Asistan: dokun konuş, basılı tut yaz"
      className={`grid size-11 shrink-0 select-none place-items-center rounded-full bg-deep shadow-[0_6px_16px_-8px_rgba(31,90,75,.8),inset_0_0_0_2px_rgba(255,255,255,.14)] transition active:scale-90 [-webkit-touch-callout:none] ${className}`}
    >
      <span className="flex h-4 items-end gap-[2.5px]" aria-hidden="true">
        {[6, 11, 16, 10, 5].map((h, i) => (
          <i key={i} className={`w-[2.5px] rounded-full bg-white ${i === 0 || i === 4 ? "opacity-70" : ""}`} style={{ height: h }} />
        ))}
      </span>
    </button>
  );
}

// Konuşma yazma alanı (sohbetler ve kayıt konuşmaları): yazı + mikrofon (söyleneni kutuya yazar) + gönder.
// Kutu boşken sağda asistan küresi durur; yazınca gönder düğmesine döner.
// value/setValue: useState çifti (setValue fonksiyonla da çağrılır). leading: soldaki ek düğme (ör. ek menüsü).
// inputProps: textarea'ya ek özellikler (yazıyor bilgisi, Enter ile gönderme). sendIcon: düzenlemede "check".
// orb={false}: ana asistan kubbesi zaten altta görünüyorsa (kayıt ekranı) küre çizilmez, gönder düğmesi pasif durur.
export function ConvoComposer({ value, setValue, onSend, placeholder = "Mesaj", focus, examples, leading, inputRef, inputProps = {}, sendIcon = "up", sendLabel = "Gönder", orb = true }) {
  const toast = useToast();
  const own = useRef(null);
  const input = inputRef || own;
  const sp = useSpeech({ onFinal: (t) => setValue((p) => (p ? `${p} ${t}` : t)), onFail: (m) => toast(m) });
  const listening = sp.status === "listening";

  if (listening)
    return (
      <div className="flex items-center gap-2.5 rounded-2xl bg-card px-3 py-2 shadow-sm">
        <span className="size-2.5 animate-pulse rounded-full bg-rec" />
        <p className="min-w-0 flex-1 truncate text-[0.875rem]">{`${sp.finalText || ""}${sp.interim || ""}` || <span className="text-mut">Dinliyorum…</span>}</p>
        <button type="button" onClick={() => sp.stop("edit")} className="h-9 rounded-full bg-acc px-4 text-[0.8125rem] font-semibold text-white">
          Bitti
        </button>
      </div>
    );
  return (
    <div className="flex items-end gap-2">
      {leading}
      <div className="flex min-h-11 min-w-0 flex-1 items-end rounded-[1.375rem] bg-card ring-1 ring-line focus-within:ring-acc">
        <textarea
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={1}
          placeholder={placeholder}
          aria-label={placeholder}
          {...inputProps}
          className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-[0.6875rem] pl-4 pr-1 text-base leading-snug outline-none [field-sizing:content] placeholder:text-mut"
        />
        <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => sp.start({ autoStop: 8000 })} aria-label="Sesle yaz" className="mb-0.5 mr-0.5 grid size-10 shrink-0 place-items-center rounded-full text-acc active:bg-bg">
          <Icon name="mic" className="size-[1.25rem]" />
        </button>
      </div>
      {value.trim() || !orb ? (
        <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={onSend} disabled={!value.trim()} aria-label={sendLabel} className="grid size-11 shrink-0 place-items-center rounded-full bg-acc text-white active:scale-90 disabled:opacity-40">
          <Icon name={sendIcon} className="size-5" />
        </button>
      ) : (
        <MiniOrb focus={focus} examples={examples} />
      )}
    </div>
  );
}
