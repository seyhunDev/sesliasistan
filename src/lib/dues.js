// Aidat takibi (saf fonksiyonlar, test edilir). Ekran: /dues (DuesPage).
// Kayıt (kulüp verisi, sporcu projesine yazılmaz):
//   orgs/{orgId}/dues/settings = { fee (aylık aidat TL), fees { sporcuId: TL } (kardeş indirimi vb.), payers { sporcuId: ["AYSE YILMAZ"] } }
//   orgs/{orgId}/dues/{YYYY-MM} = { paid { sporcuId: [{ amt, via "eft"|"cash", date, mov, by, at }] }, ignored [hareket anahtarı] }
// EFT'ler İş Bankası hesap özeti maillerinden gelir (movementsOf, mailBoard.js). Gönderen çoğu zaman anne ya da baba;
// soyadı sporcuyla aynıdır. Eşleştirme: öğrenilmiş gönderen > soyadı + veli adı > soyadı + sporcu adı > yalnız soyadı.
import { parseTrDate } from "./mailBoard.js";

const TR = { Ç: "C", Ğ: "G", İ: "I", I: "I", Ö: "O", Ş: "S", Ü: "U", Â: "A", Î: "I", Û: "U" };
// "Ayşe Yılmaz-Şahin" → ["AYSE", "YILMAZ", "SAHIN"] (banka büyük harf ve Türkçe harfsiz yazabilir)
export const words = (s) =>
  String(s || "")
    .toLocaleUpperCase("tr-TR")
    .replace(/[ÇĞİIÖŞÜÂÎÛ]/g, (c) => TR[c] || c)
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 1);
const firstOf = (name) => words(name)[0] || "";
const lastOf = (name) => words(name).at(-1) || "";

// Hareketin kısa, kalıcı anahtarı (Firestore alan adı olarak güvenli)
export function movKey(m) {
  const s = [m.account || "", m.date || "", m.amount, m.desc || ""].join("|");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `m${h.toString(36)}${Math.round(Math.abs(m.amount) * 100).toString(36)}`;
}

export const monthOf = (m) => {
  const t = m.ts ?? parseTrDate(m.date);
  if (!Number.isFinite(t)) return "";
  return new Date(t + 3 * 3600e3).toISOString().slice(0, 7);
};
// O ayın gelen paraları (TL), elle "aidat değil" denenler ve zaten bir sporcuya yazılanlar hariç
export function incomingOf(movements, ym, used = new Set(), ignored = []) {
  return movements.filter((m) => m.amount > 0 && (!m.currency || m.currency === "TL") && monthOf(m) === ym && !used.has(movKey(m)) && !ignored.includes(movKey(m)));
}

// Aidatlar'da elle yazılan nakit ödemeler, banka hareketi biçiminde (Hesaplar'da gelir olarak, "Nakit" etiketiyle).
// months: { "YYYY-MM": ay kaydı }, roster: dues/settings.roster (sporcu adları). Banka defterine yazılmaz, aidat eşleştirmesine girmez.
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export function cashMoves(months = {}, roster = []) {
  const names = new Map((roster || []).map((a) => [a.id, a.studentName]));
  const out = [];
  for (const [ym, month] of Object.entries(months || {})) {
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    for (const [id, list] of Object.entries(month?.paid || {})) {
      (Array.isArray(list) ? list : []).forEach((p, i) => {
        const amt = Number(p?.amt);
        if (p?.via !== "cash" || !(amt > 0)) return;
        const day = /^\d{4}-\d{2}-\d{2}/.test(p.date || "") ? p.date.slice(0, 10) : /^\d{4}-\d{2}-\d{2}/.test(p.at || "") ? p.at.slice(0, 10) : `${ym}-01`;
        const [y, m, d] = day.split("-");
        out.push({
          id: `cash-${ym}-${id}-${i}`,
          cash: true,
          amount: amt,
          currency: "TL",
          account: "cash",
          accountLabel: "Nakit",
          kind: "Nakit",
          cat: "Aidat",
          who: names.get(id) || "Sporcu",
          note: `${AY[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)} aidatı`,
          desc: "Nakit aidat",
          date: `${d}.${m}.${y}`,
          ts: Date.parse(`${day}T09:00:00Z`) || 0,
        });
      });
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export const feeOf = (a, cfg) => Number(cfg?.fees?.[a.id]) || Number(cfg?.fee) || 0;

// Hareketi sporcularla eşleştirir → { picks: [sporcu], sure, why, list: [{ a, score, why }] }
// Kardeşler: aynı soyadlı birden çok aday ve tutar aidatların toplamına eşitse hepsi birlikte önerilir.
export function matchMovement(m, athletes, cfg = {}) {
  const src = [m.who, m.desc].filter(Boolean).join(" "); // gönderen hesabın adı (ayrı sütun varsa) + açıklama
  const t = new Set(words(src));
  const joined = ` ${words(src).join(" ")} `;
  const list = [];
  for (const a of athletes) {
    const sur = lastOf(a.studentName);
    if (!sur) continue;
    const learned = (cfg.payers?.[a.id] || []).find((p) => joined.includes(` ${p} `));
    let score = 0;
    let why = "";
    if (learned) [score, why] = [100, `daha önce ${learned} ödemişti`];
    else if (t.has(sur)) {
      const parent = [a.parentName, a.motherName, a.fatherName].map(firstOf).find((f) => f && t.has(f));
      if (parent) [score, why] = [90, "veli adı ve soyadı"];
      else if (t.has(firstOf(a.studentName))) [score, why] = [80, "sporcu adı ve soyadı"];
      else [score, why] = [40, "yalnız soyadı"];
    }
    if (score) list.push({ a, score, why });
  }
  list.sort((x, y) => y.score - x.score || x.a.studentName.localeCompare(y.a.studentName, "tr"));
  if (!list.length) return { picks: [], sure: false, why: "", list };
  const top = list[0];
  // Aynı soyadlı adaylar (kardeşler) ve tutar birlikte tutuyorsa
  const sibs = list.filter((x) => lastOf(x.a.studentName) === lastOf(top.a.studentName) && x.score >= 40);
  const sumOf = (xs) => xs.reduce((s, x) => s + feeOf(x.a, cfg), 0);
  if (sibs.length > 1 && Math.abs(sumOf(sibs) - m.amount) < 1) return { picks: sibs.map((x) => x.a), sure: top.score >= 80, why: `${sibs.length} kardeş, tutar tutuyor`, list };
  const tied = list.filter((x) => x.score === top.score);
  // Kardeşlerden yalnız birinin aidatı tutara eşitse o önerilir (onay kullanıcıda)
  const byFee = tied.length > 1 ? tied.filter((x) => Math.abs(feeOf(x.a, cfg) - m.amount) < 1) : [];
  if (byFee.length === 1) return { picks: [byFee[0].a], sure: false, why: "tutar bu kardeşin aidatı", list };
  const sure = top.score >= 80 && tied.length === 1;
  return { picks: tied.length === 1 || top.score === 100 ? [top.a] : [], sure, why: top.why, list };
}

// Onaylanınca öğrenilecek gönderen adı: açıklamada soyadından önceki kelime + soyadı ("AYSE YILMAZ")
export function payerOf(desc, a) {
  const w = words(desc);
  const sur = lastOf(a.studentName);
  const i = w.indexOf(sur);
  return i > 0 ? `${w[i - 1]} ${sur}` : "";
}

// Ay tablosu: her sporcunun ödediği, beklenen, durum (paid | part | due)
export function monthRows(athletes, month = {}, cfg = {}) {
  const rows = athletes.map((a) => {
    const list = month.paid?.[a.id] || [];
    const paid = Math.round(list.reduce((s, p) => s + (Number(p.amt) || 0), 0) * 100) / 100;
    const fee = feeOf(a, cfg);
    const state = paid <= 0 ? "due" : fee && paid < fee ? "part" : "paid";
    return { a, list, paid, fee, state };
  });
  const order = { due: 0, part: 1, paid: 2 };
  rows.sort((x, y) => order[x.state] - order[y.state] || x.a.studentName.localeCompare(y.a.studentName, "tr"));
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  return { rows, paidCount: rows.filter((r) => r.state === "paid").length, paid: sum("paid"), expected: sum("fee"), eft: rows.flatMap((r) => r.list).filter((p) => p.via === "eft").length };
}

// Bir sporcuya yazılmış EFT hareketlerinin anahtarları (aynı hareket iki kez sayılmasın)
export const usedKeys = (month = {}) => new Set(Object.values(month.paid || {}).flat().map((p) => p.mov).filter(Boolean));

// Ödemeyi sporculara böler: kardeşlere aidat oranında, tek sporcuya tamamı
export function splitAmount(amount, picks, cfg = {}) {
  if (picks.length <= 1) return picks.map((a) => [a, amount]);
  const fees = picks.map((a) => feeOf(a, cfg));
  const total = fees.reduce((a, b) => a + b, 0);
  if (!total) return picks.map((a) => [a, Math.round((amount / picks.length) * 100) / 100]);
  return picks.map((a, i) => [a, Math.round(((amount * fees[i]) / total) * 100) / 100]);
}

// Ayın ödemeleri tek listede (en yeni önce): bankadan gelen ve sporcuya yazılan ya da sporcuyla eşleşen EFT'ler + nakitler.
// state: "ok" (onaylı), "guess" (öneri, onay bekliyor), "cash" (nakit). Aidat değil denenler ve sporcuyla ilgisiz paralar girmez.
export function paymentsOf(movements, month = {}, athletes = [], cfg = {}, ym) {
  const byId = new Map(athletes.map((a) => [a.id, a]));
  const confirmed = new Map(); // hareket anahtarı -> [sporcu adı]
  const out = [];
  for (const [id, list] of Object.entries(month.paid || {})) {
    for (const p of list) {
      const name = byId.get(id)?.studentName || "Sporcu";
      if (p.via === "cash") out.push({ key: `c${id}${p.at}`, state: "cash", date: p.date || "", ts: Date.parse(p.at) || 0, amount: p.amt, names: [name], desc: "Nakit" });
      else if (p.mov) confirmed.set(p.mov, [...(confirmed.get(p.mov) || []), name]);
    }
  }
  const ignored = month.ignored || [];
  for (const m of movements) {
    if (!(m.amount > 0) || monthOf(m) !== ym) continue;
    const k = movKey(m);
    if (ignored.includes(k)) continue;
    const base = { key: k, date: m.date, ts: m.ts ?? parseTrDate(m.date) ?? 0, amount: m.amount, desc: m.desc };
    if (confirmed.has(k)) out.push({ ...base, state: "ok", names: confirmed.get(k) });
    else {
      const r = matchMovement(m, athletes, cfg);
      const names = (r.picks.length ? r.picks : r.list.slice(0, 3).map((x) => x.a)).map((a) => a.studentName);
      if (names.length) out.push({ ...base, state: "guess", names, why: r.why || "aynı soyadlı" });
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

// Elle yüklenen banka Excel'i (ör. 3 aylık hesap hareketleri) ile maillerdeki özetler aynı hareketi farklı yazabilir
// (saatli/saatsiz tarih). Gevşek anahtar: gün + tutar + açıklamanın ilk kelimeleri.
const dayOf = (d) => (String(d || "").match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/) || []).slice(1).map((x) => x.padStart(2, "0")).join(".");
export const looseKey = (m) => [dayOf(m.date), Math.round(m.amount * 100), words(m.desc).slice(0, 6).join(" ")].join("|");

// Yüklenen dosyadan saklanacak hareketler: yalnız gelen TL paralar, kısa alanlar
export function filedMoves(movements) {
  return movements
    .filter((m) => m.amount > 0 && (!m.currency || m.currency === "TL"))
    .map((m) => ({ date: m.date, ts: m.ts, desc: String(m.desc || "").slice(0, 300), text: String(m.text || "").slice(0, 300), amount: m.amount, currency: m.currency || "TL", account: m.account || "", accountLabel: m.accountLabel || "" }));
}
// Dosyanın tarih aralığı (YYYY-MM-DD): ay sorgusunda hangi dosyaların okunacağı
export function rangeOf(moves) {
  const days = moves.map((m) => m.ts).filter(Number.isFinite).map((t) => new Date(t + 3 * 3600e3).toISOString().slice(0, 10)).sort();
  return { from: days[0] || "", to: days.at(-1) || "" };
}
// Mail hareketleri önce; dosyadakilerden aynısı olanlar atlanır
export function mergeMoves(mailMoves, fileMoves) {
  const seen = new Set(mailMoves.map(looseKey));
  const out = [...mailMoves];
  for (const m of fileMoves) {
    const k = looseKey(m);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m);
  }
  return out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

// Son n ay (en eskiden yeniye): ["2026-05", …, "2026-10"]
export function lastMonths(ym, n = 6) {
  const [y, m] = ym.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 15));
    return d.toISOString().slice(0, 7);
  });
}

// Tablo: sporcu × ay. months: { ym: ay kaydı }. Her hücre { state paid|part|due, paid, fee, list }.
export function gridOf(athletes, months, cfg, yms) {
  const per = Object.fromEntries(yms.map((ym) => [ym, monthRows(athletes, months[ym] || {}, cfg)]));
  const rows = [...athletes]
    .sort((a, b) => a.studentName.localeCompare(b.studentName, "tr"))
    .map((a) => ({ a, cells: Object.fromEntries(yms.map((ym) => [ym, per[ym].rows.find((r) => r.a.id === a.id)])) }));
  const totals = Object.fromEntries(yms.map((ym) => [ym, { paidCount: per[ym].paidCount, paid: per[ym].paid, expected: per[ym].expected, count: athletes.length }]));
  return { rows, totals };
}

// Eşleşme bekleyen gelen paralar (aylara göre, en yeni ay önce): [{ ym, m, r }]
export function pendingOf(movements, months, athletes, cfg, yms) {
  const out = [];
  for (const ym of [...yms].reverse()) {
    const month = months[ym] || {};
    for (const m of incomingOf(movements, ym, usedKeys(month), month.ignored || [])) out.push({ ym, m, r: matchMovement(m, athletes, cfg) });
  }
  return out;
}
