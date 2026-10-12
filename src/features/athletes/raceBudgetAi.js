"use client";

// Yapay zekayla bütçe: antrenörün yazdığı/söylediği masraflar (ve talimattaki ücretler) → kalemler.
// Yalnız yarış bilgisi ve sayılar gider; sporcu adı gitmez.
import { authFetch } from "@/lib/authFetch";
import { cleanBudget, emptyBudget } from "./budget";
import { raceHotels } from "./races";
import { matchNames } from "@/lib/trainingLog";

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
      hotels: raceHotels(r),
      items: b.items,
    }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Bütçe anlaşılamadı");
  return p;
}

// Yapay zekanın "for" adlarını yarışın sporcularıyla eşleştirir: kalem yalnız onlara yazılır (only).
// Bulunamayan ad varsa kalem herkese kalır, ad missed'de döner.
export function whoFor(items, athletes) {
  const missed = [];
  athletes = (athletes || []).map((a) => ({ ...a, status: "active" })); // yarışa seçilenler arasında aranır
  const out = (items || []).map(({ for: names, ...x }) => {
    if (!names) return x;
    const m = matchNames(String(names).split(/\s*(?:,|\bve\b|\bile\b)\s*/i).filter(Boolean), athletes);
    if (!m.ids.length || m.unknown.length) {
      missed.push(...(m.unknown.length ? m.unknown : [names]));
      return x;
    }
    return { ...x, only: m.ids };
  });
  return { items: out, missed };
}

// Gelen kalemleri bütçeye ekler (kişi/gece sayısı söylendiyse onlar da değişir)
// athletes: yarışın sporcuları (kalem belli sporcu içinse eşleştirmek için)
export function mergeBudget(r, p, athletes = []) {
  const b = r.budget || emptyBudget(r);
  return cleanBudget({
    ...b,
    staff: p.staff ?? b.staff,
    nights: p.nights ?? b.nights,
    items: [...b.items, ...whoFor(p.items, athletes).items],
  });
}
