"use client";

import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { Avatar } from "@/features/chat/bits";
import { STATUS, callLabel } from "@/lib/call";

// Tam ekran arama: kişinin adı, durum (Aranıyor…, Seni arıyor, süre), Aç / Reddet ya da Sessize al / Hoparlör / Bitir.
// Küçültülünce (sürerken) üstte yeşil şerit kalır, uygulamada gezinilebilir; şeride dokununca ekran geri açılır.
export function CallScreen({ call, name, canRoute, onAccept, onDecline, onHangup, onMute, onSpeaker, onMini }) {
  const now = useNow(1000);
  const ms = call.startMs ? Math.max(0, now.getTime() - call.startMs) : 0;
  const incoming = call.role === "callee" && call.status === STATUS.ringing && !call.done;
  const live = call.status === STATUS.active && !call.done;
  const label = callLabel({ status: call.status, role: call.role, conn: call.conn, ms, retrying: call.retrying });

  if (call.mini && live)
    return (
      <button
        type="button"
        onClick={() => onMini(false)}
        className="fixed left-1/2 top-[calc(0.375rem+env(safe-area-inset-top))] z-[80] flex h-9 max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full bg-[#30a46c] px-4 text-[0.875rem] font-semibold text-white shadow-lg active:scale-95"
      >
        <Icon name="phone" className="size-4 shrink-0" />
        <span className="truncate">{name}</span>
        <span className="shrink-0 tabular-nums font-medium text-white/85">{label}</span>
      </button>
    );

  return (
    <div role="dialog" aria-label={`${name} ile arama`} className="fixed inset-0 z-[80] flex flex-col items-center bg-deep px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-white">
      <div className="flex h-11 w-full items-center">
        {live && (
          <button type="button" onClick={() => onMini(true)} aria-label="Küçült" className="grid size-11 place-items-center rounded-full text-white/80 active:bg-white/10">
            <Icon name="chev" className="size-6 rotate-90" />
          </button>
        )}
      </div>
      <p className="mt-6 text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-white/60">Sesli arama</p>
      <div className={`mt-8 rounded-full p-1.5 ${call.status === STATUS.ringing && !call.done ? "animate-pulse ring-4 ring-white/20" : ""}`}>
        <Avatar name={name} size="size-28" text="text-[2.25rem]" tone="bg-white/15 text-white" />
      </div>
      <h1 className="mt-6 max-w-full truncate text-[1.75rem] font-semibold tracking-tight">{name}</h1>
      <p className={`mt-1.5 text-[1rem] tabular-nums ${call.retrying ? "text-amber-200" : "text-white/75"}`}>{label}</p>
      {live && call.muted && <p className="mt-3 rounded-full bg-white/10 px-3 py-1 text-[0.8125rem] text-white/80">Mikrofonun kapalı</p>}

      <div className="mt-auto flex w-full max-w-[21rem] items-end justify-around">
        {incoming ? (
          <>
            <Round label="Reddet" onClick={onDecline} className="bg-[#e5484d]" icon="phone" rotate />
            <Round label="Aç" onClick={onAccept} className="bg-[#30a46c]" icon="phone" />
          </>
        ) : (
          <>
            {live && <Round label={call.muted ? "Sesi aç" : "Sessize al"} onClick={onMute} className={call.muted ? "bg-white text-deep" : "bg-white/15"} icon={call.muted ? "mute" : "mic"} />}
            {live && canRoute && <Round label={call.speaker ? "Hoparlör açık" : "Hoparlör"} onClick={onSpeaker} className={call.speaker ? "bg-white text-deep" : "bg-white/15"} icon="volume" />}
            <Round label={call.done ? "Kapat" : "Bitir"} onClick={onHangup} className="bg-[#e5484d]" icon={call.done ? "x" : "phone"} rotate={!call.done} />
          </>
        )}
      </div>
    </div>
  );
}

function Round({ label, onClick, className, icon, rotate }) {
  return (
    <button type="button" onClick={onClick} className="flex w-20 flex-col items-center gap-2 text-[0.8125rem] font-medium text-white/85">
      <span className={`grid size-[4.25rem] place-items-center rounded-full shadow-lg active:scale-95 ${className}`}>
        <Icon name={icon} className={`size-7 ${rotate ? "rotate-[135deg]" : ""}`} />
      </span>
      {label}
    </button>
  );
}
