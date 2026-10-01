// Mailler sayfasının özeti (saf fonksiyonlar): hesap özetlerinden hesaplar, bakiyeler ve birleşik hareket listesi.
// Mailler en yeniden eskiye gelir (at azalan). Aynı hesap: para birimi + IBAN'ın son 4 hanesi + ürün.

import { accountLabel, num } from "./bankSheet.js";

// "30.09.2026 09:41" / "30.09.2026 - 11:02:47" / "30.09.2026" → ms (Türkiye saati, UTC+3); okunamazsa null
export function parseTrDate(s) {
  const m = String(s ?? "").match(/(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, d, mo, y, h = "0", mi = "0", se = "0"] = m;
  const t = Date.UTC(+y, +mo - 1, +d, +h - 3, +mi, +se);
  return Number.isFinite(t) ? t : null;
}

const keyOf = (s) => [s.currency || "", s.last4 || "", s.product || ""].join("|");

// Hesaplar: her hesabın en son özetteki bakiyesi ve bir önceki özete göre değişimi
export function accountsOf(mails = []) {
  const map = new Map();
  for (const m of mails) {
    for (const s of m.sheets || []) {
      const sum = s.sum;
      if (!sum || sum.balance === null || sum.balance === undefined) continue;
      const key = keyOf(sum);
      const a = map.get(key);
      if (!a) map.set(key, { key, name: sum.product || accountLabel(sum), label: accountLabel(sum), currency: sum.currency || "", last4: sum.last4 || "", balance: sum.balance, prev: null, at: m.at, count: sum.count || 0 });
      else if (a.prev === null) a.prev = sum.balance;
    }
  }
  const rank = (a) => (a.currency === "TL" ? 0 : 1);
  return [...map.values()].map((a) => ({ ...a, change: a.prev === null ? null : Math.round((a.balance - a.prev) * 100) / 100 })).sort((x, y) => rank(x) - rank(y));
}

// Para birimine göre toplam bakiye: [{currency, total, n}] (TL önce)
export function totalsOf(accounts = []) {
  const map = new Map();
  for (const a of accounts) {
    const t = map.get(a.currency) || { currency: a.currency, total: 0, n: 0 };
    t.total = Math.round((t.total + a.balance) * 100) / 100;
    t.n++;
    map.set(a.currency, t);
  }
  return [...map.values()].sort((x, y) => (x.currency === "TL" ? -1 : y.currency === "TL" ? 1 : x.currency.localeCompare(y.currency)));
}

// Bütün özetlerdeki hareketler tek listede, en yeni önce; aynı hareket (iki özette de geçen) bir kez
export function movementsOf(mails = []) {
  const seen = new Set();
  const out = [];
  for (const m of mails) {
    for (const s of m.sheets || []) {
      const cols = s.columns || [];
      const col = (re) => cols.findIndex((c) => re.test(c));
      const c = { date: col(/tarih|date/i), desc: col(/açıklama|aciklama|description/i), amount: col(/tutar|amount/i), bal: col(/bakiye|balance/i), type: col(/[iİ]şlem tipi/i), op: col(/^[iİ]şlem$/i), channel: col(/kanal/i) };
      if (c.amount < 0) continue;
      const sum = s.sum || {};
      for (const { v = [] } of s.rows || []) {
        const amount = num(v[c.amount]);
        if (amount === null) continue;
        const date = c.date >= 0 ? String(v[c.date] ?? "") : "";
        const desc = String((c.desc >= 0 && v[c.desc]) || (c.op >= 0 && v[c.op]) || (c.type >= 0 && v[c.type]) || "İşlem");
        const id = [keyOf(sum), date, amount, desc].join("|");
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          ts: parseTrDate(date) ?? Date.parse(m.at),
          date,
          desc,
          kind: String((c.op >= 0 && v[c.op]) || (c.channel >= 0 && v[c.channel]) || ""),
          amount,
          balance: c.bal >= 0 ? num(v[c.bal]) : null,
          currency: sum.currency || "",
          account: keyOf(sum),
          accountLabel: accountLabel(sum),
        });
      }
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

// Mailin tek satırlık önizlemesi: hesap özetiyse bakiye ve hareket, değilse metnin başı
export function previewOf(m, money) {
  const sums = (m.sheets || []).map((s) => s.sum).filter(Boolean);
  if (sums.length)
    return sums
      .map((s) => [s.balance === null || s.balance === undefined ? accountLabel(s) : `${money(s.balance)} ${s.currency}`.trim(), s.count ? `${s.count} hareket` : ""].filter(Boolean).join(", "))
      .join(" · ");
  return String(m.text || "").replace(/\s+/g, " ").trim().slice(0, 140);
}
