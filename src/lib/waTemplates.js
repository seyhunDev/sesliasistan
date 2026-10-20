// Sporculara WhatsApp mesajı için hazır kalıplar (Seyhun 2026-10-20: "hazır kalıplar; kopyalar, WhatsApp'a gider, grubu seçer, yapıştırır").
// Hazır olanlar o anki planlardan yazılır (sıradaki antrenman, iptali, sıradaki yarış); kullanıcının kaydettikleri users/{uid}.waTemplates [metin].
import { cancelText, dayWord } from "./cancelPlan";
import { isTraining } from "./trainingLog";

export const WA_TEMPLATE_MAX = 20;

const plus = (s, n) => {
  const d = new Date(`${s}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// plans: tüm planlar; races: useRaceHome().open [{ name, startDate }]; now: saat (bugünün geçmiş antrenmanı sayılmaz). Dönüş [metin]
export function athleteTemplates(plans = [], races = [], today, now = new Date()) {
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const week = plus(today, 7);
  const next = plans
    .filter((p) => isTraining(p) && p.status !== "cancelled" && p.date && p.date >= today && p.date <= week && !(p.date === today && p.time && p.time < hm))
    .sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`))[0];
  const out = [];
  if (next) {
    const when = [dayWord(next.date, today), next.time].filter(Boolean).join(" ");
    out.push(`${when} antrenman var${next.place ? `, yer: ${next.place}` : ""}.`);
    out.push(cancelText(next, "wind", today));
  }
  const race = [...races].filter((r) => r?.name && r.startDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (race) out.push(`${race.name} ${dayWord(race.startDate, today)} başlıyor.`);
  out.push("Antrenmana gelirken can yeleğinizi, suyunuzu ve şapkanızı getirin.");
  out.push("Bugünkü fitness antrenmanınızı yapmayı unutmayın.");
  return out;
}

// Kaydedilen kalıplar: boşlar ve aynıları atılır, en çok 20, en yenisi önde
export function cleanTemplates(list) {
  const out = [];
  for (const t of Array.isArray(list) ? list : []) {
    const s = String(t || "").trim().slice(0, 500);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= WA_TEMPLATE_MAX) break;
  }
  return out;
}
