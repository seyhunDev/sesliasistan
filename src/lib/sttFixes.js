// Telefonun ses tanımasının yanlış yazdığı adlar ve düzeltmeleri (Seyhun: "söylenen telefonda anında yazılsın, yapay zeka
// düzeltsin, nereleri düzelttiğini geri bildirsin, bir dahaki sefere yerelde biz düzeltelim", 2026-10-10).
// Yapay zeka (/api/tasks) düzelttiği adları { heard, meant } olarak döndürür; yalnız bilinen bir ada (sporcu, çalışan, kişi)
// giden düzeltmeler saklanır. Sonraki sözlerde bunlar telefonda uygulanır ve yapay zekaya ipucu olarak gider. Yalnız bu cihazda.

const KEY = "sa-stt-fixes";
const MAX = 120;

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const L = "\\p{L}\\p{N}";

// Düzeltmeyi temizler: duyulan 3-40, doğrusu 2-40 harf, farklı, "meant" bilinen bir adın tamamı ya da kelimesi
export function cleanFix(f, names = []) {
  const heard = String(f?.heard || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const meant = String(f?.meant || "").replace(/\s+/g, " ").trim().slice(0, 40);
  if ([...heard].length < 2 || [...meant].length < 2 || low(heard) === low(meant)) return null;
  if (!/\p{L}/u.test(heard) || !/\p{L}/u.test(meant)) return null;
  const known = new Set(names.flatMap((n) => [low(n), ...low(n).split(" ")]).filter((w) => [...w].length >= 2));
  if (!known.has(low(meant))) return null;
  if (known.has(low(heard)) || [...heard].length < 3) return null; // gerçek bir ad ya da çok kısa söz değiştirilmez
  return { heard, meant };
}

// Yeni düzeltmeleri listeye ekler (aynı "heard" varsa yenisi geçer, en yeni önde)
export function mergeFixes(list = [], add = [], names = []) {
  const fresh = add.map((f) => cleanFix(f, names)).filter(Boolean);
  const seen = new Set(fresh.map((f) => low(f.heard)));
  return [...fresh, ...list.filter((f) => f && !seen.has(low(f.heard)))].slice(0, MAX);
}

// Metindeki bilinen yanlış yazımları düzeltir (tam kelime/kelime grubu, büyük-küçük harf fark etmez; ek kalır: "Samet'e" → "Samver'e")
export function applyFixes(text, list = []) {
  let out = String(text || "");
  if (!out || !list.length) return out;
  // Uzun yazımlar önce: "san ver" "san"dan önce
  for (const f of [...list].sort((a, b) => b.heard.length - a.heard.length)) {
    const re = new RegExp(`(^|[^${L}])${esc(f.heard).replace(/ /g, "\\s+")}(?=$|[^${L}]|['’])`, "giu");
    out = out.replace(re, (_, pre) => `${pre}${f.meant}`);
  }
  return out;
}

export function loadFixes() {
  try {
    const l = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(l) ? l.filter((f) => f && typeof f.heard === "string" && typeof f.meant === "string") : [];
  } catch {
    return [];
  }
}

export function learnFixes(add, names) {
  if (!Array.isArray(add) || !add.length) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(mergeFixes(loadFixes(), add, names)));
  } catch {}
}
