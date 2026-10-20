// Antrenman yarışı sonucunu sesle girme (Seyhun 2026-10-20): "birinci Ali, ikinci Ayşe, üçüncü Mehmet", "1 Ali 2 Ayşe 3 Mehmet",
// "bir Ali oldu, iki Ayşe oldu", "Ali birinci Ayşe ikinci", "yarış sonucu: Ali, Ayşe, Mehmet", "Can DNF", "Ece bitirmedi",
// "ikinci yarış: …", "yeni yarış: …", "son yarışta Can DNF". Adlar sporculara eşlenir (resolveResult), sonuç antrenman
// planının yarışına yazılır (applyResult; lib/raceScore.js). Asistandaki işi isler/antrenmanYaris.js.
import { matchNames } from "@/lib/trainingLog";
import { closeNames, plain } from "@/lib/names";
import { CODES } from "@/lib/raceScore";

const UNITS = ["birinci", "ikinci", "üçüncü", "dördüncü", "beşinci", "altıncı", "yedinci", "sekizinci", "dokuzuncu"];
const TENS = { onuncu: 10, yirminci: 20, otuzuncu: 30 };
const TEN_W = { on: 10, yirmi: 20, otuz: 30 };
const CARD = ["bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
// Söylenen ceza kodları (harf harf söylenen "D N F" de)
const CODE_W = [
  ["DNF", /(?<![\p{L}])(bitirmedi|bitiremedi|bitirmemiş|tamamlamadı)(?![\p{L}])/gu],
  ["DNS", /(?<![\p{L}])(start (etmedi|almadı|edemedi)|başlamadı|çıkmadı|yarışmadı)(?![\p{L}])/gu],
  ["BFD", /(?<![\p{L}])(siyah bayrak\p{L}*)(?![\p{L}])/gu],
  ["OCS", /(?<![\p{L}])(erken (çıktı|kalktı|start\p{L}*))(?![\p{L}])/gu],
  ["RET", /(?<![\p{L}])(çekildi|bıraktı)(?![\p{L}])/gu],
  ["DSQ", /(?<![\p{L}])(diskalifiye\p{L}*|diskalif\p{L}*)(?![\p{L}])/gu],
];
const FILLER = new Set(["ve", "sonra", "de", "da", "oldu", "oldular", "olmuş", "olarak", "geldi", "gelmiş", "bitirdi", "sırada", "sırayla", "yerde", "ise", "ile", "şöyle", "şu", "bu", "için", "sporcu", "sporcular", "kişi", "sıra", "sırası", "derece", "dereceyle", "yer", "yeri", "puan", "bitiş", "bitişi", "sonuç", "sonucu", "sonuçlar", "sonuçları", "sıralama", "sıralaması", "sıralamayı", "sonucunu", "tamam"]);
const TRIGGER = /(?<![\p{L}])(yarış\p{L}*|sonu[çc]\p{L}*|sıralama\p{L}*|bitiş sırası)(?![\p{L}])/u;
const LIST_W = /(?<![\p{L}])(sonu[çc]\p{L}*|sıralama\p{L}*|bitiş sırası)(?![\p{L}])/u;
// Soru, başka iş ya da sayı birimi: sonuç girişi değil
const NOT_RES = /\?\s*$|(?<![\p{L}])(m[ıiuü]|kim|kimler|kaçıncı|hangi\p{L}*|ne|neler|nasıl|göster\p{L}*|aç|oku|söyle|sil\p{L}*|kaldır\p{L}*|lira|tl|saat\p{L}*|dakika\p{L}*|saniye\p{L}*|knot|kn|kilo\p{L}*|boy\p{L}*|cm|gün\p{L}*|sayaç\p{L}*|geri sayım\p{L}*|hatırlat\p{L}*|mesaj\p{L}*|yarın|haftaya|plan\p{L}*|görev\p{L}*|oluştur\p{L}*|tekne\p{L}*)(?![\p{L}])/u;

const lowTr = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const ordOf = (w) => {
  const base = w.replace(/s[ıiuü]$/u, ""); // birincisi
  const u = UNITS.indexOf(base);
  if (u >= 0) return u + 1;
  return TENS[base] || 0;
};

// Cümleyi çöz. Sonuç null ya da { race: { n } | { new: true } | { last: true } | null,
//   runs: [{ place: sayı | null, toks: [ad sözcüğü | { code }] }], list: sıra sözcüklü liste mi }
export function resultCommand(text) {
  let t = lowTr(text).replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
  if (!t || t.split(" ").length > 80 || NOT_RES.test(t)) return null;
  // Harf harf söylenen kodlar: "d n f", "d.n.f." → dnf
  for (const [c] of CODES) t = t.replace(new RegExp(`(?<![\\p{L}])${c.toLowerCase().split("").join("[\\s.]*")}\\.?(?![\\p{L}])`, "gu"), ` ${c.toLowerCase()} `);
  for (const [c, re] of CODE_W) t = t.replace(re, ` ${c.toLowerCase()} `);
  // "1.", "1'inci", "1inci", "1.si" → #1; "2. yarış" de böylece "#2 yarış" olur
  t = t.replace(/(?<![\d])(\d{1,2})\s*(?:'?\s*(?:inci|ıncı|uncu|üncü|nci|ncı|ncu|ncü)|\.)(?:s[ıiuü])?(?![\p{L}\d])/gu, " #$1 ");
  t = t.replace(/[,;]/g, " | ").replace(/[:!.()"]/g, " ").replace(/\s+/g, " ").trim(); // virgül adları ayırır ("Mehmet, Can")
  const trigger = TRIGGER.test(t);
  const listy = LIST_W.test(t);

  // Sözcükler: sıra (#n güçlü, %n zayıf: düz sayı ya da "bir, iki"), kod, ad
  const words = t.split(" ");
  const cards = new Set(words.filter((w) => CARD.includes(w)));
  const useCard = cards.size >= 2 && cards.has("bir");
  const toks = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const nx = words[i + 1] || "";
    if (w === "|") toks.push({ sep: true });
    else if (/^#\d+$/.test(w)) toks.push({ ord: +w.slice(1), strong: true });
    else if (TEN_W[w] && ordOf(nx) && ordOf(nx) < 10) toks.push({ ord: TEN_W[w] + ordOf(nx), strong: true }), i++;
    else if (ordOf(w)) toks.push({ ord: ordOf(w), strong: true });
    else if (/^\d{1,2}$/.test(w) && +w >= 1 && +w <= 40) toks.push({ ord: +w });
    else if (useCard && CARD.includes(w)) toks.push({ ord: CARD.indexOf(w) + 1 });
    else if (CODES.some(([c]) => c.toLowerCase() === w)) toks.push({ code: w.toUpperCase() });
    else toks.push({ w });
  }
  // Yarış: "#2 yarış…", "yeni yarış", "son yarış", "bu yarış"
  let race = null;
  for (let i = 0; i < toks.length; i++) {
    const nx = toks[i + 1]?.w || "";
    if (!/^yarış/.test(nx)) continue;
    const k = toks[i];
    if (k.ord) race = { n: k.ord };
    else if (k.w === "yeni") race = { new: true };
    else if (k.w === "son" || k.w === "bu" || k.w === "önceki") race = { last: true };
    else continue;
    toks.splice(i, 2);
    break;
  }
  const clean = toks
    .map((k) => (k.w != null ? { ...k, w: k.w.replace(/'.*$/u, "") } : k))
    .filter((k) => k.w == null || (k.w && !FILLER.has(k.w) && !/^(yarış|antre?n?man|idman|bugün|kaydet|yaz|gir|ekle|işle)\p{L}*$/u.test(k.w) && !/^\d/.test(k.w)));
  const ords = clean.filter((k) => k.ord);
  const strong = ords.filter((k) => k.strong).length;
  const weak = ords.filter((k) => !k.strong);
  const codes = clean.filter((k) => k.code).length;
  const names = clean.filter((k) => k.w).length;
  if (!names) return null;
  const ok =
    strong >= 2 ||
    (strong >= 1 && trigger) ||
    (weak.length >= 2 && weak.some((k) => k.ord === 1) && new Set(weak.map((k) => k.ord)).size === weak.length) ||
    (weak.some((k) => k.ord === 1) && trigger) ||
    (codes >= 1 && (trigger || ords.length >= 1)) ||
    (listy && /yarış|sonu[çc]|sıralama/.test(t));
  if (!ok) return null;

  // Sıra sözcüğü önce mi ("birinci Ali") sonra mı ("Ali birinci")
  const firstOrd = clean.findIndex((k) => k.ord);
  const firstName = clean.findIndex((k) => k.w);
  const ordFirst = firstOrd >= 0 && firstOrd < firstName;
  const runs = [];
  let cur = { place: null, toks: [] };
  for (const k of clean) {
    if (k.ord) {
      if (ordFirst) {
        if (cur.toks.length || cur.place) runs.push(cur);
        cur = { place: k.ord, toks: [] };
      } else {
        cur.place = k.ord;
        runs.push(cur);
        cur = { place: null, toks: [] };
      }
    } else if (k.sep) cur.toks.length && cur.toks.push("|");
    else cur.toks.push(k.code ? { code: k.code } : k.w);
  }
  if (cur.toks.length) runs.push(cur);
  if (!runs.some((r) => r.toks.some((x) => typeof x === "string" && x !== "|"))) return null;
  return { race, runs, list: !ords.length };
}

// Bir sözcük dizisini sporcu adlarına böl: en uzun eşleşme önce (3, 2, 1 sözcük); önce o gün gelenler, sonra tüm etkinler,
// sonra ses adları (aliases: { sporcuId: ["mete han", …] }). Eşleşmeyen ardışık sözcükler tek "bilinmeyen" olur.
function splitNames(words, pools, aliases) {
  const out = [];
  let lost = [];
  const one = (q) => {
    const fw = plain(q.split(" ")[0]);
    for (const pool of pools) {
      const m = matchNames([q], pool);
      if (m.ids.length === 1) return pool.find((a) => a.id === m.ids[0]);
      // "Can": Can Er ile Mehmet Can'dan ilk adı Can olan
      const byFirst = pool.filter((a) => plain(a.studentName.split(" ")[0]) === fw && matchNames([q], [a]).ids.length === 1);
      if (byFirst.length === 1) return byFirst[0];
    }
    const pq = plain(q);
    const hit = pools.at(-1).filter((a) => (aliases[a.id] || []).some((x) => plain(x) === pq));
    return hit.length === 1 ? hit[0] : null;
  };
  for (let i = 0; i < words.length; ) {
    let got = null;
    let len = 0;
    for (let L = Math.min(3, words.length - i); L >= 1 && !got; L--) {
      got = one(words.slice(i, i + L).join(" "));
      len = L;
    }
    if (got) {
      if (lost.length) out.push({ lost: lost.join(" ") }), (lost = []);
      out.push({ a: got });
      i += len;
    } else lost.push(words[i++]);
  }
  if (lost.length) out.push({ lost: lost.join(" ") });
  return out;
}

// Sporculara eşle. athletes: etkin sporcular { id, studentName, status }, present: o gün gelenlerin id'leri.
// Yanlış duyulan ad o gün gelenlerden tek birine yakınsa düzeltilir (fixed), değilse en yakınlar sorulur (unknown).
// Sonuç { items: [{ id, name, place?, code? }], fixed: [{ said, name }], unknown: [{ said, picks: [ad] }] }
export function resolveResult(cmd, athletes, present = [], aliases = {}) {
  const all = (athletes || []).filter((a) => a.studentName && (a.status || "active") === "active").map((a) => ({ ...a, status: "active" }));
  const here = all.filter((a) => present.includes(a.id));
  const pools = here.length ? [here, all] : [all];
  const items = [];
  const fixed = [];
  const unknown = [];
  let last = 0; // son verilen sıra: sırası söylenmeyen ad bir sonrakine yazılır
  const seen = new Set();
  const push = (a, place, code) => {
    if (!a || seen.has(a.id)) return;
    seen.add(a.id);
    if (code) items.push({ id: a.id, name: a.studentName, code });
    else items.push({ id: a.id, name: a.studentName, place: (last = place || last + 1) });
  };
  for (const run of cmd.runs) {
    // Sözcükler ve kodlar: kod kendinden önceki ada (önünde ad yoksa sonrakine) yazılır
    const parts = [];
    let words = [];
    const flush = () => words.length && (parts.push(...splitNames(words, pools, aliases)), (words = []));
    let pending = "";
    for (const x of run.toks) {
      if (x === "|") flush();
      else if (typeof x === "string") words.push(x);
      else {
        flush();
        const prev = parts.at(-1);
        if (prev && !prev.code) prev.code = x.code;
        else pending = x.code;
      }
    }
    flush();
    if (pending) {
      const p = parts.find((y) => !y.code);
      if (p) p.code = pending;
    }
    let place = run.place;
    for (const p of parts) {
      let a = p.a;
      if (!a && p.lost) {
        const near = closeNames(p.lost, here.map((x) => x.studentName));
        if (near.length === 1) {
          a = here.find((x) => x.studentName === near[0]);
          fixed.push({ said: p.lost, name: a.studentName });
        } else {
          const picks = near.length ? near : closeNames(p.lost, all.map((x) => x.studentName));
          unknown.push({ said: p.lost, picks, place: p.code ? null : place || last + 1, code: p.code || "" });
          if (!p.code) last = place || last + 1;
          place = null;
          continue;
        }
      }
      push(a, p.code ? null : place, p.code);
      if (!p.code) place = null;
    }
  }
  return { items, fixed, unknown };
}

// Hangi yarış: söylenen ("2. yarış", "yeni yarış", "son yarış"), yoksa sayacı süren yarış, yoksa sonucu boş son yarış;
// son yarışın sonucu varsa: yalnız kod ya da 1'den sonraki sıralar söylendiyse ona eklenir, 1. söylendiyse yeni yarış açılır.
// Sonuç { index (yeni ise races.length), isNew } ya da { error }
export function pickRace(races, cmd, items, runningId = "") {
  const n = races.length;
  const r = cmd.race;
  if (r?.n) return r.n <= n ? { index: r.n - 1, isNew: false } : r.n === n + 1 ? { index: n, isNew: true } : { error: `Bugün ${n} yarış var; ${r.n}. yarış yok.` };
  if (r?.new || !n) return { index: n, isNew: true };
  if (r?.last) return { index: n - 1, isNew: false };
  const run = races.findIndex((x) => x.id === runningId);
  if (run >= 0) return { index: run, isNew: false };
  if (!races[n - 1].finishes?.length) return { index: n - 1, isNew: false };
  return items.some((x) => x.place === 1) ? { index: n, isNew: true } : { index: n - 1, isNew: false };
}

// Sonucu yarışa yaz: söylenen sporcular eski yerlerinden çıkar, sırası söylenen o sıraya (kodsuzlar arasında), kodlu olan sona.
export function applyResult(race, items) {
  const ids = new Set(items.map((x) => x.id));
  const old = new Map((race.finishes || []).map((f) => [f.id, f]));
  const ranked = (race.finishes || []).filter((f) => !f.code && !ids.has(f.id));
  const coded = (race.finishes || []).filter((f) => f.code && !ids.has(f.id));
  const keep = (x) => {
    const { code: _, ...f } = old.get(x.id) || { id: x.id, name: x.name };
    return { ...f, id: x.id, name: x.name };
  };
  for (const x of items.filter((y) => y.place).sort((a, b) => a.place - b.place)) ranked.splice(Math.min(ranked.length, x.place - 1), 0, keep(x));
  for (const x of items.filter((y) => y.code)) coded.push({ ...keep(x), code: x.code });
  return { ...race, finishes: [...ranked, ...coded] };
}

// "1 Ali Kaya, 2 Ayşe Şahin, Can Er DNF"
export const resultLine = (race) => {
  let n = 0;
  return (race.finishes || []).map((f) => (f.code ? `${f.name} ${f.code}` : `${++n} ${f.name}`)).join(", ");
};
