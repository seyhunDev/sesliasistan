// Hazır kalıplar (src/data/hazir-kaliplar.json): Seyhun'la birlikte GitHub'da tutulan, elle yazılmış örnek cümleler.
// Seyhun (2026-10-20): "Öğrenme vakit istiyor; hazır datalar yükleyelim, GitHub'daki dosyada tutalım, direkt kullanalım."
// Firebase'e gerek yok: dosya uygulamayla birlikte gelir (okuma maliyeti yok, internetsiz de çalışır), yeni sürümle güncellenir.
// Kullanım:
//   1. Okuma işleri (plans.today, notes.read…): cümleler hazır cümle setine eklenir; telefonda yapay zekasız cevaplanır.
//   2. Kayıt işleri ("beklenen" alanlı): söylenen cümle kalıpla aynıysa ve telefonun kural motoru beklenen sonucu
//      (tür, başlık, gün, saat) aynen çıkarıyorsa kayıt yapay zekaya gitmeden yapılır. Tutmazsa yapay zekaya gider.
//   3. Hepsi öğrenme modeline (brain) "kullanıcı" ağırlığıyla örnek olarak eklenir (yedek tahmin ve kalıp ölçümü).
// Satır biçimi: { "is": <seedPhrases.js iş adı>, "soz": "cümle" | ["cümle", …], "beklenen"?: { tur, baslik, gun?, saat? } }
//   tur: plan | task | note; gun: bugün | yarın | öbür gün | pazartesi … pazar; saat: "HH:MM"
import data from "@/data/hazir-kaliplar.json";

const MAP = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
export const foldSay = (s) =>
  String(s || "")
    .replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/[çğıöşüâîû]/g, (c) => MAP[c])
    .replace(/['’‘`´]/g, "")
    .replace(/[^\p{L}\d:]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// Satırları tek cümleye açar: [{ is, x, want }]
export function readyRows(d = data) {
  const out = [];
  for (const r of d?.kaliplar || []) {
    if (!r?.is || !r.soz) continue;
    for (const x of [].concat(r.soz)) if (String(x).trim()) out.push({ is: r.is, x: String(x).trim(), want: r.beklenen || null });
  }
  return out;
}

// Öğrenme modeline örnek: iş adı → model etiketi (model.js LABELS)
const LABEL = {
  "plan.add": "create:plan", "task.add": "create:task", "note.add": "create:note", "msg.send": "send", "task.done": "complete",
  "record.delete": "action:delete", "record.postpone": "action:update",
};
export const labelOfJob = (id) => LABEL[id] || (/^(plans|notes|tasks|day|messages|race|dues|cash|invoices|shopping|weather|birthdays|attendance)\b/.test(id) ? "query" : "");
export function readyLessons(rows = readyRows()) {
  return rows.map((r) => ({ x: r.x, l: labelOfJob(r.is), s: "user", t: 0 })).filter((e) => e.l);
}

// Hazır cümle setine eklenecek okuma cümleleri: [{ id, x }]
export const readyLearned = (rows = readyRows()) => rows.filter((r) => !r.want).map((r) => ({ id: r.is, x: r.x }));

// Beklenen gün → tarih (today "YYYY-MM-DD"); haftanın günü bugünden sonraki ilk o gün
const DAYS = ["pazar", "pazartesi", "salı", "çarşamba", "perşembe", "cuma", "cumartesi"];
export function dayOf(gun, today) {
  const d = new Date(`${today}T12:00:00`);
  const g = String(gun || "").toLocaleLowerCase("tr-TR").trim();
  const add = { bugün: 0, yarın: 1, "öbür gün": 2 }[g];
  const i = DAYS.indexOf(g);
  if (add == null && i < 0) return null;
  d.setDate(d.getDate() + (add ?? (((i - d.getDay() + 7) % 7) || 7)));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Kural motorunun sonucu beklenenle aynı mı (cmd: localCreate sonucu)
export function matchesWant(cmd, want, today) {
  const it = cmd?.type === "create" && cmd.items?.length === 1 ? cmd.items[0] : null;
  if (!it || !want || it.type !== want.tur) return false;
  if (foldSay(it.title) !== foldSay(want.baslik)) return false;
  if (want.gun && it.date !== dayOf(want.gun, today)) return false;
  if (!want.gun && it.date) return false;
  return (it.time || "") === (want.saat || "");
}

// Söylenen cümle hazır kayıt kalıbı mı: { row } ya da null
const byText = new Map();
export function readyCreateRow(text, rows = readyRows()) {
  if (!byText.size || rows !== cachedRows) {
    byText.clear();
    cachedRows = rows;
    for (const r of rows) if (r.want) byText.set(foldSay(r.x), r);
  }
  return byText.get(foldSay(text)) || null;
}
let cachedRows = null;
