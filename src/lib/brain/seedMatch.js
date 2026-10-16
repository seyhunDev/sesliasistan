// Hazır cümle setini (seedPhrases.js) sözün içinde arayan küçük eşleyici.
// Saf işlevler: telefonda hemen çalışır, yapay zekaya ve Firestore'a gitmez.
//   seedTop(söz)   en iyi eşleşen iş { id, at, len, words, x } ya da null
//   seedFind(söz)  uzun paragraftaki bütün işler, söylenme sırasıyla (iç içe olanlardan uzunu kalır)
//   withLearned(seed, learned)  öğrenilen cümleleri [{ id, x }] sete ekler (puanlama ileride kullanır)
import { SEED } from "./seedPhrases";

const MAP = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

// Türkçe küçük harf, harfsiz, kesmesiz; cümle sonu işaretleri (. ! ? ;) korunur, diğer işaretler boşluk olur
export function fold(s) {
  return String(s || "")
    .replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/[çğıöşüâîû]/g, (c) => MAP[c])
    .replace(/['’‘`´]/g, "")
    .replace(/[^\p{L}\d.!?;\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const W = "(?<![\\p{L}\\d])";
const END = "(?![\\p{L}\\d])";
// Kelime kalıbı: sondaki ya da düzenli ifade dışındaki "*" kelimenin devamı (\p{L}*) olur
function word(t) {
  return `${W}(?:${t.replace(/(?<![}\]])\*/g, "\\p{L}*")})${END}`;
}
export function compileKey(key) {
  const parts = key.trim().split(/\s+/).map(word);
  return new RegExp(parts.join("(?:\\s+\\S+){0,3}?\\s+"), "u");
}

const cache = new WeakMap();
function compiled(seed) {
  let c = cache.get(seed);
  if (!c) {
    c = [];
    for (const t of seed) {
      for (const k of t.keys || []) c.push({ id: t.id, words: wordsOf(k), re: compileKey(k) });
      for (const x of t.learned || []) {
        const f = fold(x).replace(/[.!?;]/g, "");
        if (f) c.push({ id: t.id, words: f.split(" ").length + 1, re: new RegExp(`${W}${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${END}`, "u") });
      }
    }
    cache.set(seed, c);
  }
  return c;
}

// Paragrafı cümlelere böler (nokta yalnız ardından boşluk ya da son gelirse; "9.30" bölünmez)
function clauses(text) {
  const out = [];
  const re = /[^.!?;]+(?:[.!?;](?!\s|$)[^.!?;]*)*/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const s = raw.trim();
    if (s) out.push({ s, at: m.index + lead });
  }
  return out;
}

// Çok kelimeli kalıp kazanır; eşitse daha sıkı (kısa) eşleşme, sonra önce söylenen
const better = (a, b) => a.words - b.words || b.len - a.len || b.at - a.at;
const wordsOf = (k) => k.trim().split(/\s+/).length + (k.match(/\\s\+/g) || []).length;

export function seedFind(text, seed = SEED) {
  const f = fold(text);
  const hits = [];
  for (const c of clauses(f)) {
    for (const k of compiled(seed)) {
      const m = k.re.exec(c.s);
      if (m) hits.push({ id: k.id, at: c.at + m.index, len: m[0].length, words: k.words, x: m[0] });
    }
  }
  // Aynı yeri tutan eşleşmelerden en iyisi kalır, aynı iş bir kez
  hits.sort((a, b) => better(b, a));
  const kept = [];
  for (const h of hits) {
    const clash = kept.some((k) => h.at < k.at + k.len && k.at < h.at + h.len);
    if (!clash && !kept.some((k) => k.id === h.id && Math.abs(k.at - h.at) < 1)) kept.push(h);
  }
  return kept.sort((a, b) => a.at - b.at);
}

export function seedTop(text, seed = SEED) {
  const f = fold(text);
  let best = null;
  for (const c of clauses(f)) {
    for (const k of compiled(seed)) {
      const m = k.re.exec(c.s);
      if (!m) continue;
      const h = { id: k.id, at: c.at + m.index, len: m[0].length, words: k.words, x: m[0] };
      if (!best || better(h, best) > 0) best = h;
    }
  }
  return best;
}

export const seedTask = (id, seed = SEED) => seed.find((t) => t.id === id) || null;

// learned: [{ id, x }] — x öğrenilen söz; bilinmeyen iş adı atlanır, aynı söz iki kez eklenmez
export function withLearned(seed, learned) {
  const add = new Map();
  for (const l of learned || []) {
    if (!l?.id || !l?.x || !seed.some((t) => t.id === l.id)) continue;
    const f = fold(l.x);
    if (!f) continue;
    if (!add.has(l.id)) add.set(l.id, []);
    if (!add.get(l.id).includes(f)) add.get(l.id).push(f);
  }
  if (!add.size) return seed;
  return seed.map((t) => (add.has(t.id) ? { ...t, learned: [...(t.learned || []), ...add.get(t.id).filter((x) => !(t.learned || []).includes(x))] } : t));
}
