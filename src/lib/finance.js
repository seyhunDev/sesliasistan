// Aylık gelir/gider özeti (saf fonksiyonlar, test edilir). Ekran: /finance ("Gelir gider", Hesaplar'dan açılır).
// Kaynak banka defteri (bankLedger.js): her hareket bir türe yazılır (finCat), ay ay gelen/giden/net ve türlere göre toplanır.
// Tür sırası: kendi hesapları arası (toplama girmez) › kişisel hesaba giden (kulüp hesabından Seyhun Yıldız'a; payee.js) ›
// Aidatlar sayfasında onaylanmış ya da öğrenilmiş gönderen › yapay zeka incelemesinin yazdığı tür (cat) › açıklamadan kural.
// Yalnız TL hareketler toplanır (döviz hesapları ayrı para birimi).
import { monthOf, movKey, words } from "./dues.js";
import { hasName, received, whoIn } from "./payee.js";

export const INTERNAL = "Hesaplar arası";
const IN_CATS = ["Aidat", "Diğer gelen"];
const OUT_CATS = ["Maaş", "Fatura", "Vergi / SGK", "Kart / alışveriş", "Banka ücreti", "Diğer giden"];

const round = (n) => Math.round(n * 100) / 100;
const dayOf = (m) => (Number.isFinite(m.ts) ? new Date(m.ts + 3 * 3600e3).toISOString().slice(0, 10) : String(m.date || "").slice(0, 10));
const tlOf = (m) => typeof m.amount === "number" && (!m.currency || m.currency === "TL");

// Kişisel hesaba giden paranın türü: "Seyhun Yıldız'a ödeme" yerine kısa, ek gerektirmeyen yazım
export const payeeCat = (payee) => (payee?.name ? `Ödeme: ${payee.name}` : "Maaş");

// Kendi hesapları arası aktarım: aynı gün, aynı tutar, biri gelen biri giden, farklı hesap → iki hareketin anahtarı
export function internalKeys(moves) {
  const out = new Set();
  const ins = new Map();
  for (const m of moves) {
    if (!tlOf(m) || m.amount <= 0) continue;
    const k = `${dayOf(m)}|${Math.round(m.amount * 100)}`;
    ins.set(k, [...(ins.get(k) || []), m]);
  }
  for (const m of moves) {
    if (!tlOf(m) || m.amount >= 0) continue;
    const pair = (ins.get(`${dayOf(m)}|${Math.round(-m.amount * 100)}`) || []).find((x) => x.account !== m.account && !out.has(keyOf(x)));
    if (pair) out.add(keyOf(m)).add(keyOf(pair));
  }
  return out;
}
const keyOf = (m) => m.id || movKey(m);

// Banka büyük harf ve Türkçe harfsiz yazar ("EKIM AIDATI"): karşılaştırma words() ile, kurallar Türkçe harfsiz küçük harf
const has = (re, ...s) => re.test(` ${words(s.join(" ")).join(" ").toLowerCase()} `);
const FEE = /ucret|masraf|komisyon|bsmv|kart aidat/;
const TAX = / sgk |sosyal guvenlik|vergi| gib |gelir idaresi|muhtasar|stopaj| kdv |damga/;
const BILL = /fatura|elektrik|enerji|edas|dogalgaz|izmirgaz|igdas|su idaresi|izsu|turkcell|vodafone|turk telekom|superonline|turknet|internet/;
const CARD = / pos |kart|harcama|alisveris|market|akaryakit/;
const SALARY = /maas|huzur hakki|avans| prim /;

// ctx: { payee, aidat: Set (Aidatlar'da sporcuya yazılmış hareket anahtarları, movKey), payers: [ad], internal: Set }
export function finCat(m, ctx = {}) {
  if (ctx.internal?.has(keyOf(m)) || m.cat === INTERNAL) return INTERNAL;
  if (m.amount < 0 && ctx.payee?.name && received(m, ctx.payee)) return payeeCat(ctx.payee);
  const desc = `${m.kind || ""} ${m.desc || ""} ${m.note || ""}`;
  if (m.amount > 0) {
    if (ctx.aidat?.has(movKey(m))) return "Aidat";
    const who = whoIn(m);
    if (who && (ctx.payers || []).some((p) => words(p).length && hasName(who, p))) return "Aidat";
    if (m.cat === "Aidat" || has(/aidat/, desc)) return "Aidat";
    return "Diğer gelen";
  }
  if (m.cat && OUT_CATS.includes(m.cat) && m.cat !== "Diğer giden") return m.cat;
  if (has(TAX, desc)) return "Vergi / SGK";
  if (has(FEE, desc) && !m.who) return "Banka ücreti";
  if (has(BILL, desc)) return "Fatura";
  if (has(SALARY, desc)) return "Maaş";
  if (has(CARD, desc)) return "Kart / alışveriş";
  return "Diğer giden";
}

// Hareketlere tür yazar (TL olanlar), en yeni önce
export function withCats(moves, ctx = {}) {
  const internal = ctx.internal || internalKeys(moves);
  return moves
    .filter(tlOf)
    .map((m) => ({ ...m, fin: finCat(m, { ...ctx, internal }) }))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

// Ay ay toplamlar (yms sırasıyla, eski → yeni): { ym, inSum, outSum (artı), net, cats { tür: toplam (artı) }, n }
export function monthly(list, yms) {
  const by = new Map(yms.map((ym) => [ym, { ym, inSum: 0, outSum: 0, net: 0, cats: {}, n: 0 }]));
  for (const m of list) {
    const x = by.get(monthOf(m));
    if (!x || m.fin === INTERNAL) continue;
    const a = Math.abs(m.amount);
    if (m.amount > 0) x.inSum = round(x.inSum + a);
    else x.outSum = round(x.outSum + a);
    x.cats[m.fin] = round((x.cats[m.fin] || 0) + a);
    x.n++;
  }
  for (const x of by.values()) x.net = round(x.inSum - x.outSum);
  return [...by.values()];
}

// Dönemin türleri (gelen ve giden ayrı, büyükten küçüğe): [{ cat, sum, n, out }]
export function catTotals(list) {
  const map = new Map();
  for (const m of list) {
    if (m.fin === INTERNAL) continue;
    const x = map.get(m.fin) || { cat: m.fin, sum: 0, n: 0, out: m.amount < 0 };
    x.sum = round(x.sum + Math.abs(m.amount));
    x.n++;
    map.set(m.fin, x);
  }
  const all = [...map.values()].sort((a, b) => b.sum - a.sum);
  return { ins: all.filter((x) => !x.out), outs: all.filter((x) => x.out) };
}

// Dönem toplamı
export function periodTotal(months) {
  const inSum = round(months.reduce((s, x) => s + x.inSum, 0));
  const outSum = round(months.reduce((s, x) => s + x.outSum, 0));
  return { inSum, outSum, net: round(inSum - outSum) };
}

export const monthShort = (ym) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("tr-TR", { month: "short", timeZone: "UTC" });
export const monthLong = (ym) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
const dmy = (m) => dayOf(m).split("-").reverse().join(".");

// Muhasebe Excel'i (Fişler Excel'iyle aynı düzen: başlık satırı, tutarlar TL sayı, en altta toplam):
//   "Aylık özet" (ay × gelen, giden, net ve her tür), "Hareketler" (tarihe göre), "Türler"
export function financeSheets(list, yms) {
  const months = monthly(list, yms);
  const { ins, outs } = catTotals(list.filter((m) => yms.includes(monthOf(m))));
  const cats = [...IN_CATS, ...OUT_CATS, ...[...ins, ...outs].map((x) => x.cat)].filter((c, i, a) => a.indexOf(c) === i && [...ins, ...outs].some((x) => x.cat === c));
  const t = periodTotal(months);
  const sumHead = ["Ay", "Gelen (TL)", "Giden (TL)", "Net (TL)", ...cats.map((c) => `${c} (TL)`)];
  const sumRows = months.map((x) => [monthLong(x.ym), x.inSum, x.outSum, x.net, ...cats.map((c) => x.cats[c] || 0)]);
  const sumFoot = ["Toplam", t.inSum, t.outSum, t.net, ...cats.map((c) => round(months.reduce((s, x) => s + (x.cats[c] || 0), 0)))];
  const rows = list
    .filter((m) => yms.includes(monthOf(m)))
    .sort((a, b) => (a.ts || 0) - (b.ts || 0))
    .map((m) => [dmy(m), m.accountLabel || m.account || "", whoIn(m), m.desc || "", m.fin, m.amount > 0 ? m.amount : "", m.amount < 0 ? -m.amount : ""]);
  const internal = rows.filter((r) => r[4] === INTERNAL);
  const real = rows.filter((r) => r[4] !== INTERNAL);
  return {
    "Aylık özet": [sumHead, ...sumRows, sumFoot],
    Hareketler: [
      ["Tarih", "Hesap", "Gönderen / alıcı", "Açıklama", "Tür", "Gelen (TL)", "Giden (TL)"],
      ...real,
      ...internal,
      ["Toplam", "", `${real.length} hareket`, internal.length ? `${internal.length} hesaplar arası aktarım toplama girmez` : "", "", t.inSum, t.outSum],
    ],
    Türler: [
      ["Tür", "Gelen / giden", "Hareket", "Toplam (TL)"],
      ...ins.map((x) => [x.cat, "Gelen", x.n, x.sum]),
      ...outs.map((x) => [x.cat, "Giden", x.n, x.sum]),
    ],
  };
}
export const financeName = (yms) => `gelir-gider-${yms[0]}${yms.length > 1 ? `_${yms.at(-1)}` : ""}.xlsx`;
