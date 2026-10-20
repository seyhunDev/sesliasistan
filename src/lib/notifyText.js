// Bildirim metinleri: günlük dille kısa tek cümle (Seyhun, 2026-10-20: "robot gibi yazmayalım, direkt planı söyleyelim").
//   "Bugün 16:00'da Antrenman var (Liman)", "Yeni görevin var: Motor yağı (yarına kadar)", "Ali yaptı: Motor yağı".
//   Cümle başlıktadır, gövde boş kalır. Kimin eklediği yalnız ana hesaba giden "… ekledi" bildiriminde yazar.
//   Telefonda tek parça görünür (public/sw.js). Üstteki uygulama adı işletim sisteminindir.
const TZ = "Europe/Istanbul";
const MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const say = (s) => ({ title: cut(String(s).replace(/\s+/g, " ").trim(), 120), body: "" });
const paren = (x) => (x ? ` (${x})` : "");
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");

// Saatin bulunma eki, okunuşuna göre: 16:00'da (on altı), 11:00'de (on bir), 10:15'te (on beş), 09:40'ta (kırk)
const SUFFIX = ["da", "de", "de", "te", "te", "te", "da", "de", "de", "da"]; // sıfır bir iki üç dört beş altı yedi sekiz dokuz
const TENS = { 1: "da", 2: "de", 3: "da", 4: "ta", 5: "de" }; // on yirmi otuz kırk elli
function spoken(n) {
  return n % 10 ? SUFFIX[n % 10] : n ? TENS[n / 10] : "da";
}
export function atTime(hm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm || "");
  if (!m) return hm || "";
  const h = +m[1];
  const min = +m[2];
  return `${hm}'${min ? spoken(min) : h ? spoken(h) : "da"}`;
}

export const todayIn = (tz = TZ) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
// "Bugün", "Yarın", "Dün" ya da "3 Eki"
export function dayLabel(date, today = todayIn()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return "";
  const diff = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5);
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  if (diff === -1) return "Dün";
  return `${+date.slice(8, 10)} ${MON[+date.slice(5, 7) - 1]}`;
}
// Gönderen adı: yalnız ad ("Ali Kaya" → "Ali")
const who = (name) => String(name || "").trim().split(/\s+/)[0] || "";
const when = (date, time, today) => [dayLabel(date, today), time && atTime(time)].filter(Boolean).join(" ");
// "Bugün 16:00'daki" / "Yarın" (saatsiz): iptal ve silmede
const whenOf = (date, time, today) => (time ? `${when(date, time, today)}ki ` : dayLabel(date, today) ? `${dayLabel(date, today)} ` : "");
const until = (due, today) => (due ? `${low(dayLabel(due, today)).replace(/^bugün$/, "bugüne").replace(/^yarın$/, "yarına").replace(/^dün$/, "düne")} kadar` : "");

// Birine görev/plan/not verildi: "Bugün 16:00'da Antrenman var (Liman)", "Yeni görevin var: Motor yağı (yarına kadar)"
// Fatura görevi: tutar da ("Yeni görevin var: Fatura öde (1.250 TL, 15 eki kadar)")
export function assignedText({ kind, title, date, time, due, place, pay, from }, today = todayIn()) {
  const t = String(title || "").trim();
  if (kind === "plan") {
    const w = when(date, time, today);
    return say(w ? `${w} ${t} var${paren(place)}` : `Yeni plan: ${t}${paren(place)}`);
  }
  if (kind === "task") return say(`Yeni görevin var: ${t}${paren([pay, until(due, today)].filter(Boolean).join(", "))}`);
  return say(`${who(from) || "Biri"} bir not paylaştı: ${t}`);
}

// Kişi (çalışan, sporcu…) yeni kayıt ekledi: ana hesaba. "Ali yeni görev ekledi: Yelken tamiri (bugüne kadar)"
const KIND_ADD = { plan: "plan", task: "görev", note: "not" };
export function addedText({ kind, title, date, time, due, place, from }, today = todayIn()) {
  const t = String(title || "").trim();
  const extra = kind === "plan" ? [when(date, time, today), place].filter(Boolean).join(", ") : kind === "task" ? until(due, today) : "";
  return say(`${who(from) || "Biri"} yeni ${KIND_ADD[kind] || "kayıt"} ekledi: ${t}${paren(extra)}`);
}

// Plan hatırlatması: "1 saat sonra Antrenman var (Liman)", "Yarın 16:00'da Antrenman var", "Bugün Antrenman var (tüm gün)"
export function reminderTextOf(plan, lead) {
  const t = String(plan.title || "Plan").trim();
  if (!plan.time) return say(`${lead >= 1440 ? "Yarın" : "Bugün"} ${t} var${paren(["tüm gün", plan.place].filter(Boolean).join(", "))}`);
  if (lead >= 1440) return say(`Yarın ${atTime(plan.time)} ${t} var${paren(plan.place)}`);
  return say(`${lead >= 60 ? `${lead / 60} saat` : `${lead} dk`} sonra ${t} var${paren(plan.place)}`);
}

const KIND_TR = { plan: "Plan", task: "Görev", note: "Not" };
// Atanan kişi işi bitirdi: "Ali yaptı: Motor yağı", "Ali okudu: Kapı şifresi"
const DONE_PAST = { plan: "gerçekleşti dedi", task: "yaptı", note: "okudu" };
export const doneText = ({ kind, title, from }) => say(`${who(from) || "Biri"} ${DONE_PAST[kind] || "tamamladı"}: ${String(title || "").trim()}`);

// Çalışan kendi kaydı için silme isteği gönderdi: "Ali silmek istiyor: Motor yağı"
export const deleteReqText = ({ title, from }) => say(`${who(from) || "Biri"} silmek istiyor: ${String(title || "").trim()}`);

// Fiş ödendi: "Fişin ödendi: Marin Yedek Parça 1.460 ₺"
export const paidText = ({ merchant, amount }) => say(`Fişin ödendi: ${[merchant || "Fiş", amount].filter(Boolean).join(" ")}`);

// Deneme
export const testText = () => say("Bildirimler açık, bu telefona gelecek");

// Kayıt değişti: "Antrenman değişti: yarın 11:00'de (İskele)", "Motor yağı değişti: yarına kadar"
export function changedText({ kind, title, date, time, due, place }, today = todayIn()) {
  const t = String(title || KIND_TR[kind] || "Kayıt").trim();
  const w = kind === "plan" ? low(when(date, time, today)) : kind === "task" ? until(due, today) : "";
  return say(`${t} değişti${w ? `: ${w}` : ""}${kind === "plan" ? paren(place) : ""}`);
}
// Kayıt silindi: "Yarın 10:00'daki Antrenman kaldırıldı"
export function deletedText({ kind, title, date, time }, today = todayIn()) {
  const t = String(title || KIND_TR[kind] || "Kayıt").trim();
  return say(`${kind === "plan" ? whenOf(date, time, today) : ""}${t} kaldırıldı`);
}
// Plan iptal edildi: "Bugün 16:00'daki Antrenman iptal edildi (rüzgâr)"
export function cancelledText({ title, date, time, reason }, today = todayIn()) {
  const t = String(title || "Plan").trim();
  return say(`${whenOf(date, time, today)}${t} iptal edildi${paren(reason)}`);
}
// Çalışan/aile fiş ekledi, ödeme bekliyor (ana hesaba): "Elif fiş ekledi, ödeme bekliyor: Marin Yedek Parça 1.460 ₺"
export const receiptNewText = ({ merchant, amount, from }) => say(`${who(from) || "Biri"} fiş ekledi, ödeme bekliyor: ${[merchant || "Fiş", amount].filter(Boolean).join(" ")}`);
