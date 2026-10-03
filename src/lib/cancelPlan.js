// Plan iptali: kayıt silinmez, status "cancelled" olur (geri alınabilir). Haber metni ve WhatsApp bağlantısı burada.
export const CANCEL_REASONS = [
  ["wind", "Rüzgâr"],
  ["weather", "Hava"],
  ["other", "Diğer"],
];
const WHY = { wind: "rüzgâr nedeniyle ", weather: "hava koşulları nedeniyle ", other: "" };

const D = (s) => new Date(`${s}T12:00:00`);
const plus = (s, n) => {
  const d = D(s);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function dayWord(date, today) {
  if (date === today) return "Bugün";
  if (date === plus(today, 1)) return "Yarın";
  return D(date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
}

// "Bugün 16:00 Optimist antrenmanı rüzgâr nedeniyle iptal edildi."
export function cancelText(plan, reason, today) {
  const when = [plan.date ? dayWord(plan.date, today) : "", plan.time || ""].filter(Boolean).join(" ");
  const title = String(plan.title || "Plan").trim();
  return `${when ? `${when} ` : ""}${title} ${WHY[reason] ?? ""}iptal edildi.`.replace(/\s+/g, " ");
}

// İptal edilebilir mi: geçmemiş, iptal edilmemiş plan
export const canCancel = (plan, today) => !!plan && plan.status !== "cancelled" && (plan.endDate || plan.date || "") >= today;

export const waLink = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
