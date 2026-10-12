// Verilen borçlar (Hesaplar › Kulüp ve Kişisel; kulübün verdiği borç kasadan düşer, cashbook.js debtMoves): kime ne kadar para verildi, kişisel mi kulüpten mi, ne kadarı geri geldi.
// Kayıt tek belgede: orgs/{orgId}/debts/book = { items: [borç] } (sayfa açılınca 1 okuma).
// Borç: { id, who, amount, date (YYYY-MM-DD), kind: "personal" | "club", note, paid: [{ id, amt, date }], at }
// Saf işlevler; asistan cümleleri de burada (testleri scripts/asistan-test/yerel/elle.mjs › "Borçlar", yönlendirme › debt).
import { matchPerson } from "@/lib/names";

export const DEBT_KINDS = { personal: "Kişisel", club: "Kulüp" };

const num = (n) => Math.round((Number(n) || 0) * 100) / 100;
const str = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
const day = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) ? s : "");
export const newId = () => Math.random().toString(36).slice(2, 10);

export function cleanDebt(d = {}) {
  return {
    id: str(d.id, 20) || newId(),
    who: str(d.who, 60),
    amount: Math.max(0, num(d.amount)),
    date: day(d.date),
    kind: d.kind === "club" ? "club" : "personal",
    note: str(d.note, 200),
    paid: (Array.isArray(d.paid) ? d.paid : [])
      .map((p) => ({ id: str(p?.id, 20) || newId(), amt: Math.max(0, num(p?.amt)), date: day(p?.date) }))
      .filter((p) => p.amt > 0)
      .slice(0, 50),
    at: str(d.at, 30),
  };
}
export const cleanBook = (items) => (Array.isArray(items) ? items : []).map(cleanDebt).filter((d) => d.who && d.amount > 0).slice(0, 500);

export const paidOf = (d) => num((d?.paid || []).reduce((t, p) => t + (Number(p.amt) || 0), 0));
export const leftOf = (d) => Math.max(0, num((Number(d?.amount) || 0) - paidOf(d)));
export const isClosed = (d) => leftOf(d) <= 0;

// Açık borçlar önce (en yeni önce), kapananlar ayrı
export function splitDebts(items = [], kind = "") {
  const list = items.filter((d) => !kind || d.kind === kind);
  const at = (d) => `${d.date || ""}${d.at || ""}`;
  const desc = (a, b) => at(b).localeCompare(at(a));
  return { open: list.filter((d) => !isClosed(d)).sort(desc), closed: list.filter(isClosed).sort(desc) };
}

// Üstteki toplam: { left, personal, club, count, people }
export function debtTotals(items = []) {
  const open = items.filter((d) => !isClosed(d));
  const sum = (k) => num(open.filter((d) => !k || d.kind === k).reduce((t, d) => t + leftOf(d), 0));
  return { left: sum(""), personal: sum("personal"), club: sum("club"), count: open.length, people: new Set(open.map((d) => d.who.toLocaleLowerCase("tr-TR"))).size };
}

// Kişi başına kalan: [{ who, left, count }] büyükten küçüğe
export function byPerson(items = []) {
  const m = new Map();
  for (const d of items) {
    if (isClosed(d)) continue;
    const k = d.who.toLocaleLowerCase("tr-TR");
    const cur = m.get(k) || { who: d.who, left: 0, count: 0 };
    cur.left = num(cur.left + leftOf(d));
    cur.count++;
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => b.left - a.left);
}

// Ödeme ekler (tutar yoksa kalanın tamamı); kalandan fazlası kalan kadar yazılır
export function payDebt(d, amt, date) {
  const left = leftOf(d);
  const a = Math.min(left, num(amt) > 0 ? num(amt) : left);
  if (!(a > 0)) return d;
  return { ...d, paid: [...(d.paid || []), { id: newId(), amt: a, date: day(date) }] };
}

export const tl = (n) => `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(num(n))} TL`;

// Bir kişinin açık borçları (ad tam ya da yalnız ilk adla eşleşir)
export function debtsOf(items = [], name) {
  const names = [...new Set(items.filter((d) => !isClosed(d)).map((d) => d.who))];
  const hit = name ? matchPerson(name, names) : "";
  return { hit, list: hit ? items.filter((d) => d.who === hit && !isClosed(d)) : [] };
}

// ---- Asistan cümleleri ----
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[.!…]+$/u, "").replace(/\s+/g, " ").trim();
const cap = (w) => (w ? w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1) : w);
const STOP = new Set(["kulüp", "kulüpten", "kulübün", "kulüpün", "borç", "borcu", "borcunu", "toplam", "bugün", "dün", "yarın", "kişisel", "ben", "bana", "benim", "kime", "kim", "ne", "nakit", "ödünç", "bir", "geçen", "hafta"]);
const clean1 = (w) => String(w || "").replace(/['’`´].*$/u, "");
// Cümledeki kişi adı: önce ekli kelime ("Ali'ye", "Ali Kaya'nın"), yoksa büyük harfli kelimeler ("Ali borcunu ödedi")
export function whoIn(raw) {
  const words = String(raw || "").replace(/[,.;:!?]/g, " ").split(/\s+/).filter(Boolean);
  const okName = (w) => /^\p{Lu}\p{Ll}+$/u.test(clean1(w)) && !STOP.has(clean1(w).toLocaleLowerCase("tr-TR"));
  const i = words.findIndex((w) => /['’]\p{L}+$/u.test(w) && !STOP.has(clean1(w).toLocaleLowerCase("tr-TR")));
  if (i >= 0) {
    const prev = i > 0 && okName(words[i - 1]) ? `${clean1(words[i - 1])} ` : "";
    const w = clean1(words[i]);
    return cap(prev + cap(w.toLocaleLowerCase("tr-TR")));
  }
  const k = words.findIndex(okName);
  if (k < 0) return "";
  let e = k;
  while (e < words.length && e < k + 3 && okName(words[e])) e++;
  return words.slice(k, e).map(clean1).join(" ");
}

function amountIn(t) {
  const m = t.replace(/(19|20)\d{2} yılı/gu, "").match(/(\d[\d.,]*)\s*(bin)?\s*(tl|lira|₺|euro|€|dolar|\$)?/u);
  if (!m) return 0;
  const n = Number(m[1].replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? num(m[2] ? n * 1000 : n) : 0;
}

const DEBT_W = /(borç|borc|ödünç|alacağ|alacak)/u;
const ASK = /\?|(^| )(kime|kimlere|kim|kimin|ne kadar|kaç|toplam|durum\p{L}*|var mı|mı|mi|mu|mü|listele|göster)( |$)/u;
// "kime ne kadar borç verdim", "Ali'nin ne kadar borcu var", "toplam alacağım ne kadar" → { who } (who boş: genel)
export function debtAsk(raw) {
  const t = low(raw);
  if (!DEBT_W.test(t) || !ASK.test(t)) return null;
  if (/(aç|sayfa\p{L}*|ekranı)( |$)/u.test(t) && !/\?|ne kadar|kime|kaç/u.test(t)) return null;
  if (/fatura|aidat|kredi kart/u.test(t)) return null;
  // "borçlarım ne kadar", "kime borcum var": benim borcum (Hesaplar › Kişisel, cashCommand)
  if (/(borcum|borçlarım|borçluyum)/u.test(t) && !/(alacağ|bana)/u.test(t)) return null;
  return { who: whoIn(raw) };
}

// Ekleme / ödeme / silme: { op: "add" | "pay" | "delete", who, amount, kind, note }
export function debtCommand(raw) {
  const t = low(raw);
  if (!DEBT_W.test(t) && !/geri (verdi|ödedi|getirdi)/u.test(t)) return null;
  if (/\?/.test(t) || /fatura|aidat|kredi kart/u.test(t)) return null;
  const who = whoIn(raw);
  const amount = amountIn(t);
  if (/(^| )(sil|kaldır)\p{L}*( |$)/u.test(t) && DEBT_W.test(t)) return { op: "delete", who, amount: 0 };
  if (/(geri (verdi|ödedi|getirdi|ödendi|aldım|geldi)|borc\p{L}* (ödedi|ödendi|kapandı|kapattı|kapat|bitti|ödendi işaretle)|ödendi (yap|işaretle)|(ödedi|ödendi|kapattı|kapandı)$)/u.test(t)) {
    if (/(borç|borc|ödünç) (verdim|verdik|verildi|verdi|ver)/u.test(t)) return null;
    return { op: "pay", who, amount };
  }
  if (/(borç|borc|ödünç)\p{L}* (para )?(verdim|verdik|verildi|verdi|ver|ekle|yaz|kaydet)|(borç|borc|ödünç)\p{L}* olarak (verdim|verdik|verildi|verdi|ekle|yaz)|borçlara (ekle|yaz)/u.test(t)) {
    const kind = /kulüp|kulüb|kulübün|kulüpün|kulüp kasası|kasadan/u.test(t) ? "club" : "personal";
    const n = t.match(/(?:not|açıklama)[: ]+(.+)$/u);
    return { op: "add", who, amount, kind, note: n ? str(n[1], 200) : "" };
  }
  return null;
}

// Soruya cevap (yerel)
export function debtAnswer(items = [], who = "") {
  if (who) {
    const { hit, list } = debtsOf(items, who);
    if (hit) {
      const given = num(list.reduce((t, d) => t + d.amount, 0));
      const left = num(list.reduce((t, d) => t + leftOf(d), 0));
      const back = num(given - left);
      return `${hit} için kalan borç ${tl(left)}${back > 0 ? ` (verilen ${tl(given)}, geri gelen ${tl(back)})` : ""}.`;
    }
    const all = items.map((d) => d.who);
    if (matchPerson(who, [...new Set(all)])) return `${matchPerson(who, [...new Set(all)])} borcunun hepsini ödedi.`;
  }
  const people = byPerson(items);
  if (!people.length) return "Açık borç yok.";
  const tot = debtTotals(items);
  const list = people.slice(0, 5).map((p) => `${p.who} ${tl(p.left)}`).join(", ");
  const more = people.length > 5 ? ` ve ${people.length - 5} kişi daha` : "";
  return `Toplam ${tl(tot.left)} alacağın var: ${list}${more}.`;
}
