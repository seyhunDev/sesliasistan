// Bildirim testi (Ayarlar › Testler › Bildirim testi): sahte kayıtla gerçek bildirim metinlerini telefona gönderir.
// Deneme kayıtları yalnız kişinin kendi belgesinde durur (users/{uid}.pushTests), plan/görev listelerine, zile ve
// simgedeki sayıya karışmaz; 3 saat sonra kendiliğinden silinir. Uygulama, /api/push-tests, Netlify işlevleri
// (push-test-background, plan-reminders) birlikte kullanır; bu yüzden "@/" içe aktarması yok.
import { assignedText, receiptNewText, todayIn } from "./notifyText.js";
import { attRemindText } from "./attRemind.js";
import { morningText } from "./summary.js";
import { DEFAULT_TZ, dueReminders, localNow, reminderAt, reminderText } from "./reminders.js";

export const TEST_DELAY = 30; // sn
export const TEST_KEEP = 3 * 3600e3; // deneme kaydı 3 saat tutulur
export const REMIND_LEAD = 60; // "1 saat önce" hatırlatması

const hm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

// Deneme türleri: ad ve gerçek metin işleviyle örnek bildirim (title, body)
export const TEST_KINDS = [
  { kind: "task", label: "Yeni görev", text: (today) => assignedText({ kind: "task", title: "Deneme görevi", due: today, from: "Seyhun" }, today) },
  { kind: "plan", label: "Yeni plan", text: (today) => assignedText({ kind: "plan", title: "Deneme planı", date: today, time: "16:00", place: "Liman", from: "Seyhun" }, today) },
  { kind: "chat", label: "Mesaj", text: () => ({ title: "Ali", body: "Deneme mesajı: yarın 9'da limandayız" }) },
  { kind: "receipt", label: "Fiş ödeme bekliyor", text: () => receiptNewText({ merchant: "Deneme fişi", amount: "250 ₺", from: "Ali" }) },
  { kind: "att", label: "Yoklama alınmadı", text: (today) => attRemindText([{ title: "Antrenman", time: "16:00", date: today, cat: "Antrenman" }], today) },
  { kind: "summary", label: "Sabah özeti", text: (today) => morningText({ plans: [], tasks: [], today, name: "Seyhun" }) },
];
export const REMIND_LABEL = "Plan hatırlatması (1 saat önce)";
export const kindLabel = (k) => (k === "remind" ? REMIND_LABEL : TEST_KINDS.find((x) => x.kind === k)?.label || "Deneme");

// Telefonda görünecek tek satır (public/sw.js ile aynı birleştirme)
export function flatLine({ title, body }) {
  const flat = (x) => String(x || "").replace(/\s*\n+\s*/g, " · ").replace(/\s+/g, " ").trim();
  const h = flat(title);
  const r = flat(body);
  return h && r ? `${h}${h.includes(":") || r.includes(":") ? " · " : ": "}${r}` : h || r;
}

// Deneme olduğu her bildirimin sonunda yazar
export const mark = (m) => ({ title: m.title, body: [m.body, "Deneme"].filter(Boolean).join(" · ") });

// Örnek metin (önizleme için)
export function previewOf(kind, { now = new Date(), tz = DEFAULT_TZ } = {}) {
  const today = todayIn(tz);
  if (kind === "remind") return mark(reminderText({ id: "test", title: "Deneme planı", date: today, time: "18:00", place: "Liman" }, REMIND_LEAD, { tz, now: new Date(0) }));
  const k = TEST_KINDS.find((x) => x.kind === kind);
  return k ? mark(k.text(today)) : null;
}

// Yeni deneme kaydı. Hatırlatma denemesi: planın saati ~1 saat 1 dakika sonra; hatırlatmanın zamanı yaklaşık 30-60 sn
// sonra gelir, gerisini gerçek zamanlayıcı (5 dakikada bir) yapar.
export function newTest(kind, { now = new Date(), tz = DEFAULT_TZ, id } = {}) {
  const at = now.toISOString();
  if (kind === "remind") {
    const n = localNow(tz, now);
    const sec = now.getUTCSeconds();
    const plus = sec < 30 ? 1 : 2; // hatırlatma zamanına en az 30 sn kalsın
    const pm = n.min - Math.floor(n.min / 1440) * 1440 + REMIND_LEAD + plus;
    const date = pm >= 1440 ? new Date(Date.parse(`${n.date}T12:00:00Z`) + 864e5).toISOString().slice(0, 10) : n.date;
    const plan = { title: "Deneme planı", date, time: hm(pm), place: "Liman" };
    const due = new Date(Math.floor(now.getTime() / 60000) * 60000 + plus * 60000).toISOString();
    return { id, kind, at, due, plan, lead: REMIND_LEAD, tz };
  }
  if (!TEST_KINDS.some((x) => x.kind === kind)) return null;
  return { id, kind, at, due: new Date(now.getTime() + TEST_DELAY * 1000).toISOString(), ...previewOf(kind, { now, tz }) };
}

// Gönderilecek metin (gönderim anında). Hatırlatma: gerçek hatırlatma metni (geç kalırsa kalan süreyi yazar).
export function testText(t, now = new Date()) {
  if (t.kind === "remind") return mark(reminderText({ ...t.plan, id: `test-${t.id}` }, t.lead || REMIND_LEAD, { tz: t.tz || DEFAULT_TZ, now }));
  return { title: t.title, body: t.body };
}

// Zamanı geldi mi. Hatırlatma: gerçek zamanlayıcının kuralı (dueReminders); plan başladıysa "gone".
export function testDue(t, now = new Date()) {
  if (!t || t.sent || t.err) return false;
  if (t.kind === "remind") {
    const tz = t.tz || DEFAULT_TZ;
    if (dueReminders([{ ...t.plan, id: t.id }], { lead: t.lead || REMIND_LEAD, tz, now }).length) return true;
    const n = localNow(tz, now).min;
    return reminderAt(t.plan, 0) <= n ? "gone" : false;
  }
  return Date.parse(t.due) <= now.getTime();
}

// Bekleyenler varsa en erkeninin zamanı (zamanlayıcı yalnız bu alanı olan kişilere bakar), yoksa ""
export function pendingAt(tests = {}, skip) {
  const due = Object.entries(tests)
    .filter(([id, t]) => id !== skip && t && !t.sent && !t.err)
    .map(([, t]) => t.due)
    .sort();
  return due[0] || "";
}

// 3 saatten eski deneme kayıtları
export const oldTests = (tests = {}, now = Date.now()) => Object.keys(tests).filter((id) => !(now - Date.parse(tests[id]?.at || 0) < TEST_KEEP));
