"use client";

import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { Avatar } from "@/features/chat/bits";
import { STATUS, callLabel } from "@/lib/call";

// Tam ekran arama: kişinin adı, durum (Aranıyor…, Seni arıyor, süre), Aç / Reddet ya da Sessize al / Kapat
export function CallScreen({ call, name, onAccept, onDecline, onHangup, onMute }) {
  const now = useNow(1000);
  const ms = call.startMs ? Math.max(0, now.getTime() - call.startMs) : 0;
  const incoming = call.role === "callee" && call.status === STATUS.ringing && !call.done;
  const label = callLabel({ status: call.status, role: call.role, conn: call.conn, ms });
  return (
    <div role="dialog" aria-label={`${name} ile arama`} className="fixed inset-0 z-[80] flex flex-col items-center bg-deep px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] text-white">
      <p className="text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-white/60">Sesli arama</p>
      <div className={`mt-8 rounded-full p-1.5 ${call.status === STATUS.ringing && !call.done ? "animate-pulse ring-4 ring-white/20" : ""}`}>
        <Avatar name={name} size="size-28" text="text-[2.25rem]" tone="bg-white/15 text-white" />
      </div>
      <h1 className="mt-6 max-w-full truncate text-[1.75rem] font-semibold tracking-tight">{name}</h1>
      <p className="mt-1.5 text-[1rem] tabular-nums text-white/75">{label}</p>

      <div className="mt-auto flex w-full max-w-[20rem] items-end justify-around">
        {incoming ? (
          <>
            <Round label="Reddet" onClick={onDecline} className="bg-[#e5484d]" icon="phone" rotate />
            <Round label="Aç" onClick={onAccept} className="bg-[#30a46c]" icon="phone" />
          </>
        ) : (
          <>
            {call.status === STATUS.active && !call.done && (
              <Round label={call.muted ? "Sesi aç" : "Sessize al"} onClick={onMute} className={call.muted ? "bg-white text-deep" : "bg-white/15"} icon={call.muted ? "mute" : "mic"} />
            )}
            <Round label={call.done ? "Kapat" : "Bitir"} onClick={onHangup} className="bg-[#e5484d]" icon={call.done ? "x" : "phone"} rotate={!call.done} />
          </>
        )}
      </div>
    </div>
  );
}

function Round({ label, onClick, className, icon, rotate }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2 text-[0.8125rem] font-medium text-white/85">
      <span className={`grid size-[4.25rem] place-items-center rounded-full shadow-lg active:scale-95 ${className}`}>
        <Icon name={icon} className={`size-7 ${rotate ? "rotate-[135deg]" : ""}`} />
      </span>
      {label}
    </button>
  );
}
