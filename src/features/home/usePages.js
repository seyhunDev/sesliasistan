"use client";

import { useData } from "@/features/data/DataProvider";
import { useHesap } from "@/features/auth/useHesap";
import { useRaceHome } from "@/features/athletes/raceHome";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { listsFor } from "@/features/shop/shop";
import { myFit } from "@/lib/fitness/model";
import { homeActions } from "@/lib/hesapGorunum";
import { canReceipts } from "@/lib/kinds";

// Tümü penceresi (HomeGrid) ve sol menü (SideNav) aynı sayfa listesini kullanır: hesap görünümüne göre (lib/hesapGorunum.js homeActions)
export function usePages() {
  const h = useHesap();
  const { plans, lessons, members } = useData();
  const race = useRaceHome();
  const { openMeeting } = useMeeting();
  return homeActions({
    staff: h.staff,
    owner: h.owner,
    side: h.side,
    parent: h.kind === "parent",
    athletes: h.athletes,
    races: race.on,
    training: plans.some((p) => (p.cat || p.category) === "Antrenman"),
    receipts: canReceipts(h.kind),
    shop: listsFor(h.kind, members).length > 0,
    lessons: lessons.length > 0,
    fit: h.staff && myFit(plans, h.profile?.uid).length > 0,
    plain: h.plain,
    coach: h.coach,
  }).map((g) => ({ ...g, items: g.items.map((a) => (a.id === "meeting" ? { ...a, onClick: openMeeting } : a)) }));
}
