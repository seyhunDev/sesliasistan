// Banka Excel'inin yapay zekayla incelenmesi (saf fonksiyonlar, test edilir). Mailler sayfasında Excel yüklenince:
//   1) Hareketler telefonda okunur (movementsOf); İş Bankası yazımından gönderen/alıcı adı ve açıklama çıkarılır (partyOf).
//   2) Yapay zeka (/api/bank-analyze) her hareketin türünü (CATS) yazar, adı bulunamayanlarda adı ve açıklamayı tamamlar.
//      Yapay zekaya IBAN ve uzun numaralar gitmez (maskAi); yazdığı ad açıklamada geçmiyorsa alınmaz (uydurma olmasın).
//   3) Özet gösterilir (report), onaylanınca hareketler banka defterine eklenir (ledgerData.addFileMoves).
// Günlük hesap özeti mailleri bu akışa girmez; Excel'in bittiği günden sonrası maillerden gelir.
import { words } from "./dues.js";
import { payeeMoves } from "./payee.js";

export const CATS = ["Aidat", "Fatura", "Banka ücreti", "Hesaplar arası", "Kart / alışveriş", "Maaş", "Diğer gelen", "Diğer giden"];

// Yapay zekaya gidecek açıklama: IBAN ve 6 haneden uzun numaralar silinir
export const maskAi = (s) =>
  String(s || "")
    .replace(/TR\s?\d[\d\s]{20,30}\d/gi, "IBAN")
    .replace(/\d{7,}/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

// Yapay zeka olmadan tür (ulaşılamazsa ya da yanıt eksikse)
export function localCat(m) {
  const t = `${m.kind || ""} ${m.desc || ""}`;
  if (/ücret|ucret|masraf|komisyon|bsmv/i.test(t) && !m.who) return "Banka ücreti";
  if (/fatura/i.test(t)) return "Fatura";
  if (/aidat/i.test(`${m.note || ""} ${m.desc || ""}`)) return "Aidat";
  return m.amount > 0 ? "Diğer gelen" : "Diğer giden";
}

// Yapay zekaya gidecek satırlar (sıra numarası, maskeli açıklama, tutar, işlem tipi)
export const forAi = (moves) => moves.map((m, i) => ({ i, d: maskAi(m.desc), a: Math.round(m.amount * 100) / 100, t: String(m.kind || "").slice(0, 20) }));

// Ad açıklamada geçiyor mu (büyük/küçük harf ve Türkçe harf farkı sayılmaz)
const inDesc = (name, desc) => {
  const w = words(name);
  if (w.length < 1) return false;
  const d = ` ${words(desc).join(" ")} `;
  return d.includes(` ${w.join(" ")} `);
};

// Yapay zeka yanıtını hareketlere işler. Telefondaki kesin okuma (partyOf) önce gelir; yapay zeka yalnız boşları tamamlar.
export function applyAi(moves, rows = []) {
  const by = new Map((rows || []).filter((r) => Number.isInteger(r?.i)).map((r) => [r.i, r]));
  return moves.map((m, i) => {
    const r = by.get(i) || {};
    const x = { ...m };
    const who = String(r.who || "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!x.who && who && inDesc(who, m.desc)) x.who = who;
    const note = String(r.note || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!x.note && note) x.note = note;
    x.cat = CATS.includes(r.cat) ? r.cat : localCat(x);
    return x;
  });
}

const round = (n) => Math.round(n * 100) / 100;
const dayOf = (ts) => (Number.isFinite(ts) ? new Date(ts + 3 * 3600e3).toISOString().slice(0, 10) : "");

// Özet (yüklenen Excel'in incelemesi ve Hesaplar sayfasındaki kalıcı özet): dönem, gelen/giden, türlere göre,
// kim ne kadar ödedi (en çok önce; top kaç kişi), adı bulunamayan gelenler, kişisel hesabın (payee) aldığı
export function report(moves, payee = null, top = 5) {
  const days = moves.map((m) => dayOf(m.ts)).filter(Boolean).sort();
  const ins = moves.filter((m) => m.amount > 0);
  const outs = moves.filter((m) => m.amount < 0);
  const cats = new Map();
  for (const m of moves) {
    const c = m.cat || localCat(m);
    const x = cats.get(c) || { cat: c, n: 0, sum: 0 };
    x.n++;
    x.sum = round(x.sum + m.amount);
    cats.set(c, x);
  }
  const who = new Map();
  for (const m of ins) {
    if (!m.who) continue;
    const k = words(m.who).join(" ");
    const x = who.get(k) || { who: m.who, n: 0, sum: 0 };
    x.n++;
    x.sum = round(x.sum + m.amount);
    who.set(k, x);
  }
  return {
    from: days[0] || "",
    to: days.at(-1) || "",
    count: moves.length,
    inN: ins.length,
    inSum: round(ins.reduce((s, m) => s + m.amount, 0)),
    outN: outs.length,
    outSum: round(outs.reduce((s, m) => s + m.amount, 0)),
    cats: [...cats.values()].sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum)),
    top: [...who.values()].sort((a, b) => b.sum - a.sum).slice(0, top),
    payers: who.size,
    noWho: ins.filter((m) => !m.who).length,
    got: payee?.name || payee?.account ? gotOf(moves, payee) : null,
  };
}

function gotOf(moves, payee) {
  const l = payeeMoves(moves, payee);
  return { name: payee.name, n: l.length, sum: round(l.reduce((s, m) => s + m.amount, 0)) };
}

// Excel ile günlük maillerin birleştiği yer: Excel'in son günü ve sonrasının nereden geldiği
export function handoff(to, firstMailDay) {
  if (!to) return "";
  if (!firstMailDay) return "Bu tarihten sonrası günlük hesap özeti maillerinden eklenir.";
  const next = new Date(Date.parse(`${to}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
  if (firstMailDay <= next) return "Sonrası günlük maillerden geliyor; iki kaynakta da olan hareket bir kez sayılır.";
  return `Dikkat: ${firstMailDay} öncesine ait mail yok; aradaki günler için bankadan o dönemin Excel'ini de yükle.`;
}
