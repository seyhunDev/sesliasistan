"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { useKind } from "@/features/auth/useKind";
import { canReceipts, isAthleteSide } from "@/lib/kinds";
import { listsFor } from "@/features/shop/shop";
import { myFit } from "@/lib/fitness/model";
import { useRaceHome } from "@/features/athletes/raceHome";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { homeActions } from "@/lib/homeTiles";
import { AppLogo } from "@/components/ui/AppLogo";

// Geniş ekran (bilgisayar, yatay tablet): alt sekme çubuğu yerine solda sabit menü (Seyhun 2026-10-18: "cep telefonu, tablet ve
// web uyumlu olsun"). Telefonda ve dik tablette görünmez; sayfaların içi aynı kalır, yalnız genişler (globals.css "Geniş ekran").
export const WIDE = "(min-width: 64rem)";
const sub = (cb) => {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
export const useWide = () => useSyncExternalStore(sub, () => window.matchMedia(WIDE).matches, () => false);

const TABS = [
  ["/", "Ana sayfa"],
  ["/calendar", "Takvim"],
  ["/messages", "Mesajlar"],
  ["/tasks", "Görevler"],
];

// Ana sayfadaki sayfa düğmeleriyle aynı liste ve aynı izinler (homeActions)
function usePages() {
  const { profile } = useAuth();
  const { plans, lessons, members } = useData();
  const kind = useKind();
  const race = useRaceHome();
  const { openMeeting } = useMeeting();
  const staff = profile?.role === "staff";
  return homeActions({
    staff,
    owner: profile?.role === "owner",
    side: isAthleteSide(kind),
    parent: kind === "parent",
    athletes: canSeeAthletes(profile?.email),
    races: race.on,
    training: plans.some((p) => (p.cat || p.category) === "Antrenman"),
    receipts: canReceipts(kind),
    shop: listsFor(kind, members).length > 0,
    lessons: lessons.length > 0,
    fit: staff && myFit(plans, profile?.uid).length > 0,
  }).map((g) => ({ ...g, items: g.items.map((a) => (a.id === "meeting" ? { ...a, onClick: openMeeting } : a)) }));
}

const row = (on) =>
  `flex h-10 w-full items-center justify-between rounded-xl px-3.5 text-left transition active:scale-[.98] ${on ? "bg-acc/10 font-semibold text-acc" : "text-fg hover:bg-fg/[.04]"}`;

export function SideNav({ path, unread = 0, orb = null }) {
  const pages = usePages();
  const { profile } = useAuth();
  useEffect(() => {
    document.body.dataset.side = "1";
    return () => delete document.body.dataset.side;
  }, []);
  const at = (href) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  const items = pages.flatMap((g) => g.items);
  return (
    <nav aria-label="Menü" className="sidenav fixed inset-y-0 left-0 z-[37] hidden w-60 flex-col border-r border-line bg-card pt-[max(1.25rem,env(safe-area-inset-top))]">
      {/* Uygulamanın kimliği: logo ve ad, menünün en üstünde */}
      <Link href="/" className="mb-3 flex items-center gap-2 px-6">
        <AppLogo size={28} />
        <span className="text-[1.125rem] font-semibold tracking-[-.01em] text-fg">Velora</span>
      </Link>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]">
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} aria-current={at(href) ? "page" : undefined} className={`${row(at(href))} text-[0.9375rem] ${at(href) ? "" : "font-medium"}`}>
            {label}
            {href === "/messages" && unread > 0 && <span className="rounded-full bg-rec px-1.5 text-[0.6875rem] font-semibold tabular-nums text-white">{unread > 99 ? "99+" : unread}</span>}
          </Link>
        ))}
        <div className="mx-2 my-3 h-px bg-line" />
        {items.map((a) =>
          a.href ? (
            <Link key={a.href} href={a.href} aria-current={at(a.href) ? "page" : undefined} className={`${row(at(a.href))} text-[0.875rem]`}>
              {a.label}
            </Link>
          ) : (
            <button key={a.id} type="button" onClick={a.onClick} className={`${row(false)} text-[0.875rem]`}>
              {a.label}
            </button>
          ),
        )}
        <Link href="/settings" aria-current={at("/settings") ? "page" : undefined} className={`${row(at("/settings"))} text-[0.875rem]`}>
          Ayarlar
          <span className="truncate pl-2 text-[0.75rem] font-normal text-mut">{profile?.name}</span>
        </Link>
      </div>
      {orb && <div className="flex shrink-0 items-center gap-3 border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{orb}</div>}
    </nav>
  );
}
