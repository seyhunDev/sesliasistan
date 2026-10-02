// Alışveriş listesi sesli komutları (yapay zekasız, anında). Saf fonksiyonlar: test edilebilir.
//   ekle:  "listeye süt ve ekmek ekle", "süt alışveriş listesine ekle", "marketten süt al"
//   aldım: "ekmek alındı", "sütü ve ekmeği aldım"  (yalnız listede eşleşen madde varsa; yoksa yapay zekaya gider)
//   sil:   "listeden sütü sil", "ekmeği listeden çıkar"
//   oku:   "listede ne var", "ne alacağız"

const ADD = [
  /^(?:alışveriş\s+)?(?:listeye|listesine|alınacaklara)\s+(.+?)\s+(?:de\s+|da\s+)?(?:ekle|yaz|koy)\.?$/i,
  /^(.+?)\s+(?:alışveriş\s+)?(?:listeye|listesine|alınacaklara)\s+(?:ekle|yaz|koy)\.?$/i,
  /^(?:marketten|bakkaldan|manavdan)\s+(?:de\s+)?(.+?)\s+(?:al|alalım|alınacak|alınsın)\.?$/i,
];
const DONE = /^(.+?)\s+(?:da\s+|de\s+)?(?:alındı|aldım|aldık|alınmış)\.?$/i;
const REMOVE = [
  /^(?:alışveriş\s+)?(?:listeden|listesinden)\s+(.+?)\s+(?:sil|çıkar|kaldır|at)\.?$/i,
  /^(.+?)\s+(?:alışveriş\s+)?(?:listeden|listesinden)\s+(?:sil|çıkar|kaldır|at)\.?$/i,
];
const READ = /(alışveriş listesi|listede ne var|listede neler|ne alacağız|ne alınacak|markette ne)/i;

// { op: "add" | "done" | "remove" | "read", what } ya da null
export function shopCommand(text) {
  const s = String(text || "").trim().replace(/[.!]+$/, "");
  if (!s || /\?\s*$/.test(s)) return READ.test(s) ? { op: "read", what: "" } : null;
  for (const re of REMOVE) {
    const m = re.exec(s);
    if (m) return { op: "remove", what: clean(m[1]) };
  }
  for (const re of ADD) {
    const m = re.exec(s);
    if (m) return { op: "add", what: clean(m[1]) };
  }
  if (READ.test(s)) return { op: "read", what: "" };
  const d = DONE.exec(s);
  if (d && d[1].split(/\s+/).length <= 8) return { op: "done", what: clean(d[1]) };
  return null;
}
const clean = (w) => w.replace(/^(alışveriş|ekip|aile)\s+/i, "").trim();

// "süt, ekmek ve 2 kg domates" → ["Süt", "Ekmek", "2 kg domates"]
export function splitItems(text) {
  return String(text || "")
    .split(/\s*(?:,|;|\n|\s+ve\s+|\s+ile\s+)\s*/i)
    .map((s) => s.replace(/^(bir de|bi de|ayrıca)\s+/i, "").trim().replace(/[.!]+$/, ""))
    .filter((s) => s.length > 0 && s.length <= 80)
    .map((s) => s[0].toLocaleUpperCase("tr-TR") + s.slice(1))
    .slice(0, 30);
}

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/['’].*$/, "").replace(/\s+/g, " ").trim();
// Ekli söyleyişin olası kökleri: "ekmeği" → ekmek, "sütü" → süt, "suyu" → su, "domatesleri" → domates, "ilacı" → ilaç
const SOFT = { ğ: "k", b: "p", c: "ç", d: "t" };
function stems(w) {
  const out = new Set([w]);
  const base = w.replace(/(?:lar|ler)?(?:ını|ini|unu|ünü|ı|i|u|ü|yı|yi|yu|yü|nı|ni|nu|nü)$/, "").replace(/(?:lar|ler)$/, "");
  if (base.length >= 2) {
    out.add(base);
    const last = base.slice(-1);
    if (SOFT[last]) out.add(base.slice(0, -1) + SOFT[last]);
  }
  return [...out];
}

// Söylenen her parçayı listedeki açık maddelerle eşleştirir: { hits: [madde], missed: ["söylenen"] }
export function matchShop(what, items = []) {
  const hits = [];
  const missed = [];
  for (const piece of splitItems(what)) {
    const words = low(piece).split(" ");
    const keys = stems(words[words.length - 1]); // son sözcük asıl ad: "iki şişe suyu" → su
    const hit = items.find((it) => !hits.includes(it) && low(it.text).split(" ").some((w) => keys.includes(w) || stems(w).some((x) => keys.includes(x))));
    if (hit) hits.push(hit);
    else missed.push(piece);
  }
  return { hits, missed };
}
