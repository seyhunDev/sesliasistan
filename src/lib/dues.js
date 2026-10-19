// Aidat takibi (saf fonksiyonlar, test edilir). Ekran: /dues (DuesPage).
// Kayıt (kulüp verisi, sporcu projesine yazılmaz):
//   orgs/{orgId}/dues/settings = { fee (aylık aidat TL), fees { sporcuId: TL } (kardeş indirimi vb.), payers { sporcuId: ["AYSE YILMAZ"] },
//     start { sporcuId: "YYYY-MM" } (elle "Aidatı bu aydan başlat") }
//   orgs/{orgId}/dues/{YYYY-MM} = { paid { sporcuId: [{ amt, via "eft"|"cash", date, mov, by, at }] }, ignored [hareket anahtarı],
//     free { sporcuId: true } ("Bu ay sayılmasın") }
// Aidat başlangıcı: elle seçilen ay, yoksa sporcunun kulübe eklendiği ay (createdAt; sunucu listesinde from). Önceki aylar ve
// "sayılmasın" denen aylar ödenmemişse borç sayılmaz (state "none" / "free").
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
        // Birden çok aya dağıtılan tek nakit ödeme (grp) Hesaplar'da tek satır
        if (p.grp) {
          const g = out.find((x) => x.grp === p.grp && x.athleteId === id);
          if (g) {
            g.amount = Math.round((g.amount + amt) * 100) / 100;
            g.yms = [...g.yms, ym].sort();
            g.note = g.yms.length > 1 ? `${g.yms.map((y) => AY[Number(y.slice(5)) - 1]).join(", ")} aidatı` : g.note;
            return;
          }
        }
        const day = /^\d{4}-\d{2}-\d{2}/.test(p.date || "") ? p.date.slice(0, 10) : /^\d{4}-\d{2}-\d{2}/.test(p.at || "") ? p.at.slice(0, 10) : `${ym}-01`;
        const [y, m, d] = day.split("-");
        out.push({
          id: `cash-${ym}-${id}-${i}`,
          key: `d:${ym}:${id}:${p.at || i}`, // kasa anahtarı (cashbook.js)
          at: p.at || "",
          cash: true,
          amount: amt,
          currency: "TL",
          account: "cash",
          accountLabel: "Nakit",
          kind: "Nakit",
          cat: "Aidat",
          who: names.get(id) || "Sporcu",
          athleteId: id,
          note: `${AY[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)} aidatı`,
          desc: "Nakit aidat",
          date: `${d}.${m}.${y}`,
          ts: Date.parse(`${day}T09:00:00Z`) || 0,
          ...(p.grp ? { grp: p.grp, yms: [ym] } : {}),
        });
      });
    }
  }
  return out.map(({ grp, yms, ...m }) => m).sort((a, b) => b.ts - a.ts);
}

// Hesaplar › "+ Gelir ekle" türleri (Diğer seçilince tür elle yazılır). Aidat seçilirse ödeme aidat kaydına yazılır.
export const INCOME_CATS = ["Aidat", "Bağış", "Yetişkin eğitimi", "Kano eğitimi", "SUP eğitimi", "Amatör denizcilik eğitimi", "Diğer"];
// Elle girilen nakitler (orgs/{orgId}/incomes/{id} = { book, dir, who, amount, cat, note, date "YYYY-MM-DD", at, paid }) → hareket
// biçimi. dir "out" (nakit çıkış, gider) eksi tutar; "debt" kişisel borç (eksi). Ayrıntı: cashbook.js.
const LABEL = { club: { in: "Nakit giriş", out: "Nakit çıkış" }, personal: { in: "Kişisel gelir", out: "Kişisel gider", debt: "Borcum" } };
export function incomeMoves(docs = []) {
  return docs
    .filter((x) => Number(x?.amount) > 0)
    .map((x) => {
      const day = /^\d{4}-\d{2}-\d{2}/.test(x.date || "") ? x.date.slice(0, 10) : String(x.at || "").slice(0, 10);
      const [y, m, d] = day.split("-");
      const book = x.book === "personal" ? "personal" : "club";
      const dir = x.dir === "out" || (x.dir === "debt" && book === "personal") ? x.dir : "in";
      const amt = Number(x.amount);
      return {
        id: `inc-${x.id}`,
        key: `i:${x.id}`,
        incomeId: x.id,
        manual: true,
        cash: book === "club",
        book,
        dir,
        at: x.at || "",
        ...(x.paid ? { paid: true, paidAt: x.paidAt || "" } : {}),
        ...(x.src ? { src: x.src } : {}), // fiş/fatura nakit ödemesi: rc:<fiş> | inv:<fatura>
        ...(x.conv ? { conv: x.conv } : {}), // bankadan nakite çevrilen hareketin defter anahtarı (cashbook.js)
        amount: dir === "in" ? amt : -amt,
        currency: "TL",
        account: book === "club" ? "cash" : "personal",
        accountLabel: book === "club" ? "Nakit" : "Kişisel",
        kind: book === "club" ? "Nakit" : "Kişisel",
        cat: x.cat || "Diğer",
        who: x.who || "",
        memo: x.note || "", // yazılan not (düzenleme formu için; note gösterim metni)
        note: x.note ? `${x.cat || "Gelir"} · ${x.note}` : x.cat || "Gelir",
        desc: LABEL[book][dir],
        date: d ? `${d}.${m}.${y}` : "",
        ts: Date.parse(`${day}T09:00:00Z`) || 0,
      };
    });
}

// Kayıt zamanından ay: Firestore Timestamp, Date ya da tarih yazısı → "YYYY-MM"
export const ymOfTime = (v) => {
  const d = v?.toDate ? v.toDate() : Number.isFinite(v?.seconds) ? new Date(v.seconds * 1000) : v ? new Date(v) : null;
  return d && !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "";
};
// Sporcunun aidat başlangıç ayı: elle seçilen > sunucu listesindeki (from) > kulübe eklendiği ay
export const startOf = (a, cfg = {}) => cfg.start?.[a.id] || a.from || ymOfTime(a.createdAt) || "";
// O ay aidat sayılmıyor mu: "none" (başlangıçtan önce), "free" (sayılmasın denmiş), "" (sayılıyor)
export function offOf(a, cfg = {}, ym = "", month = {}) {
  if (month.free?.[a.id]) return "free";
  const st = ym && startOf(a, cfg);
  return st && ym < st ? "none" : "";
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
// ym verilirse başlangıçtan önceki ve "sayılmasın" denen aylar ödenmemişse state "none"/"free" olur, beklenene girmez.
export function monthRows(athletes, month = {}, cfg = {}, ym = "") {
  const rows = athletes.map((a) => {
    const list = month.paid?.[a.id] || [];
    const paid = Math.round(list.reduce((s, p) => s + (Number(p.amt) || 0), 0) * 100) / 100;
    const fee = feeOf(a, cfg);
    const off = offOf(a, cfg, ym, month);
    const state = paid <= 0 ? off || "due" : fee && paid < fee && !off ? "part" : "paid";
    return { a, list, paid, fee, state, off };
  });
  const order = { due: 0, part: 1, paid: 2, free: 3, none: 4 };
  rows.sort((x, y) => order[x.state] - order[y.state] || x.a.studentName.localeCompare(y.a.studentName, "tr"));
  const on = rows.filter((r) => !r.off || r.paid > 0);
  const sum = (k) => on.reduce((s, r) => s + r[k], 0);
  return { rows, count: on.length, paidCount: rows.filter((r) => r.state === "paid").length, paid: sum("paid"), expected: on.filter((r) => !r.off).reduce((s, r) => s + r.fee, 0), eft: rows.flatMap((r) => r.list).filter((p) => p.via === "eft").length };
}

// Bir sporcuya yazılmış EFT hareketlerinin anahtarları (aynı hareket iki kez sayılmasın)
// month.used: o ay gelip başka (eski borçlu) aya yazılan hareketlerin anahtarları
export const usedKeys = (month = {}) => new Set([...Object.values(month.paid || {}).flat().map((p) => p.mov), ...(month.used || [])].filter(Boolean));
// Yüklenen bütün ayların kullanılmış hareketleri (ödeme geldiği aydan başka aya yazılmış olabilir)
export const allUsed = (months = {}) => new Set(Object.values(months || {}).flatMap((m) => [...usedKeys(m || {})]));

const r2 = (n) => Math.round(n * 100) / 100;
// Sporcunun o ayda kalan aidatı (sayılmayan ay ve tutarsız aidat 0)
export function restOf(a, cfg = {}, months = {}, ym) {
  const fee = feeOf(a, cfg);
  const month = months[ym] || {};
  if (!fee || offOf(a, cfg, ym, month)) return 0;
  const paid = (month.paid?.[a.id] || []).reduce((s, p) => s + (Number(p.amt) || 0), 0);
  return Math.max(0, r2(fee - paid));
}
// Ödemeyi aylara dağıtır → [{ ym, amt }]. picked verilmezse en eski borçlu aydan başlar (yms en eskiden yeniye);
// her aya kalan aidatı kadar yazılır, artan son aya eklenir. Borçlu ay yoksa ya da tutar ayarlı değilse tamamı fallback ayına.
export function allocate(amount, a, cfg = {}, months = {}, yms = [], picked = null, fallback = yms.at(-1)) {
  const list = picked?.length ? [...picked].sort() : yms.filter((ym) => restOf(a, cfg, months, ym) > 0);
  let left = r2(Number(amount) || 0);
  const out = [];
  for (const ym of list) {
    if (left <= 0) break;
    const rest = restOf(a, cfg, months, ym) || (picked?.length ? feeOf(a, cfg) : 0);
    const amt = r2(Math.min(rest || left, left));
    if (amt <= 0) continue;
    out.push({ ym, amt });
    left = r2(left - amt);
  }
  if (left > 0) {
    if (out.length) out.at(-1).amt = r2(out.at(-1).amt + left);
    else out.push({ ym: picked?.[0] || fallback, amt: left });
  }
  return out;
}
// Sporcunun ödemeleri (en yeni önce): aynı ödemeden birden çok aya yazılanlar tek satır (grp ya da banka hareketi)
// → [{ key, date "YYYY-MM-DD", amt, via, desc, months [ym], parts [{ ym, at, mov }] }]
export function historyOf(a, months = {}, yms = []) {
  const map = new Map();
  for (const ym of yms) {
    (months[ym]?.paid?.[a.id] || []).forEach((p, i) => {
      const key = p.grp || p.mov || `${ym}:${p.at || i}`;
      const g = map.get(key) || { key, date: isoDay(p.date || p.at) || `${ym}-01`, amt: 0, via: p.via === "cash" ? "cash" : "eft", desc: p.desc || "", by: p.by || "", months: [], parts: [] };
      g.amt = r2(g.amt + (Number(p.amt) || 0));
      if (!g.months.includes(ym)) g.months.push(ym);
      g.parts.push({ ym, at: p.at || "", mov: p.mov || "", i });
      map.set(key, g);
    });
  }
  return [...map.values()].map((g) => ({ ...g, months: g.months.sort() })).sort((x, y) => y.date.localeCompare(x.date) || y.months.at(-1).localeCompare(x.months.at(-1)));
}
// Ödeme grubunu ay kayıtlarından siler → { ym: yeni ay kaydı }. Başka aya yazılan banka hareketinin "used" işareti de kalkar.
export function dropGroup(a, months = {}, g) {
  const out = {};
  for (const ym of Object.keys(months)) {
    const month = months[ym] || {};
    const list = month.paid?.[a.id] || [];
    const keep = list.filter((p, i) => !g.parts.some((x) => x.ym === ym && (x.at ? x.at === p.at : x.i === i) && (x.mov || "") === (p.mov || "")));
    const movs = g.parts.map((x) => x.mov).filter(Boolean);
    const used = (month.used || []).filter((k) => !movs.includes(k));
    if (keep.length === list.length && used.length === (month.used || []).length) continue;
    const paid = { ...(month.paid || {}) };
    if (keep.length) paid[a.id] = keep;
    else delete paid[a.id];
    out[ym] = { ...month, paid, used };
  }
  return out;
}

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
export function paymentsOf(movements, month = {}, athletes = [], cfg = {}, ym, months = null) {
  const byId = new Map(athletes.map((a) => [a.id, a]));
  const confirmed = new Map(); // hareket anahtarı -> [sporcu adı]
  const out = [];
  for (const [id, list] of Object.entries(month.paid || {})) {
    for (const p of list) {
      const name = byId.get(id)?.studentName || "Sporcu";
      if (p.via === "cash") out.push({ key: `c${id}${p.at}`, state: "cash", date: p.date || "", ts: Date.parse(p.at) || 0, amount: p.amt, names: [name], desc: "Nakit" });
    }
  }
  // Banka ödemesi geldiği aydan başka (eski borçlu) aya yazılmış olabilir: bütün aylara bakılır
  for (const mo of months ? Object.values(months) : [month]) {
    for (const [id, list] of Object.entries(mo?.paid || {})) {
      const name = byId.get(id)?.studentName || "Sporcu";
      for (const p of list) if (p.via !== "cash" && p.mov && !(confirmed.get(p.mov) || []).includes(name)) confirmed.set(p.mov, [...(confirmed.get(p.mov) || []), name]);
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
  const per = Object.fromEntries(yms.map((ym) => [ym, monthRows(athletes, months[ym] || {}, cfg, ym)]));
  const rows = [...athletes]
    .sort((a, b) => a.studentName.localeCompare(b.studentName, "tr"))
    .map((a) => ({ a, cells: Object.fromEntries(yms.map((ym) => [ym, per[ym].rows.find((r) => r.a.id === a.id)])) }));
  const totals = Object.fromEntries(yms.map((ym) => [ym, { paidCount: per[ym].paidCount, paid: per[ym].paid, expected: per[ym].expected, count: per[ym].count }]));
  return { rows, totals };
}

// Eşleşme bekleyen gelen paralar (aylara göre, en yeni ay önce): [{ ym, m, r }]
export function pendingOf(movements, months, athletes, cfg, yms) {
  const out = [];
  const used = allUsed(months);
  for (const ym of [...yms].reverse()) {
    const month = months[ym] || {};
    for (const m of incomingOf(movements, ym, used, month.ignored || [])) out.push({ ym, m, r: matchMovement(m, athletes, cfg) });
  }
  return out;
}

// "03.10.2026 14:22" ya da "2026-10-03…" → "2026-10-03"
const isoDay = (v) => {
  const s = String(v || "");
  const m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};

// Tek sporcunun aidat durumu (sporcu sayfası ve asistan): yms en eskiden yeniye, months { ym: ay kaydı }.
// Başlangıç ayı (startOf) öncesi ve "sayılmasın" denen aylar borç sayılmaz. Tutar ayarlı değilse borç hesaplanmaz.
// → { fee, start, now: { state paid|part|due|none|free, paid }, cells [{ ym, state, paid }], debt, dueMonths [ym], last [{ ym, amt, via, date }] }
export function athleteDues(a, cfg = {}, months = {}, yms = []) {
  const fee = feeOf(a, cfg);
  const cells = yms.map((ym) => {
    const list = months[ym]?.paid?.[a.id] || [];
    const paid = Math.round(list.reduce((s, p) => s + (Number(p.amt) || 0), 0) * 100) / 100;
    const off = offOf(a, cfg, ym, months[ym] || {});
    const state = paid <= 0 ? off || "due" : fee && paid < fee && !off ? "part" : "paid";
    return { ym, state, paid, rest: state === "due" ? fee : state === "part" ? fee - paid : 0 };
  });
  const owe = fee ? cells.filter((c) => c.state === "due" || c.state === "part") : [];
  const last = yms
    .flatMap((ym) => (months[ym]?.paid?.[a.id] || []).map((p) => ({ ym, amt: Number(p.amt) || 0, via: p.via === "cash" ? "cash" : "eft", date: isoDay(p.date || p.at) })))
    .sort((x, y) => (y.date || y.ym).localeCompare(x.date || x.ym))
    .slice(0, 3);
  return { fee, start: startOf(a, cfg), now: cells.at(-1) || { state: "due", paid: 0 }, cells, debt: Math.round(owe.reduce((s, c) => s + c.rest, 0) * 100) / 100, dueMonths: owe.map((c) => c.ym), last };
}

// Asistanın söyleyeceği kısa cümle: "Ali Kaya'nın Ekim aidatı ödendi. Borcu yok." / "… ödenmedi. Borç: 2 ay, 3.000 TL."
export function athleteDuesText(name, d) {
  const tl = (n) => `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n)} TL`;
  const ay = (ym) => AY[Number(ym.slice(5)) - 1];
  const ym = d.now.ym || "";
  const now = d.now.state === "paid" ? "ödendi" : d.now.state === "part" ? `eksik ödendi (${tl(d.now.paid)})` : d.now.state === "free" ? "sayılmıyor (muaf)" : d.now.state === "none" ? `sayılmıyor (aidatı ${ay(d.start)} ayından başlıyor)` : "henüz ödenmedi";
  const debt = !d.fee ? "Aidat tutarı ayarlı değil, borç hesaplanmadı." : d.debt ? `Son 6 ayda borç: ${d.dueMonths.length} ay, ${tl(d.debt)}.` : "Borcu yok.";
  return `${name} · ${ay(ym)} aidatı ${now}. ${debt}`;
}
