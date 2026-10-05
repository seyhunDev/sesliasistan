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

// Ay ay toplamlar (en yeni ay önce) ve genel toplam
export function payeeSummary(list, ym) {
  const months = new Map();
  for (const m of list) {
    const k = monthOf(m);
    if (!k) continue;
    const x = months.get(k) || { ym: k, total: 0, count: 0, list: [] };
    x.total = round(x.total + m.amount);
    x.count++;
    x.list.push(m);
    months.set(k, x);
  }
  const byMonth = [...months.values()].sort((a, b) => b.ym.localeCompare(a.ym));
  const now = months.get(ym) || { ym, total: 0, count: 0, list: [] };
  return { byMonth, month: now, total: round(list.reduce((s, m) => s + m.amount, 0)), count: list.length };
}

// Excel'in açtığı CSV (noktalı virgül, Türkçe ondalık)
export function payeeCsv(list, name) {
  const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const amt = (n) => String(round(n)).replace(".", ",");
  const rows = list.map((m) => [m.date, whoIn(m), m.desc, amt(m.amount), m.accountLabel || ""].map(q).join(";"));
  return "﻿" + [[`${name || "Kişisel hesap"} · gelen ödemeler`].map(q).join(";"), ["Tarih", "Gönderen / hesap adı", "Açıklama", "Tutar (TL)", "Hesap"].map(q).join(";"), ...rows].join("\n");
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
