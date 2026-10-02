"use client";

// Yapay zekayla bütçe: antrenörün yazdığı/söylediği masraflar (ve talimattaki ücretler) → kalemler.
// Yalnız yarış bilgisi ve sayılar gider; sporcu adı gitmez.
import { authFetch } from "@/lib/authFetch";
import { cleanBudget, emptyBudget } from "./budget";

export async function askBudget(r, athletes, text) {
  const b = r.budget || emptyBudget(r);
  const res = await authFetch("/api/race-budget", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text,
      race: { name: r.name, startDate: r.startDate, endDate: r.endDate, city: r.city, district: r.district },
      athletes,
      staff: b.staff,
      nights: b.nights,
      fees: r.notice?.fees || [],
      hotels: r.notice?.hotels || [],
      items: b.items,
    }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Bütçe anlaşılamadı");
  return p;
}

// Gelen kalemleri bütçeye ekler (kişi/gece sayısı söylendiyse onlar da değişir)
export function mergeBudget(r, p) {
  const b = r.budget || emptyBudget(r);
  return cleanBudget({
    ...b,
    staff: p.staff ?? b.staff,
    nights: p.nights ?? b.nights,
    items: [...b.items, ...(p.items || [])],
  });
}
