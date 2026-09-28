"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const TABS = [
  { href: "/", label: "Ana Sayfa", icon: "home" },
  { href: "/receipts", label: "Fişler", icon: "receipt" },
  { href: "/plans", label: "Planlar", icon: "cal" },
  { href: "/notes", label: "Notlar", icon: "note" },
  { href: "/tasks", label: "Görevler", icon: "task" },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="Ana menü" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-[480px]">
        {TABS.map((t) => {
          const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-medium transition active:opacity-60 ${on ? "text-acc" : "text-mut"}`}
            >
              <Icon name={t.icon} className="size-[22px]" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
