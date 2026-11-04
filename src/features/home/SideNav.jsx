"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
import { Icon } from "@/components/ui/Icon";

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

// Açık gruplar cihazda saklanır (Seyhun 2026-11-04 "gruplara ayıralım, tıklayınca açılsın"); kayıt yoksa yalnız açık sayfanın grubu açık
const OPEN_KEY = "sa-side-open";
function readOpen() {
  try {
    const v = JSON.parse(localStorage.getItem(OPEN_KEY) || "null");
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export function SideNav({ path, unread = 0, orb = null }) {
  const pages = usePages();
  const { profile } = useAuth();
  const [open, setOpen] = useState(null); // null: henüz okunmadı (sunucu çizimiyle aynı başlar)
  useEffect(() => {
    document.body.dataset.side = "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(readOpen());
    return () => delete document.body.dataset.side;
  }, []);
  const at = (href) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  // Ana sayfanın "Tümü" gruplarıyla aynı (homeActions); Görevler üstte zaten var
  const groups = pages.map((g) => ({ ...g, items: g.items.filter((a) => !TABS.some(([h]) => h === a.href)) })).filter((g) => g.items.length);
  const here = groups.find((g) => g.items.some((a) => a.href && at(a.href)))?.title;
  const isOpen = (t) => t === here || (open || []).includes(t);
  const toggle = (t) => {
    const cur = new Set(open || (here ? [here] : []));
    if (isOpen(t) && t !== here) cur.delete(t);
    else if (cur.has(t)) cur.delete(t);
    else cur.add(t);
    const next = [...cur];
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {}
  };
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
        {/* Gruplar: başlığa tıklayınca açılır/kapanır; açık sayfanın grubu hep açık */}
        {groups.map((g) => {
          const on = isOpen(g.title);
          const lock = g.title === here;
          return (
            <div key={g.title} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggle(g.title)}
                aria-expanded={on}
                disabled={lock}
                className="flex h-9 w-full items-center justify-between rounded-xl px-3.5 text-left text-[0.8125rem] font-semibold text-mut transition hover:bg-fg/[.04] disabled:cursor-default disabled:hover:bg-transparent"
              >
                {g.title}
                {!lock && <Icon name="chev" className={`size-3.5 transition-transform ${on ? "rotate-90" : ""}`} />}
              </button>
              {on && (
                <div className="pb-1.5">
                  {g.items.map((a) =>
                    a.href ? (
                      <Link key={a.href} href={a.href} aria-current={at(a.href) ? "page" : undefined} className={`${row(at(a.href))} pl-5 text-[0.875rem]`}>
                        {a.label}
                      </Link>
                    ) : (
                      <button key={a.id} type="button" onClick={a.onClick} className={`${row(false)} pl-5 text-[0.875rem]`}>
                        {a.label}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className="mx-2 my-3 h-px bg-line" />
        <Link href="/settings" aria-current={at("/settings") ? "page" : undefined} className={`${row(at("/settings"))} text-[0.875rem] font-medium`}>
          Ayarlar
          <span className="truncate pl-2 text-[0.75rem] font-normal text-mut">{profile?.name}</span>
        </Link>
      </div>
      {orb && <div className="flex shrink-0 items-center gap-3 border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{orb}</div>}
    </nav>
  );
}
