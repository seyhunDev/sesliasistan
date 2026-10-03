// Bildirim metinlerinin tek biçimi (profesyonel, kısa):
//   Başlık: "<Olay>: <Konu>"  — en fazla ~44 karakter, uzunsa "…" ile kısalır
//   Gövde : tek satır, en fazla 3 parça, " · " ile ayrılır (zaman · yer · kimden). Emoji ve nokta yok.
//   Mesaj ve tamamlama kişiden gelir: başlıkta kişi ("Ali Kaya · Motor yağı", "Ali Kaya tamamladı"), gövdede içerik.
//   Telefonda tek satır görünür: service worker (public/sw.js) başlık ile gövdeyi birleştirir
//   ("Yeni görev: Motor yağı · Son gün yarın · Ali verdi"). Üstteki uygulama adı işletim sisteminindir.
const TZ = "Europe/Istanbul";
const MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const head = (event, subject) => cut(subject ? `${event}: ${subject}` : event, 44);
const line = (...parts) => parts.filter(Boolean).slice(0, 3).join(" · ");

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
// Gönderen adı: kısa ise tam ad, uzunsa yalnızca ad
const who = (name) => (!name ? "" : name.length <= 18 ? name : name.split(" ")[0]);

// Birine görev/plan/not verildi
export function assignedText({ kind, title, date, time, due, place, from }, today = todayIn()) {
  const t = String(title || "").trim();
  if (kind === "plan") return { title: head("Yeni plan", t), body: line([dayLabel(date, today), time].filter(Boolean).join(" "), place, from && `${who(from)} ekledi`) };
  if (kind === "task") return { title: head("Yeni görev", t), body: line(due && `Son gün ${dayLabel(due, today).toLocaleLowerCase("tr-TR")}`, from && `${who(from)} verdi`) };
  return { title: head("Yeni not", t), body: line(from && `${who(from)} paylaştı`) };
}

// Kişi (çalışan, sporcu…) yeni kayıt ekledi: ana hesaba. "Yeni görev: Motor yağı" / "Son gün yarın · Ali Kaya ekledi"
export function addedText(info, today = todayIn()) {
  const m = assignedText({ ...info, from: "" }, today);
  return { title: m.title, body: line(m.body, info.from && `${who(info.from)} ekledi`) };
}

// Plan hatırlatması: "1 saat sonra: Antrenman" / "10:00 · Yat limanı"
export function reminderTextOf(plan, lead) {
  const t = String(plan.title || "Plan").trim();
  if (!plan.time) return { title: head(lead >= 1440 ? "Yarın" : "Bugün", t), body: line("Tüm gün", plan.place) };
  const ev = lead >= 1440 ? "Yarın" : lead >= 60 ? `${lead / 60} saat sonra` : `${lead} dk sonra`;
  return { title: head(ev, t), body: line(plan.time, plan.place) };
}

// Kayda mesaj yazıldı (mesajlaşma uygulaması gibi): başlıkta kim ve hangi kayıt, gövdede mesajın kendisi.
//   "Ali Kaya · Motor yağı" / "Yağ bitmiş, yarın alırım"   — görülmemiş birden çok mesaj: "3 mesaj · Yağ bitmiş…"
const KIND_TR = { plan: "Plan", task: "Görev", note: "Not" };
export function replyText({ kind, title, from, text, n = 1 }) {
  const t = String(title || KIND_TR[kind] || "Kayıt").trim();
  const msg = String(text || "").replace(/\s+/g, " ").trim();
  return { title: cut(`${who(from) || "Biri"} · ${t}`, 44), body: cut(n > 1 ? `${n} mesaj · ${msg}` : msg, 120) };
}
// Atanan kişi işi bitirdi: "Ali Kaya tamamladı" / "Görev · Motor yağı"
const DONE_PAST = { plan: "gerçekleşti dedi", task: "yaptı", note: "okudu" };
export const doneText = ({ kind, title, from }) => ({
  title: cut(`${who(from) || "Biri"} ${DONE_PAST[kind] || "tamamladı"}`, 44),
  body: cut(`${KIND_TR[kind] || "Kayıt"} · ${String(title || "").trim()}`, 120),
});

// Çalışan kendi kaydı için silme isteği gönderdi: "Silme isteği · Ali Kaya" / "Görev · Motor yağı"
export const deleteReqText = ({ kind, title, from }) => ({
  title: cut(`Silme isteği · ${who(from) || "Biri"}`, 44),
  body: cut(`${KIND_TR[kind] || "Kayıt"} · ${String(title || "").trim()}`, 120),
});

// Fiş ödendi
export const paidText = ({ merchant, amount }) => ({ title: head("Fiş ödendi", merchant || "Fiş"), body: line(amount, "Ödemen yapıldı") });

// Deneme
export const testText = () => ({ title: "Bildirimler açık", body: "Hatırlatmalar ve atamalar bu cihaza gelecek" });

// Kayıt değişti (zaman, yer, başlık): "Plan değişti: Antrenman" / "Yarın 11:00 · Kulüp iskelesi · Seyhun değiştirdi"
export function changedText({ kind, title, date, time, due, place, from }, today = todayIn()) {
  const t = String(title || KIND_TR[kind] || "Kayıt").trim();
  const ev = { plan: "Plan değişti", task: "Görev değişti", note: "Not değişti" }[kind] || "Kayıt değişti";
  const when = kind === "plan" ? [dayLabel(date, today), time].filter(Boolean).join(" ") : kind === "task" && due ? `Son gün ${dayLabel(due, today).toLocaleLowerCase("tr-TR")}` : "";
  return { title: head(ev, t), body: line(when, kind === "plan" ? place : "", from && `${who(from)} değiştirdi`) };
}
// Kayıt silindi / plan iptal: "Plan iptal: Antrenman" / "Yarın 10:00 · Seyhun sildi"
export function deletedText({ kind, title, date, time, from }, today = todayIn()) {
  const t = String(title || KIND_TR[kind] || "Kayıt").trim();
  const ev = { plan: "Plan iptal", task: "Görev kaldırıldı", note: "Not kaldırıldı" }[kind] || "Kayıt kaldırıldı";
  return { title: head(ev, t), body: line(kind === "plan" ? [dayLabel(date, today), time].filter(Boolean).join(" ") : "", from && `${who(from)} sildi`) };
}
// Çalışan/aile fiş ekledi, ödeme bekliyor (ana hesaba): "Ödeme bekliyor: Marin Yedek Parça" / "₺1.460 · Elif ekledi"
export const receiptNewText = ({ merchant, amount, from }) => ({ title: head("Ödeme bekliyor", merchant || "Fiş"), body: line(amount, from && `${who(from)} ekledi`) });
