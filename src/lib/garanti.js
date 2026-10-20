// Garanti BBVA kart harcaması mailleri → ödeme bekleyen fiş (saf fonksiyonlar + küçük çalıştırıcı; sunucu ve zamanlanmış
// görev ortak kullanır, test edilir). Gmail betiği maili orgs/{uid}/mails'e yazar (gönderen Mail ayarlarında eklenir),
// /api/mail/push ya da 5 dakikalık görev burada okur ve orgs/{uid}/receipts/g-{mail id} fişini açar:
//   - İşyeri, tutar, tarih, saat, kartın son 4 hanesi mail metninden okunur (spendOf). Okunamazsa yapay zeka çıkarır;
//     yazdığı tutar ve işyeri mailde geçmiyorsa alınmaz (uydurma olmasın).
//   - Fiş her zaman "ödeme bekliyor" açılır, kendiliğinden ödendi yapılmaz. Kişisel başlar; kartın son 4 hanesi
//     kullanıcının "kulüp kartı" saydığı kartsa (users.cardScope) Kulüp.
//   - İade, iptal, reddedilen işlem, şifre/doğrulama mailleri fiş olmaz. Aynı mail iki kez fiş olmaz (belge kimliği).
import { calcTotals, parseTL } from "./receipts.js";
import { words } from "./dues.js";
import { ruleFor } from "./bankSheet.js";

// Mail ayarlarında tek dokunuşla eklenen gönderenler (alan adı: alt alan adları da olur)
export const GARANTI_SENDERS = [
  { name: "Garanti BBVA", from: "garantibbva.com.tr" },
  { name: "Garanti BBVA", from: "garanti.com.tr" },
];
export const isGaranti = (m) => !!ruleFor(m?.from, GARANTI_SENDERS) || /garanti/i.test(String(m?.rule || ""));

const clean = (s) =>
  String(s || "")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ");
const SKIP = /iade|iptal edil|reddedil|başarısız|basarisiz|onaylanmad|gerçekleşmedi|gerceklesmedi|yetersiz bakiye|doğrulama kodu|dogrulama kodu|tek kullanımlık|ekstre|son ödeme tarihi/;
const SPEND = /harcama|alışveriş|alisveris|i[şs]lem(?:iniz)?\s+(?:yapıl|yapil|gerçekleş|gercekles|onaylan)|ödeme yapıl|odeme yapil|tahsil edil|provizyon|kartınızla|kartinizla|kartınız ile|kartiniz ile/i;
const CUR = { TL: "TL", TRY: "TL", "₺": "TL", USD: "USD", EUR: "EUR", GBP: "GBP" };

function amountOf(t) {
  const labelled = t.match(/(?:[iİ][şs]lem\s*)?tutar[ıi]?\s*[:：]?\s*(?:(TL|TRY|₺|USD|EUR|GBP)\s*)?([\d.]+,\d{1,2}|[\d.]+)\s*(TL|TRY|₺|USD|EUR|GBP)?/i);
  const after = t.match(/([\d.]+,\d{2})\s*(TL|TRY|₺|USD|EUR|GBP)\b/i) || t.match(/([\d.]+,\d{2})\s*(₺)/);
  const before = t.match(/(TL|TRY|₺|USD|EUR|GBP)\s*([\d.]+,\d{2})/i);
  let n = "";
  let c = "";
  if (labelled) [n, c] = [labelled[2], labelled[1] || labelled[3]];
  else if (after) [n, c] = [after[1], after[2]];
  else if (before) [n, c] = [before[2], before[1]];
  const k = n ? parseTL(n) : NaN;
  return Number.isFinite(k) && k > 0 ? { amount: k, currency: CUR[String(c || "TL").toUpperCase()] || CUR[c] || "TL" } : null;
}

const two = (n) => String(n).padStart(2, "0");
function dateOf(t) {
  const d = t.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if (!d || +d[2] < 1 || +d[2] > 12 || +d[1] < 1 || +d[1] > 31) return "";
  return `${d[3]}-${two(d[2])}-${two(d[1])}`;
}
const timeOf = (t) => {
  const m = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return m ? `${two(m[1])}:${m[2]}` : "";
};
function cardOf(t) {
  const m = t.match(/(\d{4})\s*(?:ile|ıle)\s*biten/i) || t.match(/son\s*(?:4|dört)\s*hane\S*\s*[:：]?\s*(\d{4})/i) || t.match(/[*xX•]{2,}[\s*xX•-]*(\d{4})\b/);
  return m ? m[1] : "";
}

const tidy = (s) =>
  clean(s)
    .replace(/^[\s:'"“”‘’,.-]+|[\s:'"“”‘’,.-]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);
function merchantOf(t) {
  const label = t.match(/(?:üye\s*|ÜYE\s*)?[iİ][şs]\s*yeri(?:\s*ad[ıi])?\s*[:：]\s*([^\n]+)/i) || t.match(/(?:satıcı|satici|firma)\s*[:：]\s*([^\n]+)/i);
  if (label) return tidy(label[1].split(/\s{2,}|\s(?:tutar|tarih|[iİ][şs]lem)\b/i)[0]);
  // Cümle: "... 14:22'de MIGROS DIKILI işyerinden 245,90 TL ..." → işyerinden önceki ad
  const sent = t.match(/([^\n.]{2,140}?)\s+(?:üye\s+)?[iİ][şs]\s*yerinde(?:n|ki)?\b/i);
  if (sent) {
    const seg = sent[1].split(/\d{1,2}:\d{2}(?:'?\s*(?:de|da|te|ta))?\s+|\btarihinde\s+|\bkartınızla\s+|\bkartinizla\s+|\bile\s+|\bsaat\s+\S+\s+/i).pop();
    const m = tidy(seg);
    if (m && !/^\d/.test(m)) return m;
  }
  const desc = t.match(/açıklama\s*[:：]\s*([^\n]+)/i);
  return desc ? tidy(desc[1]) : "";
}

// Mail metni → { spend: { merchant, amount (kuruş), currency, date, time, last4 } } | { skip } | { ai } (harcama ama okunamadı) | null
export function spendOf(mail) {
  const head = clean(`${mail?.subject || ""}\n${String(mail?.text || "").slice(0, 400)}`).toLocaleLowerCase("tr-TR");
  const t = clean(`${mail?.subject || ""}\n${mail?.text || ""}`);
  if (SKIP.test(head)) return { skip: "iade/iptal" };
  if (!SPEND.test(t.toLocaleLowerCase("tr-TR"))) return null;
  const a = amountOf(t);
  const merchant = merchantOf(t);
  if (!a || !merchant) return { ai: true };
  return { spend: { merchant, ...a, date: dateOf(t), time: timeOf(t), last4: cardOf(t) } };
}

// ---- Yapay zeka (yerel okuma yetmezse) ----
export const AI_SYSTEM = `Sen Garanti BBVA kredi/banka kartı bildirim maillerini okuyan yardımcısın. Mail bir kart harcamasını bildiriyorsa spend=true ve: merchant (işyeri adı, mailde yazıldığı gibi), amount (tutar, sayı, nokta ondalık), currency (TL, USD, EUR…), date (YYYY-MM-DD), time (SS:DD), last4 (kartın son 4 hanesi). İade, iptal, reddedilen işlem, ekstre, kampanya, şifre/doğrulama maili ise spend=false. Bilgi mailde yoksa boş bırak, uydurma.`;
export const AI_SCHEMA = {
  type: "object",
  properties: { spend: { type: "boolean" }, merchant: { type: "string" }, amount: { type: "number" }, currency: { type: "string" }, date: { type: "string" }, time: { type: "string" }, last4: { type: "string" } },
  required: ["spend"],
};
export const aiText = (mail) =>
  clean(`Konu: ${mail?.subject || ""}\n${String(mail?.text || "").slice(0, 3000)}`)
    .replace(/\b\d{12,19}\b/g, "#")
    .trim();

// Yapay zeka yanıtını denetler: tutar ve işyeri mailde geçmeli
export function fromAi(raw, mail) {
  if (!raw?.spend) return null;
  const t = clean(`${mail?.subject || ""}\n${mail?.text || ""}`);
  const k = Math.round(Number(raw.amount) * 100);
  if (!(k > 0)) return null;
  const flat = t.replace(/[.\s]/g, "");
  const tr = `${Math.floor(k / 100)},${two(k % 100)}`;
  const en = `${Math.floor(k / 100)}.${two(k % 100)}`;
  if (!flat.includes(tr) && !t.replace(/[,\s]/g, "").includes(en) && !(k % 100 === 0 && new RegExp(`\\b${Math.floor(k / 100)}\\b`).test(t.replace(/\./g, "")))) return null;
  const merchant = tidy(raw.merchant);
  const w = words(merchant);
  const all = ` ${words(t).join(" ")} `;
  if (!w.length || !all.includes(` ${w.join(" ")} `)) return null;
  const date = /^20\d{2}-\d{2}-\d{2}$/.test(raw.date || "") ? raw.date : dateOf(t);
  const time = /^\d{2}:\d{2}$/.test(raw.time || "") ? raw.time : timeOf(t);
  const last4 = /^\d{4}$/.test(raw.last4 || "") && t.includes(raw.last4) ? raw.last4 : cardOf(t);
  return { merchant, amount: k, currency: CUR[String(raw.currency || "TL").toUpperCase()] || "TL", date, time, last4 };
}

// ---- Fiş ----
const CAT_WORDS = [
  ["Market", /migros|carrefour|\bbim\b|a101|şok|\bsok\b|file market|macro|metro|market|bakkal|manav|kasap|fırın|firin|gross/i],
  ["Yakıt", /opet|shell|\bbp\b|petrol|aytemiz|total|\bpo\b|akaryakıt|akaryakit|lukoil|alpet|moil/i],
  ["Yemek", /restoran|restaurant|cafe|kafe|kahve|starbucks|burger|pizza|döner|doner|kebap|lokanta|yemek|getir|yemeksepeti|trendyol yemek|pastane/i],
  ["Ulaşım", /otopark|hgs|ogs|taksi|uber|bitaksi|thy|pegasus|ajet|otobüs|otobus|metro ist|izban|ido|feribot|turyol/i],
  ["Fatura", /turkcell|vodafone|türk telekom|turk telekom|turknet|superonline|elektrik|gediz|izsu|su idaresi|doğalgaz|dogalgaz|izmirgaz|enerjisa/i],
  ["Ekipman", /yelken|marin|marine|decathlon|denizcilik/i],
  ["Bakım", /yapı market|yapi market|koçtaş|koctas|bauhaus|nalbur|hırdavat|hirdavat|oto servis|lastik/i],
];
export const catGuess = (merchant) => CAT_WORDS.find(([, re]) => re.test(merchant || ""))?.[0] || "Diğer";

const istanbul = (iso) => new Date(Date.parse(iso || 0) + 3 * 3600e3).toISOString();
// Fiş belgesi (DataProvider.saveReceipt ile aynı alanlar; ekleyen "Garanti BBVA")
export function garantiReceipt(s, mail, uid, cards = {}, now = new Date().toISOString()) {
  const local = istanbul(mail?.at || now);
  const foreign = s.currency && s.currency !== "TL";
  const items = [{ n: s.merchant || "Kart harcaması", q: 1, u: s.amount, r: 0 }];
  return {
    merchant: s.merchant || "Kart harcaması",
    taxId: "",
    address: "",
    docType: "fis",
    docNo: "",
    date: s.date || local.slice(0, 10),
    time: s.time || local.slice(11, 16),
    items,
    totals: calcTotals(items),
    declared: null,
    declaredVat: null,
    pay: "Kart",
    cat: catGuess(s.merchant),
    note: [`Garanti${s.last4 ? ` ·${s.last4}` : ""}`, foreign ? `${(s.amount / 100).toFixed(2).replace(".", ",")} ${s.currency} (TL tutarını kontrol et)` : ""].filter(Boolean).join(" · "),
    conf: null,
    status: foreign ? "review" : "ok",
    hasImage: false,
    src: "garanti",
    scope: cards?.[s.last4] === "club" ? "club" : "personal",
    card: s.last4 || "",
    mailId: mail?.id || "",
    ownerId: uid,
    createdBy: { name: "Garanti BBVA" },
    createdAt: now,
    createdByUid: uid,
    assignees: [],
    people: [uid],
    payStatus: "pending",
  };
}

// io: { get(path), set(path, fields), ai?(mail) → ham yanıt }; list: [{ id, ...mail }]
// → { added: [{ merchant, amount, scope }], skipped } | null
export async function runGaranti(io, uid, list, cards = {}) {
  const res = { added: [], skipped: 0 };
  for (const m of list.filter((x) => x?.id && isGaranti(x))) {
    let r = spendOf(m);
    if (r?.ai && io.ai) {
      const s = fromAi(await io.ai(m).catch(() => null), m);
      r = s ? { spend: s } : null;
    }
    if (!r?.spend) {
      if (r?.skip) res.skipped++;
      continue;
    }
    const path = `orgs/${uid}/receipts/g-${m.id}`;
    if (await io.get(path).catch(() => null)) continue;
    const doc = garantiReceipt(r.spend, m, uid, cards);
    await io.set(path, doc);
    res.added.push({ merchant: doc.merchant, amount: r.spend.amount, scope: doc.scope });
  }
  return res.added.length ? res : null;
}

const tl = (k) => `${(k / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,00$/, "")} TL`;
// Bildirim: { title, body } ya da null
export function garantiText(res) {
  const a = res?.added || [];
  if (!a.length) return null;
  // "Kart harcaması fişe eklendi: Migros 250 TL", "3 kart harcaması fişe eklendi: Migros 250 TL, Shell 1.200 TL"
  const list = a.slice(0, 2).map((x) => `${x.merchant} ${tl(x.amount)}`).join(", ");
  return { title: `${a.length === 1 ? "Kart harcaması" : `${a.length} kart harcaması`} fişe eklendi: ${list}${a.length > 2 ? "…" : ""}`, body: "" };
}
