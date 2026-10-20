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
export function dayWord(date, today) {
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
// Metinle WhatsApp (Seyhun 2026-10-20: wa.me telefonda 404 verdi; "telefonda doğrudan WhatsApp uygulaması, webde WhatsApp Web"):
// telefonda uygulama (whatsapp://, sohbet/grup orada seçilir), bilgisayarda WhatsApp Web; tarayıcı bilinmiyorsa wa.me
const isPhone = (ua) => /iphone|ipad|ipod|android/i.test(ua) || (/macintosh/i.test(ua) && /mobile/i.test(ua));
export function waTextUrl(text, ua = "") {
  const t = encodeURIComponent(text);
  if (isPhone(ua)) return `whatsapp://send?text=${t}`;
  if (ua) return `https://web.whatsapp.com/send?text=${t}`;
  return waLink(text);
}
// Açılacak adres: telefonda her zaman WhatsApp uygulaması, metin hazır (grup orada seçilir). Grup davet bağlantısı
// (chat.whatsapp.com) telefonda uygulamayı açmıyor, PWA içinde web sayfası kalıyordu (Seyhun 2026-10-20: "çalışmıyor");
// bağlantı yalnız bilgisayarda kullanılır.
export function waHref(text, group = "", ua = "") {
  if (group && !isPhone(ua)) return group;
  return waTextUrl(text, ua);
}
// Uygulama bağlantısı (whatsapp://) aynı pencerede açılır (PWA'da yeni pencere boş sayfa/404 olur), diğerleri yeni sekmede
const openUrl = (u) => (u.startsWith("whatsapp:") ? (window.location.href = u) : window.open(u, "_blank"));

// Metin panoya kopyalanır, WhatsApp açılır (waHref). Telefonun paylaşım menüsü açılmaz (Seyhun: "doğrudan WhatsApp'a gitsin").
// Dokunuşun içinde, beklemeden çağrılmalı (iPhone pano ve yeni pencereyi yalnız dokunuşla açar).
export function shareText(text, nav = typeof navigator !== "undefined" ? navigator : null, open = openUrl, group = "") {
  try { nav?.clipboard?.writeText?.(text)?.catch?.(() => {}); } catch {}
  const u = waHref(text, group, nav?.userAgent || "");
  open(u);
  return u === group ? "group" : "link";
}
export const shareGroup = (text, group = "") => shareText(text, undefined, undefined, group);
