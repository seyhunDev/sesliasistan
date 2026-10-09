// Kişisel hesap: banka hesap özetlerinde belli bir kişinin (varsayılan ana hesabın adı, ör. "Seyhun Yıldız") aldığı ödemeler.
// Ayrı bir hesap gibi gösterilir: tarih tarih açıklamalarıyla, bu ay ve toplam (sayfa /payments). Saf fonksiyonlar, test edilir.
// Ayar ana hesabın profilinde: users/{uid}.payee = { name, account } (account boşsa bütün hesaplar; ad boşsa o hesaba gelen her para).
import { words, monthOf } from "./dues.js";
import { whoOf } from "./mailBoard.js";

export const payeeOf = (profile) => ({ name: (profile?.payee?.name ?? profile?.name ?? "").trim(), account: profile?.payee?.account || "" });

// Açıklamada (ya da satırın diğer yazılı hücrelerinde) adın bütün kelimeleri geçiyor mu. Banka büyük harf ve Türkçe harfsiz
// yazabilir (SEYHUN YILDIZ = Seyhun Yıldız), kelimeleri bitişik de yazabilir (SEYHUNYILDIZ).
export function hasName(desc, name) {
  const want = words(name);
  if (!want.length) return true;
  const w = words(desc);
  const got = new Set(w);
  return want.every((x) => got.has(x)) || w.join("").includes(want.join(""));
}
// Hesap adı (gönderen/alıcı) varsa yalnız ona bakılır; açıklama yalnız ödemenin ne olduğunu gösterir.
export const whoIn = (m) => m.who || whoOf(m.desc);
const tlIn = (m, payee) => (!m.currency || m.currency === "TL") && (!payee.account || m.account === payee.account);

// Kişinin ALDIĞI para:
//   - izlenen hesaplardan ona GİDEN para (kulüp hesabından "maaş, huzur hakkı" gibi; alıcı adı = kişinin adı)
//   - hesap seçiliyse (kişinin kendi hesabı) o hesaba gelen para (ad yazılıysa gönderende değil, alıcı kendisi)
//   - hesap seçili değilse gönderen adı okunamamış ama açıklamasında adı geçen gelen para (eski yazımlar)
// Gönderen adı kişinin kendisi olan gelen para (kendi cebinden kulübe yatırdığı) sayılmaz.
export function received(m, payee) {
  if (typeof m.amount !== "number" || !tlIn(m, payee)) return false;
  const who = whoIn(m);
  if (m.amount < 0) return !!(payee.name && who && hasName(who, payee.name));
  if (payee.account) return !(payee.name && who && hasName(who, payee.name));
  if (!payee.name) return true;
  return !who && hasName(`${m.desc || ""} ${m.text || ""}`, payee.name);
}

// Kişinin aldığı paralar (tutar artı; ona giden para "out" işaretli), en yeni önce
export function payeeMoves(movements, payee) {
  return movements
    .filter((m) => received(m, payee))
    .map((m) => (m.amount < 0 ? { ...m, amount: -m.amount, out: true } : m))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
}
// Sayılmayan gelen paralar (en yeni önce): sayfada "bulunamadı" denince açıklamaların nasıl yazıldığı görülsün
export const otherIncoming = (movements, payee) =>
  movements.filter((m) => m.amount > 0 && tlIn(m, payee) && !received(m, payee)).sort((a, b) => (b.ts || 0) - (a.ts || 0));

const round = (n) => Math.round(n * 100) / 100;

// Hesaplar'da eklenen diğer adlar (users/{uid}.payeeNames): her biri ayrı satır, o adla ilgili bütün hareketler
export const namesOf = (profile) => {
  const seen = new Set();
  return (Array.isArray(profile?.payeeNames) ? profile.payeeNames : [])
    .map((n) => String(n || "").trim())
    .filter((n) => {
      const k = words(n).join(" ");
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
};
// Bir adla ilgili TL hareketler (gelen ve giden, tutar işaretli), en yeni önce. Ad hesap adında (gönderen/alıcı) YA DA
// açıklamada, notta, satırın diğer hücrelerinde geçebilir; ikisine de bakılır.
export function nameMoves(movements, name) {
  if (!words(name).length) return [];
  return movements
    .filter((m) => typeof m.amount === "number" && (!m.currency || m.currency === "TL") && hasName([whoIn(m), m.note, m.desc, m.text].filter(Boolean).join(" "), name))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
}
// En çok ödeyenler: bütün gelen TL paralar, gönderen adına göre (ad okunamamışsa açıklamadan), en çok toplam önce
export function topPayers(movements) {
  const map = new Map();
  for (const m of movements) {
    if (typeof m.amount !== "number" || m.amount <= 0 || (m.currency && m.currency !== "TL")) continue;
    const who = whoIn(m);
    if (!who) continue;
    const k = words(who).join(" ");
    if (!k) continue;
    const x = map.get(k) || { who, n: 0, sum: 0, last: 0 };
    x.n++;
    x.sum = round(x.sum + m.amount);
    x.last = Math.max(x.last, m.ts || 0);
    map.set(k, x);
  }
  return [...map.values()].sort((a, b) => b.sum - a.sum);
}
// Gelen ve giden toplamları ayrı (giden artı yazılır)
export const inOut = (list) => ({
  in: round(list.reduce((s, m) => s + (m.amount > 0 ? m.amount : 0), 0)),
  out: round(list.reduce((s, m) => s + (m.amount < 0 ? -m.amount : 0), 0)),
});

// Arama (Hesaplar › Son hareketler): yazılan her kelime hesap adında, açıklamada, notta ya da türde geçmeli.
// Türkçe harfsiz ve büyük/küçük harf fark etmez; kelimenin başı yeter ("ahm" → AHMET).
export function moveHas(m, q) {
  const want = String(q || "")
    .toLocaleUpperCase("tr-TR")
    .replace(/[ÇĞİIÖŞÜÂÎÛ]/g, (c) => ({ Ç: "C", Ğ: "G", İ: "I", I: "I", Ö: "O", Ş: "S", Ü: "U", Â: "A", Î: "I", Û: "U" })[c] || c)
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (!want.length) return true;
  const hay = words([whoIn(m), m.note, m.desc, m.text, m.cat, m.kind, m.accountLabel].filter(Boolean).join(" "));
  const all = hay.join("");
  return want.every((w) => hay.some((h) => h.startsWith(w)) || (w.length > 2 && all.includes(w)));
}
export const searchMoves = (list, q) => list.filter((m) => moveHas(m, q));

// Ay ay toplamlar (en yeni ay önce) ve genel toplam; işaretli listede gelen (in) ve giden (out) ayrıca
export function payeeSummary(list, ym) {
  const months = new Map();
  const blank = (k) => ({ ym: k, total: 0, count: 0, in: 0, out: 0, list: [] });
  for (const m of list) {
    const k = monthOf(m);
    if (!k) continue;
    const x = months.get(k) || blank(k);
    x.total = round(x.total + m.amount);
    if (m.amount > 0) x.in = round(x.in + m.amount);
    else x.out = round(x.out - m.amount);
    x.count++;
    x.list.push(m);
    months.set(k, x);
  }
  const byMonth = [...months.values()].sort((a, b) => b.ym.localeCompare(a.ym));
  const now = months.get(ym) || blank(ym);
  return { byMonth, month: now, total: round(list.reduce((s, m) => s + m.amount, 0)), count: list.length, ...inOut(list) };
}

// Excel'in açtığı CSV (noktalı virgül, Türkçe ondalık)
export function payeeCsv(list, name, label = "gelen ödemeler") {
  const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const amt = (n) => String(round(n)).replace(".", ",");
  const rows = list.map((m) => [m.date, whoIn(m), m.desc, amt(m.amount), m.accountLabel || ""].map(q).join(";"));
  return "﻿" + [[`${name || "Kişisel hesap"} · ${label}`].map(q).join(";"), ["Tarih", "Gönderen / hesap adı", "Açıklama", "Tutar (TL)", "Hesap"].map(q).join(";"), ...rows].join("\n");
}

// Asistan sorusu: "bu ay ne kadar ödeme aldım", "geçen ay kaç ödeme geldi", "ekimde ne kadar para aldım"
// → { ym } | null. Aidat ve fatura cümleleri buraya girmez (kendi akışları var).
const AYLAR = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
export function payeeAsk(s, today) {
  const t = String(s || "").toLocaleLowerCase("tr-TR").replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
  if (/aidat|fatura|fiş/.test(t)) return null;
  const pay = /(ödeme|para|havale|eft)\S*/.test(t);
  const got = /(aldı(m|ğım)|al(mış|dı)ğım|gel(di|en|miş)|yat(tı|ırıl)\S*|kazan\S*)/.test(t) || /ödemeler(im|imi|imde)/.test(t);
  const ask = /(ne kadar|kaç|toplam|neler|hangi)/.test(t);
  if (!pay || !got || !ask) return null;
  const [y, mo] = today.slice(0, 7).split("-").map(Number);
  let ym = today.slice(0, 7);
  if (/geçen ay|önceki ay/.test(t)) ym = new Date(Date.UTC(y, mo - 2, 15)).toISOString().slice(0, 7);
  else {
    const i = AYLAR.findIndex((a) => new RegExp(`(^|\\s)${a}`).test(t));
    if (i >= 0) ym = `${i + 1 > mo ? y - 1 : y}-${String(i + 1).padStart(2, "0")}`;
  }
  return { ym };
}

export const monthName = (ym) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
const tl = (n) => `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n)} lira`;

// Asistanın cevabı (kısa)
export function payeeAnswer(list, payee, ym, thisYm) {
  const who = payee.name ? `${payee.name} adına` : "hesaba";
  const when = ym === thisYm ? "Bu ay" : monthName(ym);
  const month = list.filter((m) => monthOf(m) === ym);
  if (!month.length) return `${when} ${who} gelen ödeme görünmüyor.`;
  const sum = round(month.reduce((s, m) => s + m.amount, 0));
  const last = month[0];
  const day = new Date((last.ts || 0) + 3 * 3600e3).toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });
  return `${when} ${who} ${month.length} ödeme geldi, toplam ${tl(sum)}. Son ödeme ${day}, ${tl(last.amount)}.`;
}
