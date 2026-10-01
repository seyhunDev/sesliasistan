"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useAdd } from "@/features/add/AddProvider";
import { useAssistant } from "@/features/assistant/AssistantProvider";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useChat } from "@/features/chat/ChatProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { useKind } from "@/features/auth/useKind";
import { canReceipts } from "@/lib/kinds";

const HOLD_MS = 450; // basılı tutma: yazarak sor

// Asistan küresi: dokun → konuş, basılı tut → yaz. Halkalar yavaşça nefes alır.
function Orb({ onTap, onHold }) {
  const t = useRef(null);
  const held = useRef(false);
  const down = () => {
    held.current = false;
    t.current = setTimeout(() => {
      held.current = true;
      navigator.vibrate?.(12);
      onHold();
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
      onClick={() => !held.current && onTap()}
      aria-label="Asistan: dokun konuş, basılı tut yaz"
      className="absolute bottom-[calc(0.875rem+env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 select-none flex-col items-center gap-1.5 [-webkit-touch-callout:none]"
    >
      <span className="relative grid size-[4.25rem] place-items-center rounded-full bg-[#2c5163] shadow-[0_12px_28px_-10px_rgba(44,81,99,.75),inset_0_0_0_3px_rgba(255,255,255,.14)] transition active:scale-95">
        <span className="pointer-events-none absolute -inset-2 animate-[softpulse_3.5s_ease-in-out_infinite] rounded-full border-2 border-acc/25" />
        <span className="pointer-events-none absolute -inset-[0.875rem] animate-[softpulse_3.5s_ease-in-out_.6s_infinite] rounded-full border-[1.5px] border-acc/12" />
        <span className="flex h-[1.375rem] items-end gap-[3px]" aria-hidden="true">
          {[9, 16, 22, 14, 8].map((h, i) => (
            <i key={i} className={`w-[3px] rounded-full bg-white ${i === 0 || i === 4 ? "opacity-70" : ""}`} style={{ height: h }} />
          ))}
        </span>
      </span>
      <span className="relative z-10 text-[0.6875rem] font-bold leading-none text-[#2c5163]">Asistan</span>
    </button>
  );
}

function Tab({ href, icon, label, active, badge, onClick }) {
  const cls = `relative flex w-16 flex-col items-center gap-1 pt-0.5 transition active:scale-95 ${active ? "text-[#2c5163]" : "text-mut"}`;
  const inner = (
    <>
      <span className="relative flex">
        <Icon name={icon} className={`size-6 ${active ? "[stroke-width:2.1]" : ""}`} />
        {badge > 0 && (
          <span className="absolute -right-3 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-rec px-1 text-[0.6875rem] font-bold tabular-nums text-white ring-2 ring-card">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className={`text-[0.6875rem] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
    </>
  );
  return href ? (
    <Link href={href} aria-current={active ? "page" : undefined} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

// Alt sekme çubuğu (Ana sayfa, Takvim, Mesajlar sayfalarında): Ana sayfa · Takvim · [Asistan] · Mesajlar · Oluştur
export function TabBar() {
  const path = usePathname();
  const router = useRouter();
  const { openAssistant } = useAssistant();
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openBirthday } = useBirthday();
  const { unreadTotal } = useChat();
  const [menu, setMenu] = useState(false);
  const kind = useKind();
  const unread = unreadTotal; // yalnız sohbetler (kayıt konuşmaları kendi sayfalarında ve "Senin için"de)

  const go = (fn) => () => {
    setMenu(false);
    fn();
  };
  const items = [
    ["cal", "Plan", "Tarih ve saat", go(() => openAdd({ type: "plan" }))],
    ["task", "Görev", "Yapılacak iş", go(() => openAdd({ type: "task" }))],
    ["note", "Not", "Kısa not", go(() => openAdd({ type: "note" }))],
    canReceipts(kind) && ["camera", "Fiş", "Fotoğrafla", go(() => openReceipt())],
    ["cake", "Doğum günü", "Hatırlat", go(() => openBirthday())],
    ["book", "Dersler", "Program", go(() => router.push("/schedule"))],
  ].filter(Boolean);

  return (
    <>
      <nav data-bar="" aria-label="Alt menü" className="fixed inset-x-0 bottom-0 z-20">
        <div className="relative mx-auto max-w-[30rem]">
          <div className="flex items-start justify-around rounded-t-[1.5rem] bg-card px-2.5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-16px_rgba(38,40,44,.35)]">
            <Tab href="/" icon="home" label="Ana sayfa" active={path === "/"} />
            <Tab href="/calendar" icon="cal" label="Takvim" active={path === "/calendar"} />
            <span className="w-[4.75rem]" aria-hidden="true" />
            <Tab href="/messages" icon="chat" label="Mesajlar" active={path === "/messages"} badge={unread} />
            <Tab icon="plus" label="Oluştur" onClick={() => setMenu(true)} />
          </div>
          <Orb onTap={() => openAssistant({ listen: true })} onHold={() => openAssistant({})} />
        </div>
      </nav>
      <Sheet open={menu} onClose={() => setMenu(false)} title="Oluştur">
        <div className="grid grid-cols-2 gap-2.5">
          {items.map(([icon, label, desc, onClick]) => (
            <button key={label} type="button" onClick={onClick} className="flex items-center gap-2.5 rounded-2xl bg-bg px-3 py-3 text-left transition active:scale-[.98]">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-acc">
                <Icon name={icon} className="size-5" />
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[0.9375rem] font-semibold">{label}</b>
                <small className="block truncate text-[0.75rem] text-mut">{desc}</small>
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

// Uygulama yerleşiminde tek kez çizilir: sayfa değişince yeniden kurulmaz (geçişte titreme/zıplama olmaz).
// Ana sayfa, Takvim ve Mesajlar listesinde görünür; sohbet ekranında gizlenir.
function Host() {
  const path = usePathname();
  const chat = useSearchParams().get("c");
  if (!(path === "/" || path === "/calendar" || (path === "/messages" && !chat))) return null;
  return <TabBar />;
}
export function TabBarHost() {
  return (
    <Suspense fallback={null}>
      <Host />
    </Suspense>
  );
}
