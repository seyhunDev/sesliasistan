// Cihaz sesiyle (Web Speech) okuma için yardımcılar: en doğal Türkçe sesi seçer, metni Türkçe okunuşa çevirir,
// uzun metni kısa parçalara böler. Tarayıcıya bağlı değil; testlerde de çalışır.

// ---- Ses seçimi ----
// iPhone'da Yelda'nın Kompakt / Gelişmiş / Premium sürümleri aynı adla görünebilir; fark voiceURI'dedir
// (com.apple.voice.premium.tr-TR.Yelda). Eğlence sesleri (Eddy, Flo, Grandma…) hiç seçilmez.
const FUNNY = /eloquence|speech\.synthesis\.voice|\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox)\b/i;

export const isTr = (v) => !!v?.lang && v.lang.toLowerCase().replace("_", "-").startsWith("tr");

// 3 Premium, 2 Gelişmiş (ya da Google gibi bulut kalitesinde), 1 Kompakt/standart, 0 eğlence sesi
export function voiceQuality(v) {
  const id = `${v?.voiceURI || ""} ${v?.name || ""}`;
  if (FUNNY.test(id)) return 0;
  if (/premium/i.test(id)) return 3;
  if (/enhanced|gelişmiş|geliştirilmiş|siri|neural|natural|google/i.test(id)) return 2;
  return 1;
}

export const QUALITY_LABEL = { 3: "Premium", 2: "Gelişmiş", 1: "Kompakt", 0: "Eğlence" };

// Türkçe sesler, en iyisi başta. Aynı voiceURI bir kez.
export function rankVoices(voices) {
  const seen = new Set();
  return (voices || [])
    .filter((v) => isTr(v) && !seen.has(v.voiceURI) && seen.add(v.voiceURI))
    .map((v) => ({ v, q: voiceQuality(v) }))
    .sort((a, b) => b.q - a.q || Number(b.v.localService) - Number(a.v.localService) || Number(b.v.default) - Number(a.v.default))
    .map(({ v }) => v);
}

// Kayıtlı seçim varsa o, yoksa en iyi (eğlence sesi değil) ses
export function bestVoice(voices, uri) {
  const list = rankVoices(voices);
  return (uri && list.find((v) => v.voiceURI === uri)) || list.find((v) => voiceQuality(v) > 0) || null;
}

export function voiceLabel(v) {
  const name = String(v?.name || "").replace(/\s*\((premium|enhanced|gelişmiş|compact|kompakt)\)\s*/i, "").trim() || "Ses";
  return `${name} · ${QUALITY_LABEL[voiceQuality(v)]}`;
}

// ---- Okunuş ----
const ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli"];
const words = (n) => (n === 0 ? "sıfır" : [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(" "));
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const MONTH_RE = MONTHS.join("|");

// 14:30 -> "on dört otuz", 09:05 -> "dokuz sıfır beş", 18:00 -> "on sekiz"
export function sayTime(h, m) {
  h = Number(h);
  m = Number(m);
  if (!m) return words(h);
  return `${words(h)} ${m < 10 ? "sıfır " : ""}${words(m)}`;
}

const L = "\\p{L}";
const R = (s, f = "giu") => new RegExp(s, f);

// Metni Türkçe sesin doğal okuyacağı biçime getirir (ekranda gösterilen metin değişmez)
export function speechText(text) {
  let t = String(text ?? "");
  t = t
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown bağlantı -> yazısı
    .replace(/https?:\/\/\S+/gi, "bağlantı")
    .replace(/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}️‍⃣]/gu, "")
    .replace(/[*_`#>~|]/g, "")
    // Satır başı imleri ve satır sonları: her satır ayrı cümle gibi okunsun
    .replace(/^[ \t]*(?:[-•–·]|\d+[.)])[ \t]+/gm, "")
    .replace(/([^.!?:;,\s])[ \t]*\n+/g, "$1. ")
    .replace(/\s*\n+\s*/g, " ");

  // Tarih: 2026-10-07 ve 07.10.2026 -> 7 Ekim 2026
  t = t.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (s, y, mo, d) => (MONTHS[mo - 1] ? `${+d} ${MONTHS[mo - 1]} ${y}` : s));
  t = t.replace(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g, (s, d, mo, y) => (MONTHS[mo - 1] && +d <= 31 ? `${+d} ${MONTHS[mo - 1]} ${y}` : s));
  // Aralık: "7-11 Ekim" -> "7 ile 11 Ekim", "10:00-12:00" -> "10:00 ile 12:00"
  t = t.replace(R(`(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})(\\s+(?:${MONTH_RE}))`), "$1 ile $2$3");
  t = t.replace(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/g, "$1 ile $2");
  // Saat: 14:30 / saat 14.30 -> "on dört otuz"
  // Ek doğrudan okunuşa bitişir: "14:30'da" -> "on dört otuzda"
  t = t.replace(/(?<![\d.,:])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])['’]?/g, (_, h, m) => sayTime(h, m));
  t = t.replace(R(`(saat\\s+)([01]?\\d|2[0-3])\\.([0-5]\\d)(?!\\d)['’]?`), (_, s, h, m) => s + sayTime(h, m));

  // Para, yüzde, birimler
  t = t
    .replace(/₺\s?(\d[\d.,]*)/g, "$1 lira")
    .replace(/(\d)\s?₺/g, "$1 lira")
    .replace(R(`(\\d)\\s?(?:TL|TRY)(?![${L}])`), "$1 lira")
    .replace(/(\d)\s?€/g, "$1 avro")
    .replace(/€\s?(\d[\d.,]*)/g, "$1 avro")
    .replace(/(\d)\s?\$/g, "$1 dolar")
    .replace(/\$\s?(\d[\d.,]*)/g, "$1 dolar")
    .replace(/%\s?(\d[\d.,]*)/g, "yüzde $1")
    .replace(/(\d)\s?°\s?C\b/g, "$1 derece")
    .replace(/(\d)\s?°/g, "$1 derece")
    .replace(R(`(\\d[\\d.,]*)\\s?km\\s?/\\s?sa?(?![${L}])`), "saatte $1 kilometre")
    .replace(R(`(\\d[\\d.,]*)\\s?m\\s?/\\s?sn?(?![${L}])`), "saniyede $1 metre")
    .replace(R(`(\\d)\\s?(?:kt|kts|knot)(?![${L}])`), "$1 knot")
    .replace(R(`(\\d)\\s?km(?![${L}])`), "$1 kilometre")
    .replace(R(`(\\d)\\s?mm(?![${L}])`), "$1 milimetre")
    .replace(R(`(\\d)\\s?kg(?![${L}])`), "$1 kilo");

  // Kısaltmalar
  t = t
    .replace(R(`(?<![${L}])vb\\.`), "ve benzeri")
    .replace(R(`(?<![${L}])vs\\.`), "vesaire")
    .replace(R(`(?<![${L}])örn\\.`), "örneğin")
    .replace(R(`(?<![${L}])bkz\\.`), "bakınız")
    .replace(R(`(?<![${L}])no\\s?:\\s?(?=\\d)`), "numara ")
    .replace(/\s&\s/g, " ve ")
    .replace(R(`([${L}])/([${L}])`), "$1 ya da $2")
    .replace(/\s+\/\s+/g, ", ")
    .replace(/\s+[-–—]\s+/g, ", ")
    .replace(/[()[\]{}"“”]/g, (c) => ("([{".includes(c) ? ", " : ""))
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,;:])(?:\s*[,;:])+/g, "$1")
    .replace(/\.{2,}/g, "…")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.]+/, "")
    .trim();
  return t;
}

// ---- Parçalara bölme ----
// Cümle cümle; çok uzun cümle virgülden bölünür (iPhone'da uzun ifade geç başlar, durdurmak da gecikir)
export function speechChunks(text, max = 160) {
  const out = [];
  for (const s of String(text || "").match(/[^.!?…]+(?:[.!?…]+|$)/g) || []) {
    let rest = s.trim();
    while (rest.length > max) {
      const cut = Math.max(rest.lastIndexOf(", ", max), rest.lastIndexOf("; ", max));
      const at = cut > 40 ? cut + 1 : rest.lastIndexOf(" ", max);
      if (at < 20) break;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  // Çok kısa parçalar (ör. "Tamam.") bir sonrakiyle birleşir: aralar kısalır
  return out.reduce((a, c) => {
    const last = a[a.length - 1];
    if (last && last.length < 25 && last.length + c.length < max) a[a.length - 1] = `${last} ${c}`;
    else a.push(c);
    return a;
  }, []);
}
