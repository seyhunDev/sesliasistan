"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Icon } from "./Icon";

const shadow = "shadow-[0_6px_24px_-8px_rgba(38,40,44,.18)] ring-1 ring-line";

// Alttaki sabit çubuk: solda büyük "Konuş", yanında "Yaz" düğmesi.
// Yaz'a basınca yazı alanı açılır ve klavye hemen gelir; boşken kapatınca çubuk eski hâline döner.
// onMic(): dinlemeyi başlatır. onSend(text): yazılanı gönderir. leading: soldaki ek düğmeler (+, toplantı).
export function VoiceTextBar({ onMic, onSend, placeholder = "Yaz…", micLabel = "Konuş", leading }) {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const input = useRef(null);

  // iPhone'da klavye yalnızca dokunuşun içinde odaklanırsa açılır: alan aynı anda çizilip odaklanır
  const openType = () => {
    flushSync(() => setTyping(true));
    input.current?.focus();
  };
  const close = () => {
    setText("");
    setTyping(false);
  };
  const send = () => {
    const t = text.trim();
    if (!t) return input.current?.focus();
    onSend(t);
    close();
    input.current?.blur();
  };

  return (
    <div data-bar="" className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-6">
      <div className="mx-auto flex max-w-[28rem] items-center gap-2">
        {typing ? (
          <>
            <button type="button" onClick={close} aria-label="Yazmayı kapat" className={`grid size-12 shrink-0 place-items-center rounded-full bg-card text-mut transition active:scale-90 ${shadow}`}>
              <Icon name="x" className="size-5" />
            </button>
            <div className={`flex min-w-0 flex-1 items-center gap-2 rounded-full bg-card py-1.5 pl-4 pr-1.5 ${shadow}`}>
              <input
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
                onBlur={() => !text.trim() && setTimeout(() => setTyping((t) => (input.current === document.activeElement ? t : false)), 150)}
                placeholder={placeholder}
                enterKeyHint="send"
                autoCapitalize="sentences"
                className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-[0.9375rem] placeholder:text-mut"
              />
              <button
                type="button"
                onClick={send}
                disabled={!text.trim()}
                aria-label="Gönder"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-acc text-white transition active:scale-90 disabled:opacity-40"
              >
                <Icon name="up" className="size-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            {leading}
            <button
              type="button"
              onClick={onMic}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-acc text-[1rem] font-semibold text-white shadow-[0_6px_24px_-8px_rgba(38,40,44,.35)] transition active:scale-[.98]"
            >
              <Icon name="mic" className="size-[1.375rem]" />
              <span className="truncate">{micLabel}</span>
            </button>
            <button type="button" onClick={openType} aria-label="Yaz" className={`flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-card px-4 text-[0.9375rem] font-semibold text-fg transition active:scale-95 ${shadow}`}>
              <Icon name="keyboard" className="size-5 text-acc" />
              Yaz
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Çubuğun soluna konan yuvarlak ek düğme (+, toplantı)
export function BarButton({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`grid size-12 shrink-0 place-items-center rounded-full bg-card text-acc transition active:scale-90 ${shadow}`}>
      <Icon name={icon} className="size-[1.375rem]" />
    </button>
  );
}
