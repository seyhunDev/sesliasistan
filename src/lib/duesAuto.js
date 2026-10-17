// Günlük İş Bankası maili gelince aidatlar kendiliğinden yazılır (saf fonksiyonlar + küçük çalıştırıcı; sunucu ve
// zamanlanmış görev ortak kullanır, test edilir). Sunucu sporcu projesini okuyamaz: Aidatlar sayfası etkin sporcuların
// yalnız eşleştirme için gereken adlarını dues/settings.roster'a yazar ({ id, studentName, parentName, motherName, fatherName }).
// Kendiliğinden yazılan: eşleşmesi emin (öğrenilmiş gönderen, soyadı + veli adı ya da sporcu adı) VE tutarı sporcunun
// (kardeşlerde toplam) aidatına eşit olan para. Gerisi Aidatlar › "eşleşmeyi bekliyor"da onaya kalır.
// Para geldiği aya değil, sporcunun en eski borçlu ayına yazılır (son 12 ay); geldiği ayda used işareti kalır.
import { movementsOf } from "./mailBoard.js";
import { allocate, allUsed, feeOf, lastMonths, matchMovement, startOf, monthOf, movKey, payerOf, splitAmount } from "./dues.js";
import { money } from "./bankSheet.js";

const TL = (n) => `${money(n).replace(/,00$/, "")} TL`;

// Etkin sporculardan eşleştirme listesi (Aidatlar sayfası yazar; boş alanlar atılır)
// from: aidat başlangıç ayı (sunucu hatırlatmasında önceki aylar sayılmasın)
export const rosterOf = (athletes, cfg = {}) =>
  athletes.map((a) =>
    Object.fromEntries(Object.entries({ id: a.id, studentName: a.studentName, parentName: a.parentName, motherName: a.motherName, fatherName: a.fatherName, from: startOf(a, cfg) }).filter(([, v]) => v)),
  );

// movements: yeni maillerin hareketleri; months: { "YYYY-MM": ay kaydı } → { months (değişen aylar), payers | null, paid [{ names, amount, date }], open }
export function autoDues(movements, cfg = {}, months = {}, now = new Date().toISOString()) {
  const roster = cfg.roster || [];
  const out = { months: {}, payers: null, paid: [], open: 0 };
  if (!roster.length) return out;
  const payers = { ...(cfg.payers || {}) };
  const all = () => ({ ...months, ...out.months });
  for (const m of movements) {
    if (!(m.amount > 0) || (m.currency && m.currency !== "TL")) continue;
    const ym = monthOf(m);
    if (!ym) continue;
    const month = out.months[ym] || months[ym] || {};
    const k = movKey(m);
    if ((month.ignored || []).includes(k) || allUsed(all()).has(k)) continue;
    const r = matchMovement(m, roster, cfg);
    const fees = r.picks.reduce((s, a) => s + feeOf(a, cfg), 0);
    if (!r.sure || !r.picks.length || !fees || Math.abs(fees - m.amount) >= 1) {
      if (r.list.length) out.open++;
      continue;
    }
    // Her sporcunun payı en eski borçlu aya (geldiği aya kadar son 12 ay) yazılır
    const yms = lastMonths(ym, 12);
    for (const [a, amt] of splitAmount(m.amount, r.picks, cfg)) {
      for (const part of allocate(amt, a, cfg, all(), yms, null, ym)) {
        const mo = out.months[part.ym] || months[part.ym] || {};
        const paid = { ...(mo.paid || {}) };
        paid[a.id] = [...(paid[a.id] || []), { amt: part.amt, via: "eft", date: m.date, mov: k, desc: String(m.desc).slice(0, 120), by: "auto", at: now }];
        out.months[part.ym] = { ...mo, paid };
      }
    }
    // Geldiği aya yazılmadıysa orada "kullanıldı" işareti (yeniden eşleştirilmesin)
    const arr = out.months[ym] || months[ym] || {};
    if (!(arr.paid && Object.values(arr.paid).flat().some((p) => p.mov === k))) out.months[ym] = { ...arr, used: [...new Set([...(arr.used || []), k])] };
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
  // Geldiği aylar ve öncesindeki 11 ay (ödeme en eski borçlu aya yazılır)
  const yms = [...new Set(movs.map(monthOf).filter(Boolean).flatMap((ym) => lastMonths(ym, 12)))];
  const months = Object.fromEntries(await Promise.all(yms.map(async (ym) => [ym, (await io.get(`orgs/${uid}/dues/${ym}`)) || {}])));
  const res = autoDues(movs, cfg, months);
  for (const [ym, m] of Object.entries(res.months)) await io.set(`orgs/${uid}/dues/${ym}`, m.used?.length ? { paid: m.paid || {}, used: m.used } : { paid: m.paid || {} });
  if (res.payers) await io.set(`orgs/${uid}/dues/settings`, { payers: res.payers });
  return res;
}
