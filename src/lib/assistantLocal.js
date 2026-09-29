import { addDate, weekRange } from "@/lib/ai/digest";
import { short, todayStr } from "@/lib/utils/format";

export const PAGES = {
  home: { path: "/", label: "Ana sayfa" },
  receipts: { path: "/receipts", label: "Fişler" },
  plans: { path: "/plans", label: "Planlar" },
  notes: { path: "/notes", label: "Notlar" },
  tasks: { path: "/tasks", label: "Görevler" },
};
export const KIND = { plan: "Plan", task: "Görev", note: "Not" };
const lower = (s) => s.toLocaleLowerCase("tr-TR");

// Yalnızca "görevleri aç" gibi kısa gezinme komutları yapay zekayı beklemeden anında çalışır
const VERB = /(^|\s)(aç|göster|git|gel|geç|götür|gidelim|açsana)(?=$|[\s.,!?])/;
const TIME_W = /(bugün|yarın|hafta|(^|\s)ay(\s|$)|yıl|geçen|gelecek|önümüzdeki|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)/;
const QUESTION = /(neler|ne var|kaç|hangi|var mı|nedir|ne zaman|nerede|kim)/;
const TARGETS = [
  ["receipts", /(^|\s)(fiş|fatura|harcama)/],
  ["tasks", /(^|\s)görev/],
  ["plans", /(^|\s)(plan|takvim|etkinlik)/],
  ["notes", /(^|\s)not/],
  ["home", /(ana sayfa|anasayfa|ana ekran|başa dön)/],
];
export function localNavigate(text) {
  const t = lower(text).trim();
  if (t.split(/\s+/).length > 6 || !VERB.test(t) || TIME_W.test(t) || QUESTION.test(t)) return null;
  const hit = TARGETS.find(([, re]) => re.test(t));
  return hit ? hit[0] : null;
}

// "fiş aç", "fiş yükle", "faturayı çek", "yeni fiş" gibi istekler yapay zekaya gitmeden fiş kamerasını açar.
// "fişleri aç/göster" (çoğul) sayfaya gider, soru cümleleri yapay zekaya kalır.
const RECEIPT_ADD = /(^|\s)(yükle|ekle|çek|tara|okut|gir|kaydet|oluştur|gönder)/;
const RECEIPT_OPEN = /(^|\s)(aç|açsana|açar|açalım|açın|yeni)(?=$|\s)/;
export function localReceipt(text) {
  const t = lower(text).replace(/[.,!?'’]/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.split(" ").length > 7 || QUESTION.test(t)) return false;
  if (/(^|\s)kamera/.test(t) && /(aç|başlat)/.test(t)) return true;
  const m = t.match(/(^|\s)(fiş|fatura)(\S*)/);
  if (!m) return false;
  if (RECEIPT_ADD.test(t)) return true;
  return !/^(ler|lar)/.test(m[3]) && RECEIPT_OPEN.test(t);
}

export const isYes = (s) => /^(evet|tamam|olur|onayla|onaylıyorum|sil|yap|aynen|kesinlikle|tabii|tabi)(?=$|[\s.,!?])/.test(lower(s).trim());
export const isNo = (s) => /^(hayır|hayir|vazgeç|iptal|yapma|olmasın|istemiyorum|dur)(?=$|[\s.,!?])/.test(lower(s).trim());

// Yapay zekanın önerdiği değişikliği kayda uygulanacak alanlara çevirir (takvim uyumlu alanlar dahil)
export function buildPatch(kind, p = {}, rec = {}) {
  const o = {};
  if (p.title) o.title = p.title.trim();
  if (kind === "plan") {
    if (p.date) o.date = p.date;
    if (p.endDate) o.endDate = p.endDate;
    if (p.place) o.place = p.place.trim();
    if (p.time) Object.assign(o, { time: p.time, allDay: false, durationMin: rec.durationMin || 60, timeSource: "user" });
    else if (p.allDay === true) Object.assign(o, { time: "", allDay: true, durationMin: null, timeSource: "none" });
  } else if (kind === "task") {
    if (p.date) o.due = p.date;
  } else if (p.body) o.body = p.body.trim();
  return o;
}

export function describeAction(a, rec) {
  const name = rec?.title || "kayıt";
  if (a.op === "delete") return `Sil: ${name} (${KIND[a.kind]})`;
  const p = a.patch || {};
  const parts = [];
  if (p.title) parts.push(`başlık “${p.title}”`);
  if (p.date) parts.push(`gün ${short(p.date)}`);
  if (p.endDate) parts.push(`bitiş ${short(p.endDate)}`);
  if (p.time) parts.push(`saat ${p.time}`);
  else if (p.allDay) parts.push("tüm gün");
  if (p.place) parts.push(`yer ${p.place}`);
  if (p.body) parts.push("not metni");
  return `Güncelle: ${name} → ${parts.join(", ") || "değişiklik"}`;
}

// Yapay zeka çalışmazsa basit tarih sorularını yerel veriden cevaplar
export function localQuery(text, { plans, tasks }, today = todayStr()) {
  const t = lower(text);
  let a, b, label;
  if (/bugün/.test(t)) [a, b, label] = [today, today, "bugün"];
  else if (/yarın/.test(t)) [a, b, label] = [addDate(today, 1), addDate(today, 1), "yarın"];
  else if (/(haftaya|gelecek hafta|önümüzdeki hafta)/.test(t)) {
    const w = weekRange(addDate(today, 7));
    [a, b, label] = [w.start, w.end, "gelecek hafta"];
  } else if (/bu hafta/.test(t)) {
    const w = weekRange(today);
    [a, b, label] = [w.start, w.end, "bu hafta"];
  } else if (/bu ay/.test(t)) [a, b, label] = [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`, "bu ay"];
  else return null;
  const ps = plans.filter((p) => p.date <= b && (p.endDate || p.date) >= a).sort((x, y) => `${x.date}${x.time || ""}`.localeCompare(`${y.date}${y.time || ""}`));
  const ts = tasks.filter((x) => !x.done && x.due && x.due >= a && x.due <= b);
  const message = ps.length || ts.length ? `${label} için ${ps.length} plan ve ${ts.length} açık görev var. Yapay zekaya ulaşamadığım için basit bir liste gösteriyorum.` : `${label} için kayıt görünmüyor.`;
  return { message, show: [...ps.map((p) => ({ kind: "plan", id: p.id })), ...ts.map((x) => ({ kind: "task", id: x.id }))] };
}

// Yapay zeka yanıt vermezse: cümle yeni kayıt isteğine benziyor mu? (soru değilse)
const CREATE_W = /(ekle|oluştur|kaydet|koy(?!ul)|planla|hatırlat|not (al|düş|et)|yaz(?!ıl))/;
const ASK_W = /(\?|neler|ne var|kaç|hangi|var mı|göster|nedir|ne zaman)/;
export function looksLikeCreate(text) {
  const t = text.toLocaleLowerCase("tr-TR");
  return CREATE_W.test(t) && !ASK_W.test(t);
}
