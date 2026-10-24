// Velora kişi kare kodu (Seyhun 2026-10-23: "QR'ı okuttuğunda o kişiyi direkt kişilerime ekleyebiliyor olmalıyım").
// Biçim standart vCard 3.0: iPhone kamerası da okuyup "Kişilere ekle" der; Velora ayrıca X-VELORA-* satırlarından
// grubu (çalışan, aile…) ve yakınlığı alır. Velora dışından gelen vCard ya da MECARD da okunur (grup sorulur).
// Kodda yalnız kişinin kendi verdiği bilgiler olur: ad, telefon, e-posta, unvan, doğum günü. Kimlik numarası, şifre yok.
import { KINDS, RELATIONS } from "./kinds.js";

const esc = (v) => String(v ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const unesc = (v) => String(v ?? "").replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
const pad = (n) => String(n).padStart(2, "0");

// Uluslararası biçim: 0532 123 45 67 → +905321234567
const intl = (phone) => {
  const d = String(phone || "").replace(/\D/g, "");
  if (/^0\d{10}$/.test(d)) return `+9${d}`;
  if (/^90\d{10}$/.test(d)) return `+${d}`;
  return d;
};

// Kişi (assistPerson taslağı ya da üye kaydı) → vCard metni
export function contactVcard(p = {}) {
  const name = String(p.name || "").replace(/\s+/g, " ").trim();
  if (!name) return "";
  const parts = name.split(" ");
  const last = parts.length > 1 ? parts.pop() : "";
  const b = p.birth;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(parts.join(" "))};;;`,
    `FN:${esc(name)}`,
    p.phone && `TEL;TYPE=CELL:${intl(p.phone)}`,
    p.email && `EMAIL:${esc(p.email)}`,
    p.title && `TITLE:${esc(p.title)}`,
    b?.month && b?.day && `BDAY:${b.year ? b.year : "-"}-${pad(b.month)}-${pad(b.day)}`,
    "X-VELORA:1",
    KINDS.includes(p.kind) && `X-VELORA-KIND:${p.kind}`,
    p.kind === "family" && RELATIONS.includes(p.relation) && `X-VELORA-REL:${esc(p.relation)}`,
    "END:VCARD",
  ];
  return lines.filter(Boolean).join("\r\n");
}

// vCard satırları (katlanmış satırlar birleşir): [{ key: "TEL", params: "TYPE=CELL", value }]
function vLines(text) {
  return String(text)
    .replace(/\r?\n[ \t]/g, "")
    .split(/\r?\n/)
    .map((l) => /^(?:item\d+\.)?([A-Za-z-]+)((?:;[^:]*)?):(.*)$/.exec(l.trim()))
    .filter(Boolean)
    .map(([, key, params, value]) => ({ key: key.toUpperCase(), params: params.toUpperCase(), value }));
}

const birthOf = (v) => {
  const m = /^(\d{4}|-{1,2})-?(\d{2})-?(\d{2})/.exec(String(v || "").trim());
  if (!m) return null;
  const month = +m[2], day = +m[3];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { day, month, year: /^\d{4}$/.test(m[1]) ? +m[1] : null };
};
const telOf = (v) => {
  const d = String(v || "").replace(/[^\d+]/g, "");
  const m = /^\+?90(\d{10})$/.exec(d);
  return m ? `0${m[1]}` : d.replace(/^\+/, "");
};

// Okutulan kare kodun yazısı → kişi taslağı ({ name, kind, relation, title, phone, email, birth, velora }) ya da null
export function parseContactQr(text) {
  const t = String(text || "").trim();
  if (/^BEGIN:VCARD/i.test(t)) {
    const ls = vLines(t);
    const get = (k) => ls.find((l) => l.key === k);
    const fn = unesc(get("FN")?.value || "");
    const n = (get("N")?.value || "").split(/(?<!\\);/).map(unesc);
    const name = (fn || [n[1], n[2], n[0]].filter(Boolean).join(" ")).replace(/\s+/g, " ").trim();
    if (!name) return null;
    const tels = ls.filter((l) => l.key === "TEL");
    const tel = tels.find((l) => /CELL|MOBILE/.test(l.params)) || tels[0];
    const kind = get("X-VELORA-KIND")?.value.trim();
    const rel = unesc(get("X-VELORA-REL")?.value || "");
    const out = { name, velora: !!get("X-VELORA") };
    if (tel) out.phone = telOf(tel.value);
    if (get("EMAIL")) out.email = unesc(get("EMAIL").value).toLocaleLowerCase("tr-TR");
    if (get("TITLE")) out.title = unesc(get("TITLE").value).slice(0, 40);
    const b = birthOf(get("BDAY")?.value);
    if (b) out.birth = b;
    if (KINDS.includes(kind)) out.kind = kind;
    if (out.kind === "family" && RELATIONS.includes(rel)) out.relation = rel;
    return out;
  }
  // MECARD:N:Kaya,Ali;TEL:05321234567;EMAIL:ali@x.com;BDAY:19900312;;
  if (/^MECARD:/i.test(t)) {
    const f = {};
    for (const m of t.slice(7).matchAll(/([A-Z-]+):((?:\\.|[^;])*);/gi)) f[m[1].toUpperCase()] ??= unesc(m[2]);
    const name = (f.N || "").split(",").reverse().map((x) => x.trim()).filter(Boolean).join(" ");
    if (!name) return null;
    const out = { name, velora: false };
    if (f.TEL) out.phone = telOf(f.TEL);
    if (f.EMAIL) out.email = f.EMAIL.toLocaleLowerCase("tr-TR");
    const b = birthOf(f.BDAY);
    if (b) out.birth = b;
    return out;
  }
  return null;
}

// "Kare kodu okut", "QR okut", "kişinin kare kodunu tara", "karekodla kişi ekle" → canlı okutma açılır
const QR = "(?:kare\\s*kod\\p{L}*|karekod\\p{L}*|qr(?:\\s*kod\\p{L}*)?|kuar\\p{L}*|kü\\s*ar\\p{L}*)";
export const contactScanCommand = (s) => {
  const t = String(s || "").toLocaleLowerCase("tr-TR").replace(/[’']/g, "");
  return new RegExp(`(?<![\\p{L}])${QR}(?:\\s+\\p{L}+){0,2}?\\s+(?:okut\\p{L}*|oku(?:t|yalım|sana|r musun)?|tara\\p{L}*|aç\\p{L}*)(?![\\p{L}])|(?<![\\p{L}])${QR}(?:la|le|yla|yle|dan|den)?\\s+(?:\\p{L}+\\s+)?(?:kişi\\p{L}*\\s+)?ekle`, "u").test(t) && !/(sipariş|kurye|yemek)/u.test(t);
};
