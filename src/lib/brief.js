// Hızlı bilgi isteği (Seyhun, 2026-10-14: "uzun bir cümle olsa bile içinde 'notlarımı oku', 'bugün planda neler var',
// 'yarın planda neler var', 'haftalık özet çıkar' geçiyorsa hemen çözümlememiz lazım"): cümlenin içinde nerede geçerse
// geçsin bu istekler telefonda, yapay zekasız cevaplanır. Cümlede başka iş de varsa (ör. "Ali'ye yaz") o kısım ayrıca
// kendi yoluna gider (rest).
//
// briefOf(text) → { asks: [{ what: "notes"|"plans"|"tasks"|"summary", when: "today"|"tomorrow"|"week"|"nextweek" }], rest } | null
// briefText(asks, data) → cevap metni (sesli okunur)
import { clausesOf } from "@/lib/taskPlan";
import { messageFirst } from "@/lib/steps";
import { isLogNote } from "@/lib/trainingLog";
import { addDate, weekRange } from "@/lib/ai/digest";
import { seedTop } from "@/lib/brain/seedMatch";

const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const clean = (s) => lower(s).replace(/[,!?;:…"“”()]+/g, " ").replace(/['’]/g, " ").replace(/\s+/g, " ").trim();

// Okuma/gösterme sözü (kelimenin başı) ya da liste sorusu
const SHOW = /^(oku(?:r|y|s|$)|seslendir|söyle|anlat|göster|listele|say(?:ar|sana|$)|özetle|bahset|bak)/u;
// Özet için ayrıca: "haftalık özet çıkar / ver / hazırla / yap"
const MAKE = /^(çıkar|ver(?:ir|$|sene|ebilir)|hazırla|getir|yap(?:ar|sana|$))/u;
const ASK = /^(hangi|neler|ne|kaç|nedir)$/u;
// Bu sözlerden biri varsa cümlecik bir iştir, bilgi isteği değil ("not al", "plana ekle", "planı sil")
const ACT = /^(ekle(?!d|n)|kaydet|sil|oluştur|gönder|planla(?!r)|hatırlat|yaz|ertele|iptal|tamamla|al$|alır|ata$|aç$|kapat|değiştir|taşı|arşivle|bitir)/u;
// Başka konular (hava, rüzgâr, para, yoklama, aidat…) bu yolun işi değil
const OTHER = /^(hava|rüzgar|rüzgâr|yağmur|kasa|bakiye|aidat|yoklama|kimler|gel(?:di|medi)|antrenman(?:a|ı)?$|fitness|kalori|fiş|fatura|mail|borç|yarış|sporcu|mesaj)/u;

const NOTE_W = /^not(?:lar\p{L}*|u\p{L}*|um\p{L}*)?$/u;
const PLAN_W = /^(plan|program|takvim|ajanda|gündem)/u;
const TASK_W = /^(görev|iş(?:ler|lerim)|yapılacak)/u;
const SUM_W = /^(özet|özetle)/u;

function whenOf(s) {
  if (/(^| )(haftaya|gelecek hafta|önümüzdeki hafta|haftaki)( |$)/u.test(s)) return "nextweek";
  if (/(^| )(haftalık|bu hafta|bu haftaki|hafta|haftayı)( |$)/u.test(s)) return "week";
  if (/(^| )(yarın|yarınki|yarının)( |$)/u.test(s)) return "tomorrow";
  if (/(^| )(bugün|bugünkü|bugünün|günlük|günün)( |$)/u.test(s)) return "today";
  return "";
}

// Tek cümlecik bilgi isteği mi?
export function askOf(clause) {
  const s = clean(clause);
  if (!s || messageFirst(s)) return null;
  const w = s.split(" ");
  if (w.some((x) => ACT.test(x))) return null;
  if (w.some((x) => OTHER.test(x))) return null;
  const show = w.some((x) => SHOW.test(x));
  const ask = w.some((x) => ASK.test(x)) && /(^| )(var|varmış|var mı|bekliyor)( |$)/u.test(s);
  const when = whenOf(s);
  if (w.some((x) => SUM_W.test(x)) && (show || when || w.some((x) => MAKE.test(x)))) return { what: "summary", when: when || "today" };
  if (w.some((x) => NOTE_W.test(x)) && (show || ask)) return { what: "notes", when: noteDay(s) };
  if (w.some((x) => TASK_W.test(x)) && (show || ask)) return { what: "tasks", when: when || "" };
  if (w.some((x) => PLAN_W.test(x)) && (show || ask)) return { what: "plans", when: when || "today" };
  // "bugün neler var", "yarın ne var", "bu hafta neler var" (plan sözü olmadan)
  if (when && ask && w.length <= 7) return { what: "plans", when };
  // "yarını oku", "bugünü anlat"
  if (show && /(^| )(bugünü|yarını|haftayı)( |$)/u.test(s)) return { what: "plans", when: when || (s.includes("yarını") ? "tomorrow" : s.includes("haftayı") ? "week" : "today") };
  // Hazır cümle seti (brain/seedPhrases.js): kurallar tanımadıysa setteki okuma kalıpları da yakalar
  const hit = seedTop(clause);
  const seen = hit && SEED_ASK[hit.id];
  if (seen) return { ...seen, when: seen.what === "notes" ? noteDay(s) : seen.when };
  return null;
}

// Setteki okuma işleri → bu yolun cevapları
const SEED_ASK = {
  "notes.read": { what: "notes", when: "" },
  "plans.today": { what: "plans", when: "today" },
  "plans.tomorrow": { what: "plans", when: "tomorrow" },
  "plans.week": { what: "plans", when: "week" },
  "tasks.list": { what: "tasks", when: "" },
  "day.summary": { what: "summary", when: "today" },
};

// "bugün eklediğim notlar", "dünkü notlar" → yalnız o gün eklenenler
function noteDay(s) {
  if (/(^| )(bugün|bugünkü)( |$)/u.test(s)) return "today";
  if (/(^| )(dün|dünkü)( |$)/u.test(s)) return "yesterday";
  return "";
}

export function briefOf(text) {
  const raw = String(text || "").trim();
  if (!raw || messageFirst(raw)) return null;
  const parts = clausesOf(raw);
  const list = parts.length ? parts : [raw];
  const asks = [];
  const rest = [];
  for (const p of list) {
    const a = askOf(p);
    if (a) {
      if (!asks.some((x) => x.what === a.what && x.when === a.when)) asks.push(a);
    } else rest.push(p);
  }
  if (!asks.length) return null;
  // Kalan cümlecikler: bir iş fiili taşıyorsa ayrı gider; "bana", "lütfen" gibi artıklar atılır
  const left = rest.filter((p) => clean(p).split(" ").some((x) => ACT.test(x) || /^(ara|arar|haber|söyle|sor)/u.test(x)));
  return { asks, rest: left.join(". ") };
}

// ---- Cevap metinleri ----
const DN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const dayName = (d) => DN[new Date(`${d}T12:00:00`).getDay()];
const range = (when, today) => {
  if (when === "tomorrow") return [addDate(today, 1), addDate(today, 1), "Yarın"];
  if (when === "week") return [today, weekRange(today).end, "Bu hafta"];
  if (when === "nextweek") {
    const w = weekRange(addDate(today, 7));
    return [w.start, w.end, "Gelecek hafta"];
  }
  return [today, today, "Bugün"];
};
const livePlan = (p) => p && p.date && p.status !== "cancelled" && !p.done;
const openTask = (uid) => (t) => t && !(t.done || t.doneBy?.[uid]);
const planLine = (p, multi, a) => {
  const d = multi ? `${dayName(p.date < a ? a : p.date)} ` : "";
  return `${d}${p.time ? `${p.time} ` : ""}${p.title || "Plan"}`.trim();
};
const join = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ve ${xs[xs.length - 1]}`);

function plansText(when, { plans = [], tasks = [], uid, today }) {
  const [a, b, label] = range(when, today);
  const multi = a !== b;
  const ps = plans
    .filter((p) => livePlan(p) && p.date <= b && (p.endDate || p.date) >= a)
    .sort((x, y) => `${x.date < a ? a : x.date}${x.time || "99"}`.localeCompare(`${y.date < a ? a : y.date}${y.time || "99"}`));
  const due = tasks.filter(openTask(uid)).filter((t) => t.due && t.due >= a && t.due <= b);
  const lead = label;
  const out = [];
  if (!ps.length) out.push(`${lead} plan yok.`);
  else {
    const shown = ps.slice(0, multi ? 8 : 6).map((p) => planLine(p, multi, a));
    const more = ps.length > shown.length ? ` ve ${ps.length - shown.length} plan daha` : "";
    out.push(`${lead} ${ps.length} plan var: ${join(shown)}${more}.`);
  }
  if (due.length) out.push(`${due.length === 1 ? `Bir görev var: ${due[0].title}` : `${due.length} görev var: ${join(due.slice(0, 4).map((t) => t.title))}`}.`);
  return out.join(" ");
}

// Kaydın eklendiği gün (YYYY-AA-GG, telefonun saatiyle)
function dayOf(v) {
  const ms = typeof v === "number" ? v : v?.toMillis ? v.toMillis() : v?.seconds ? v.seconds * 1000 : v ? Date.parse(v) : NaN;
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function notesText(when, { notes = [], today }) {
  let live = notes.filter((n) => n && !n.archived && !n.done && !isLogNote(n));
  if (when) {
    const day = when === "yesterday" ? addDate(today, -1) : today;
    const word = when === "yesterday" ? "Dün" : "Bugün";
    live = live.filter((n) => dayOf(n.createdAt) === day);
    if (!live.length) return `${word} eklenen not yok.`;
  }
  if (!live.length) return "Hiç notun yok.";
  const at = (x) => x.updatedAt || x.createdAt || "";
  const list = [...live].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(at(b)).localeCompare(String(at(a)))).slice(0, 5);
  const one = (n) => {
    const t = String(n.title || "").trim();
    const b = String(n.body || "").trim().split(/\n+/)[0].slice(0, 120);
    return b && b !== t ? (t ? `${t}: ${b}` : b) : t || "Başlıksız not";
  };
  const head = when ? `${when === "yesterday" ? "Dün" : "Bugün"} ${live.length} not eklendi${live.length > list.length ? `, son ${list.length} tanesi` : ""}:` : live.length === 1 ? "Bir notun var." : live.length > list.length ? `${live.length} notun var, son ${list.length} tanesi:` : `${live.length} notun var.`;
  return [head, ...list.map((n, i) => `${i + 1}. ${one(n)}.`.replace(/\.\.$/, "."))].join(" ");
}

function tasksText(when, { tasks = [], uid, today }) {
  const open = tasks.filter(openTask(uid));
  if (when) {
    const [a, b, label] = range(when, today);
    const due = open.filter((t) => t.due && t.due >= a && t.due <= b);
    return due.length ? `${label} ${due.length} görev var: ${join(due.slice(0, 6).map((t) => t.title))}.` : `${label} görev yok.`;
  }
  if (!open.length) return "Açık görevin yok.";
  const late = open.filter((t) => t.due && t.due < today);
  const order = [...open].sort((x, y) => (x.due || "9999").localeCompare(y.due || "9999"));
  return `${open.length} açık görevin var${late.length ? `, ${late.length} tanesi gecikmiş` : ""}: ${join(order.slice(0, 6).map((t) => t.title))}${open.length > 6 ? ` ve ${open.length - 6} görev daha` : ""}.`;
}

function summaryText(when, data) {
  const { tasks = [], uid, today } = data;
  const parts = [plansText(when, data)];
  const late = tasks.filter(openTask(uid)).filter((t) => t.due && t.due < today);
  if (late.length) parts.push(`${late.length} geciken görev var${late.length <= 3 ? `: ${join(late.map((t) => t.title))}` : ""}.`);
  if (when === "today") parts.push(plansText("tomorrow", { ...data, tasks: [] }));
  return parts.join(" ");
}

export function briefText(asks, data) {
  return asks
    .map((a) => (a.what === "notes" ? notesText(a.when, data) : a.what === "tasks" ? tasksText(a.when, data) : a.what === "summary" ? summaryText(a.when, data) : plansText(a.when, data)))
    .join(" ");
}

// Bekleme yazısı: "Notlar okunuyor", "Bugünün planlarına bakılıyor"
export function briefWork(asks) {
  const a = asks[0];
  if (!a) return "";
  if (a.what === "notes") return "Notlara bakılıyor";
  if (a.what === "tasks") return "Görevlere bakılıyor";
  if (a.what === "summary") return a.when === "week" || a.when === "nextweek" ? "Haftalık özet hazırlanıyor" : "Özet hazırlanıyor";
  return "Planlara bakılıyor";
}
