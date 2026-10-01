// Banka hesap özeti (Excel) ve mail özetleri: saf fonksiyonlar (sunucu, zamanlanmış görev ve sayfa ortak kullanır).
// Excel satırları dizi dizisi olarak gelir (SheetJS sheet_to_json header:1). Tablo "Tarih" geçen başlık satırından başlar;
// üstündeki "Etiket:" hücreleri (IBAN, Mevcut Bakiye…) bilgi olarak alınır. İş Bankası "Hesap Özeti" biçimine göre denendi.

const empty = (v) => v === "" || v === null || v === undefined;
const str = (v) => (empty(v) ? "" : String(v).trim());
const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}${d.getHours() || d.getMinutes() ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : ""}`;

// Kimlik bilgileri saklanmaz (hesap özetinde yazsa da)
const SECRET = /tckn|vkn|ykn|kimlik|müşteri|musteri/i;
const MONEY = /tutar|bakiye|borç|borc|alacak|amount|balance/i;

// "1.234,56 EUR" / "-12,00" / "1,234.56" / 12.5 → sayı (okunamazsa null)
export function num(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = str(v).replace(/[^\d,.\-+]/g, "");
  if (!/\d/.test(s)) return null;
  const c = s.lastIndexOf(",");
  const d = s.lastIndexOf(".");
  if (c > d) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export const money = (n) => (n === null || n === undefined ? "" : new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n));
const currencyOf = (s) => (str(s).match(/\b(TL|TRY|EUR|USD|GBP|CHF|XAU|ALTIN)\b/i)?.[1] || "").toUpperCase().replace("TRY", "TL");

export function parseStatement(input, maxRows = 500) {
  const rows = (input || []).map((r) => (r || []).map((v) => (v instanceof Date ? fmtDate(v) : typeof v === "string" ? v.trim() : v)));
  const filled = (r) => r.filter((v) => !empty(v));
  // Tablo başlığı: en az 3 dolu hücre, "Tarih" geçen bir sütun, "Etiket:" hücresi yok
  const hi = rows.findIndex((r) => filled(r).length >= 3 && r.some((v) => /tarih|date/i.test(str(v))) && !r.some((v) => str(v).endsWith(":")));

  // Bilgi alanları: "Etiket:" ve sağındaki ilk dolu hücre
  const meta = {};
  for (const r of hi < 0 ? rows : rows.slice(0, hi)) {
    r.forEach((v, i) => {
      const k = str(v);
      if (!k.endsWith(":") || k.length > 40) return;
      const val = r.slice(i + 1).find((x) => !empty(x));
      const key = k.slice(0, -1).trim();
      if (!empty(val) && !str(val).endsWith(":") && !SECRET.test(key)) meta[key] = str(val);
    });
  }

  const columns = [];
  const idx = [];
  if (hi >= 0) rows[hi].forEach((v, i) => !empty(v) && (columns.push(str(v)), idx.push(i)));
  const money_ = columns.map((c) => MONEY.test(c));
  const data = [];
  for (const r of hi < 0 ? [] : rows.slice(hi + 1)) {
    const f = filled(r);
    if (!f.length) continue;
    // Alt bilgi: "(*) Çekilen tutar…", yasal metin (tek uzun hücre)
    if (/^\(/.test(str(f[0])) || (f.length === 1 && str(f[0]).length > 40)) break;
    data.push(idx.map((i, k) => (money_[k] ? num(r[i]) ?? str(r[i]) : str(r[i]))));
    if (data.length >= maxRows) break;
  }

  // Özet: bakiye, para birimi, hareket sayısı, giren/çıkan
  const bKey = Object.keys(meta).find((k) => /bakiye/i.test(k));
  const amountCol = columns.findIndex((c) => /tutar|amount/i.test(c));
  const balanceCol = columns.findIndex((c) => /bakiye|balance/i.test(c));
  let balance = bKey ? num(meta[bKey]) : null;
  if (balance === null && balanceCol >= 0 && data.length) balance = num(data[data.length - 1][balanceCol]);
  const amounts = amountCol >= 0 ? data.map((r) => num(r[amountCol])).filter((n) => n !== null) : [];
  const product = Object.entries(meta).find(([k]) => /ürün|urun|hesap türü|döviz/i.test(k))?.[1] || "";
  const iban = Object.entries(meta).find(([k]) => /iban/i.test(k))?.[1] || "";
  const sum = {
    balance,
    currency: currencyOf(bKey ? meta[bKey] : "") || currencyOf(product),
    count: data.length,
    inSum: amounts.filter((n) => n > 0).reduce((a, b) => a + b, 0),
    outSum: amounts.filter((n) => n < 0).reduce((a, b) => a + b, 0),
    product,
    last4: iban.replace(/\s/g, "").slice(-4),
  };
  return { meta, columns, rows: data, sum };
}

// Gönderen kurala uyuyor mu: tam adres ya da alan adı (isbank.com.tr → …@ileti.isbank.com.tr da olur)
export const emailOf = (from) => (str(from).match(/<([^>]+)>/)?.[1] || str(from)).toLowerCase();
export function ruleFor(from, rules = []) {
  const e = emailOf(from);
  const dom = e.split("@")[1] || "";
  return (
    rules.find((r) => {
      const f = str(r.from).toLowerCase().replace(/^@/, "");
      if (!f) return false;
      return f.includes("@") ? e === f : dom === f || dom.endsWith(`.${f}`);
    }) || null
  );
}

// Hesabın kısa adı: "EUR hesap ·6754"
export const accountLabel = (s) => [s?.currency ? `${s.currency} hesap` : "Hesap", s?.last4 && `·${s.last4}`].filter(Boolean).join(" ");

// Toplu bildirim: aynı anda gelen mailler tek bildirimde. Başlık ≤44, gövde en çok 3 parça.
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
export function mailDigestText(mails) {
  const list = [...mails].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const senders = [...new Set(list.map((m) => m.rule || m.fromName || "Mail"))];
  const sheets = list.flatMap((m) => (m.sheets || []).filter((s) => s.sum));
  const who = senders.length === 1 ? senders[0] : "Mailler";
  if (sheets.length && sheets.length >= list.length) {
    const parts = sheets.map((s) => {
      const b = s.sum.balance === null ? "" : `${money(s.sum.balance)} ${s.sum.currency}`.trim();
      const mv = s.sum.count ? ` (${s.sum.count} hareket)` : "";
      return (b || accountLabel(s.sum)) + mv;
    });
    const body = parts.length > 3 ? [...parts.slice(0, 2), `+${parts.length - 2} hesap`] : parts;
    return { title: cut(`${who}: ${sheets.length === 1 ? "Hesap özeti" : `${sheets.length} hesap özeti`}`, 44), body: body.join(" · ") };
  }
  if (list.length === 1) return { title: cut(`${who}: ${str(list[0].subject) || "Yeni mail"}`, 44), body: cut(str(list[0].text).replace(/\s+/g, " "), 120) };
  return { title: cut(`${who}: ${list.length} yeni mail`, 44), body: list.slice(0, 3).map((m) => cut(str(m.subject) || "Mail", 36)).join(" · ") };
}

// Hesap özetini Excel'in açtığı CSV'ye çevirir (Türkçe Excel: ";" ayırıcı, virgüllü ondalık, UTF-8 BOM)
export function statementCsv(sheet, title = "") {
  const cell = (v) => {
    const s = typeof v === "number" ? String(v).replace(".", ",") : String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [];
  if (title) lines.push(cell(title));
  for (const [k, v] of Object.entries(sheet.meta || {})) lines.push([k, v].map(cell).join(";"));
  if (lines.length) lines.push("");
  lines.push((sheet.columns || []).map(cell).join(";"));
  for (const r of sheet.rows || []) lines.push((Array.isArray(r) ? r : r.v || []).map(cell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

// Sabit gönderenler: her zaman takip edilir, ayarlardan silinemez (kullanıcının eklediklerine katılır)
export const FIXED_SENDERS = [
  { name: "İş Bankası", from: "bilgilendirme@ileti.isbank.com.tr", fixed: true },
  { name: "Seyhun (iCloud)", from: "seyhun.yildiz@icloud.com", fixed: true }, // denemeler için
];
export function sendersOf(list) {
  const own = (Array.isArray(list) ? list : []).filter((r) => r?.from && !FIXED_SENDERS.some((f) => f.from === String(r.from).toLowerCase()));
  return [...FIXED_SENDERS, ...own];
}
