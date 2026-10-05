// Banka defteri (saf fonksiyonlar, test edilir): bütün banka hareketleri tek yerde, ay ay.
//   orgs/{uid}/bank/{YYYY-MM} = { moves: { <anahtar>: hareket } }   ·   orgs/{uid}/bank/meta = { seeded, mailAt, files }
// Yüklenen banka Excel'i bir kez doldurur, günlük hesap özeti mailleri ekler; Aidatlar, Faturalar, Gelen ödemeler buradan okur.
// Aynı hareket (Excel'de de mailde de) bir kez durur: anahtar gün + tutar + açıklamanın ilk kelimeleri (looseKey); aynı gün
// aynı tutarlı aynı açıklamalı iki gerçek hareket sıra numarasıyla ayrılır (#1, #2).
import { looseKey, monthOf } from "./dues.js";

const hash = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
const cut = (s, n) => String(s ?? "").slice(0, n);

// Saklanan hareket: kısa alanlar (desc/text 300 karakter)
export const slim = (m, src) => {
  const x = { date: cut(m.date, 40), ts: Number.isFinite(m.ts) ? m.ts : null, desc: cut(m.desc, 300), amount: m.amount, currency: m.currency || "TL", account: cut(m.account, 80), accountLabel: cut(m.accountLabel, 60) };
  if (m.text) x.text = cut(m.text, 300);
  if (m.who) x.who = cut(m.who, 80);
  if (m.kind) x.kind = cut(m.kind, 60);
  if (m.balance !== null && m.balance !== undefined) x.balance = m.balance;
  if (src) x.f = src; // yüklenen dosyanın kimliği (dosya silinince onun getirdikleri silinir)
  return x;
};

// Hareketleri aylara ve anahtarlara dağıtır → { "YYYY-MM": { anahtar: hareket } }
export function ledgerAdd(movements, src = "") {
  const out = {};
  const seen = new Map();
  for (const m of movements) {
    const ym = monthOf(m);
    if (!ym || typeof m.amount !== "number") continue;
    const base = looseKey(m);
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    const key = `k${hash(base)}${hash(`${base}#`).slice(0, 3)}${n > 1 ? `_${n}` : ""}`;
    (out[ym] ||= {})[key] = slim(m, src);
  }
  return out;
}

// Excel'den gelenler mailden gelmiş hareketin yazımını değiştirmez (aidat kayıtları mailin yazımına bağlı); yalnız
// eksik ad/hücre bilgisini (who, text) tamamlar. Önceki bir Excel'den gelen hareket yeni dosyanınkiyle yenilenir
// (eski yüklemelerde ad sütunu saklanmıyordu; aynı dosya yeniden yüklenince tamamlanır).
export function onlyNew(add, existing) {
  const out = {};
  for (const [ym, moves] of Object.entries(add)) {
    const have = existing[ym] || {};
    const fresh = {};
    for (const [k, m] of Object.entries(moves)) {
      const old = have[k];
      if (!old || (old.f && (m.who || !old.who))) fresh[k] = m;
      else {
        const fill = {};
        if (m.who && !old.who) fill.who = m.who;
        if (m.text && !old.text) fill.text = m.text;
        if (Object.keys(fill).length) fresh[k] = { ...old, ...fill };
      }
    }
    if (Object.keys(fresh).length) out[ym] = fresh;
  }
  return out;
}

// Ay belgelerinden tek liste (en yeni önce); id = defter anahtarı
export function ledgerList(months) {
  return Object.values(months)
    .flatMap((doc) => Object.entries(doc?.moves || {}).map(([id, m]) => ({ ...m, id, ts: m.ts ?? 0 })))
    .sort((a, b) => b.ts - a.ts);
}

// Aralıktaki aylar ("2026-05" … "2026-10")
export function monthsBetween(fromYm, toYm) {
  const out = [];
  let [y, m] = fromYm.split("-").map(Number);
  const [y2, m2] = toYm.split("-").map(Number);
  while ((y < y2 || (y === y2 && m <= m2)) && out.length < 120) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) [y, m] = [y + 1, 1];
  }
  return out;
}
