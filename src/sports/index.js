// Velora sporları (2026-11-12): uygulama "Velora Sailing"; başka spor sürümleri aynı depoda gelir.
// Kişinin sporu users/{uid}.sport. Alan yoksa henüz seçmemiştir: SportGate bir kez sorar.
// Ortak kısımlar (plan, not, asistan, bütçe, hava…) her sporda aynı; spora özel sayfalar parts listesinde.
import { SAILING_PARTS } from "./sailing/parts";

export const SPORTS = [{ id: "sailing", name: "Sailing", parts: SAILING_PARTS }];

// Yakında gelecekler (seçilemez)
export const SOON = [
  { id: "tennis", name: "Tenis" },
  { id: "running", name: "Koşu" },
  { id: "swimming", name: "Yüzme" },
  { id: "cycling", name: "Bisiklet" },
  { id: "football", name: "Futbol" },
  { id: "rowing", name: "Kürek" },
];

export const isSport = (id) => SPORTS.some((s) => s.id === id);

// Seçilmiş spor ("" = henüz seçilmedi)
export const chosenSport = (profile) => (isSport(profile?.sport) ? profile.sport : "");

// Seçim yapılana kadar uygulama Sailing gibi çalışır
export const sportOf = (profile) => chosenSport(profile) || "sailing";

// Seçim ekranı kime çıkar: spor seçmemiş her hesap (ana hesap dahil), kurye hariç.
// Profil belgesi henüz gelmediyse (onboarded null) sorulmaz; yoksa seçmiş kişiye bir an görünebilirdi.
export const needsSport = (profile) => !!profile && profile.onboarded !== null && profile.role !== "courier" && !chosenSport(profile);

// Bu sporda bu bölüm var mı ("races", "live"…)
export const hasPart = (sport, part) => !!SPORTS.find((s) => s.id === (sport || "sailing"))?.parts.includes(part);

export const sportName = (id) => SPORTS.find((s) => s.id === id)?.name || "";
