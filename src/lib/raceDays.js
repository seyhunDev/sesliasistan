import { todayStr } from "@/lib/utils/format";

// Sporcunun kayıtlı yarışları (features/athletes/myRaces.js): kalan gün ve yaklaşanlar (saf fonksiyonlar, testli)
// Kaç gün kaldı (bugün başlıyorsa 0; dün ya da önce başlayıp sürüyorsa -1)
export function daysTo(r, today = todayStr()) {
  if (r.startDate < today && (r.endDate || r.startDate) >= today) return -1;
  return Math.round((new Date(`${r.startDate}T12:00`) - new Date(`${today}T12:00`)) / 86400000);
}
export const upcoming = (races, today = todayStr()) => (races || []).filter((r) => (r.endDate || r.startDate) >= today);
