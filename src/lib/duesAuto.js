// Günlük İş Bankası maili gelince aidatlar kendiliğinden yazılır (saf fonksiyonlar + küçük çalıştırıcı; sunucu ve
// zamanlanmış görev ortak kullanır, test edilir). Sunucu sporcu projesini okuyamaz: Aidatlar sayfası etkin sporcuların
// yalnız eşleştirme için gereken adlarını dues/settings.roster'a yazar ({ id, studentName, parentName, motherName, fatherName }).
// Kendiliğinden yazılan: eşleşmesi emin (öğrenilmiş gönderen, soyadı + veli adı ya da sporcu adı) VE tutarı sporcunun
// (kardeşlerde toplam) aidatına eşit olan para. Gerisi Aidatlar › "eşleşmeyi bekliyor"da onaya kalır.
import { movementsOf } from "./mailBoard.js";
import { feeOf, matchMovement, monthOf, movKey, payerOf, splitAmount, usedKeys } from "./dues.js";
import { money } from "./bankSheet.js";

const TL = (n) => `${money(n).replace(/,00$/, "")} TL`;

// Etkin sporculardan eşleştirme listesi (Aidatlar sayfası yazar; boş alanlar atılır)
export const rosterOf = (athletes) =>
  athletes.map((a) => Object.fromEntries(Object.entries({ id: a.id, studentName: a.studentName, parentName: a.parentName, motherName: a.motherName, fatherName: a.fatherName }).filter(([, v]) => v)));

// movements: yeni maillerin hareketleri; months: { "YYYY-MM": ay kaydı } → { months (değişen aylar), payers | null, paid [{ names, amount, date }], open }
export function autoDues(movements, cfg = {}, months = {}, now = new Date().toISOString()) {
  const roster = cfg.roster || [];
  const out = { months: {}, payers: null, paid: [], open: 0 };
  if (!roster.length) return out;
  const payers = { ...(cfg.payers || {}) };
  for (const m of movements) {
    if (!(m.amount > 0) || (m.currency && m.currency !== "TL")) continue;
    const ym = monthOf(m);
    if (!ym) continue;
    const month = out.months[ym] || months[ym] || {};
    const k = movKey(m);
    if ((month.ignored || []).includes(k) || usedKeys(month).has(k)) continue;
    const r = matchMovement(m, roster, cfg);
    const fees = r.picks.reduce((s, a) => s + feeOf(a, cfg), 0);
    if (!r.sure || !r.picks.length || !fees || Math.abs(fees - m.amount) >= 1) {
      if (r.list.length) out.open++;
      continue;
    }
    const paid = { ...(month.paid || {}) };
    for (const [a, amt] of splitAmount(m.amount, r.picks, cfg)) paid[a.id] = [...(paid[a.id] || []), { amt, via: "eft", date: m.date, mov: k, desc: String(m.desc).slice(0, 120), by: "auto", at: now }];
    out.months[ym] = { ...month, paid };
    for (const a of r.picks) {
      const p = payerOf(m.desc, a);
      if (p && !(payers[a.id] || []).includes(p)) {
        payers[a.id] = [...(payers[a.id] || []), p].slice(-4);
        out.payers = payers;
      }
    }
    out.paid.push({ names: r.picks.map((a) => a.studentName), amount: m.amount, date: m.date });
  }
  return out;
}

// Bildirim: { title, body } ya da null (aidatla ilgili bir şey yoksa mail özeti gider)
export function duesText(res) {
  if (!res || (!res.paid.length && !res.open)) return null;
  const wait = res.open ? `${res.open} ödeme onay bekliyor` : "";
  if (!res.paid.length) return { title: `Aidat: ${wait}`, body: "Aidatlar › Eşleştir'den onayla" };
  const names = res.paid.flatMap((p) => p.names);
  const title = names.length === 1 ? `Aidat geldi: ${names[0]}` : `Aidat geldi: ${names.length} sporcu`;
  const parts = res.paid.map((p) => `${p.names.join(" ve ")} ${TL(p.amount)}`);
  const body = [...(parts.length > 3 ? [...parts.slice(0, 2), `+${parts.length - 2} ödeme`] : parts), wait].filter(Boolean).join(" · ");
  return { title, body };
}

// io: { get(path) → veri | null, set(path, alanlar) (yalnız verilen alanlar, belge yoksa oluşturur) }
export async function runAutoDues(io, uid, mails) {
  const movs = movementsOf(mails).filter((m) => m.amount > 0);
  if (!movs.length) return null;
  const cfg = await io.get(`orgs/${uid}/dues/settings`);
  if (!cfg?.roster?.length) return null;
  const yms = [...new Set(movs.map(monthOf).filter(Boolean))];
  const months = Object.fromEntries(await Promise.all(yms.map(async (ym) => [ym, (await io.get(`orgs/${uid}/dues/${ym}`)) || {}])));
  const res = autoDues(movs, cfg, months);
  for (const [ym, m] of Object.entries(res.months)) await io.set(`orgs/${uid}/dues/${ym}`, { paid: m.paid });
  if (res.payers) await io.set(`orgs/${uid}/dues/settings`, { payers: res.payers });
  return res;
}
