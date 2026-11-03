// Grup grup yarış ve geçici genel sıralama (Seyhun 2026-11-01). Saf işlevler, test: scripts/asistan-test/yerel/yaris.mjs.
// - Eleme serisinde filo renk gruplarına bölünür (Mavi, Sarı, Yeşil, Pembe…), gruplar her gün değişir; final serisinde Altın, Gümüş, Bronz.
//   Her grup ayrı start yapar: startın grubu dönüş kaydında (raceLive rounds[startId].grp). Grup listesi varsa kayıt listesinde
//   günü günü (entries/list groups[gün] = [[yelken, grup]]), yoksa grup o startta okunan teknelerdir.
// - Puan (RRS Ek A, geçici): her yarışta sporcunun kendi grubundaki finiş sırası. Yarış bittiyse (start "fin") finiş yapmayan
//   o grubun tekne sayısı + 1 alır (startta görüldüyse DNF, grup listesinde olup hiç görülmediyse DNC). Süren yarışta yalnız finiş yapanlar yazılır.
// - Sıra: toplam az olan önde; eşitse en çok birincisi, sonra ikincisi… olan; o da eşitse son yarıştan geriye doğru daha iyi puanı olan.
//   Atılan yarış (discard) geçicide yok; resmî sonuç PDF'ten gelir ve bu hesaba karışmaz.
import { CAT_RULES, bornYear, catOf, grpOf } from "./resultSheet";

const plain = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c])
    .replace(/[^a-z]/g, "");

export const COLORS = [
  ["Mavi", /^(mavi|blue)/, "#3b82f6"],
  ["Sarı", /^(sari|yellow)/, "#eab308"],
  ["Yeşil", /^(yesil|green)/, "#22a35a"],
  ["Pembe", /^(pembe|pink)/, "#ec4899"],
  ["Kırmızı", /^(kirmizi|red)/, "#e5484d"],
  ["Turuncu", /^(turuncu|orange)/, "#f08c2e"],
  ["Mor", /^(mor|purple)/, "#8b5cf6"],
  ["Beyaz", /^(beyaz|white)/, "#b8bcc6"],
];
const FINALS = { Altın: "#d4a017", Gümüş: "#9aa3ad", Bronz: "#b07040", Zümrüt: "#1f9e74" };
// Dönüş ekranında seçilen gruplar (sırayla)
// sıra: Sarı, Mavi, Yeşil, Pembe (Seyhun 2026-11-02 "önce sarı, sonra mavi, yeşil, pembe")
export const GROUP_PICK = ["Sarı", "Mavi", "Yeşil", "Pembe", "Altın", "Gümüş", "Bronz"];

// "mavi grup", "Blue fleet", "GOLD" → "Mavi", "Altın"; tanınmazsa ""
export function groupOf(raw) {
  const fin = grpOf(raw);
  if (fin) return fin;
  const p = plain(String(raw || "").replace(/\b(grup|group|fleet|filo)\b/gi, ""));
  return COLORS.find(([, re]) => re.test(p))?.[0] || "";
}
export const groupColor = (g) => COLORS.find(([n]) => n === g)?.[2] || FINALS[g] || "";

// Günün grup listesi: [[yelken, grup]] → { yelken: grup }
export const groupMap = (list) => Object.fromEntries((Array.isArray(list) ? list : []).filter((x) => Array.isArray(x) && x[0] && x[1]).map(([s, g]) => [String(s), String(g)]));
export function cleanGroups(g) {
  const out = {};
  for (const [day, list] of Object.entries(g && typeof g === "object" ? g : {}).slice(-20)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !list || typeof list !== "object") continue;
    // kayıtta { yelken: grup } (Firestore iç içe diziyi reddeder), bellekte [[yelken, grup]]
    out[day] = (Array.isArray(list) ? list : Object.entries(list))
      .filter((x) => Array.isArray(x))
      .map(([s, gr]) => [String(s || "").replace(/\D/g, "").slice(0, 6), groupOf(gr)])
      .filter(([s, gr]) => s && gr)
      .slice(0, 600);
  }
  return out;
}

// Günün grup listesi (Seyhun 2026-11-03): o güne liste yüklenmediyse ve önceki son liste final grupları (Altın, Gümüş, Bronz…)
// ise o geçerli; final listesi kalan günlerde değişmez. Eleme grupları (Mavi, Sarı…) her gün yeniden yüklenir, ertesi güne geçmez.
export function groupsOn(groups, day) {
  if (!groups || !day) return [];
  if (groups[day]) return groups[day];
  const prev = Object.keys(groups).filter((d) => d < day).sort().pop();
  const list = prev ? groups[prev] : null;
  const gs = (Array.isArray(list) ? list : Object.entries(list || {})).map((x) => (Array.isArray(x) ? x[1] : ""));
  return gs.length && gs.every((g) => FINALS[groupOf(g)]) ? list : [];
}

// Günün yeni grup listesi eskisine nasıl yazılır (Seyhun 2026-11-03): birden çok grup varsa liste günün tamamıdır (eskisi
// tümüyle değişir); tek grup varsa ("Mavi grup listesi" ayrı dosya) yalnız o grubun tekneleri yazılır, diğer gruplar kalır.
export function dayGroups(old, list) {
  const add = cleanGroups({ "2000-01-01": list })["2000-01-01"] || [];
  if (new Set(add.map(([, g]) => g)).size !== 1) return add;
  const g = add[0][1];
  const sails = new Set(add.map(([s]) => s));
  const keep = (cleanGroups({ "2000-01-01": old || [] })["2000-01-01"] || []).filter(([s, x]) => x !== g && !sails.has(s));
  return [...keep, ...add];
}

// Sporcunun kategorisi: Kız ("K") ve Junior (Optimist'te belgedeki işaret, ILCA 4'te doğum yılından)
export function catsOf(row, year) {
  const out = [];
  if (row?.sex === "K") out.push("Kız");
  const rule = CAT_RULES.find((r) => r.cls.test(String(row?.cls || "")));
  const b = bornYear(row?.born);
  const cat = rule && b ? rule.cats.find((c) => year - b <= c.age)?.cat || "" : catOf(row?.cls, row?.cat);
  if (cat === "Junior" || cat === "Bambino") out.push(cat);
  return out;
}

// Bir startın puanları: { n, grp, size, done, scores: { yelken: { pts, code } } }
export function startScores(st, entry, members = null) {
  const route = entry?.route || [];
  const legs = entry?.legs || [];
  const fk = route.lastIndexOf("F");
  const pen = entry?.pen || {};
  const fin0 = fk >= 0 ? legs[fk] || [] : [];
  const seen = new Set([...legs.flat(), ...Object.keys(pen)]);
  const group = members && members.length ? members : null;
  const size = Math.max(group ? group.length : seen.size, fin0.length);
  const done = !!st?.fin;
  const scores = {};
  // cezalı (OCS, BFD, DSQ…) finiş sırasından çıkar, arkasındakiler bir sıra öne gelir; puanı grup sayısı + 1 (UFD/BFD/DSQ da)
  const fin = fin0.filter((s) => !pen[s]);
  fin.forEach((s, i) => (scores[s] = { pts: i + 1, code: "" }));
  for (const [s, c] of Object.entries(pen)) scores[s] = { pts: size + 1, code: c };
  if (done) {
    for (const s of new Set([...(group || []), ...seen])) if (!scores[s]) scores[s] = { pts: size + 1, code: seen.has(s) ? "DNF" : "DNC" };
  }
  return { n: st?.n || 0, grp: entry?.grp || "", size, done, scores };
}

// İki sporcuyu karşılaştır (RRS A8): toplam, sonra birincilik/ikincilik… sayısı, sonra son yarıştan geriye
function better(a, b, races) {
  if (a.total !== b.total) return a.total - b.total;
  const pa = races.map((n) => a.sc[n]?.pts).filter((x) => x != null).sort((x, y) => x - y);
  const pb = races.map((n) => b.sc[n]?.pts).filter((x) => x != null).sort((x, y) => x - y);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? Infinity;
    const y = pb[i] ?? Infinity;
    if (x !== y) return x - y;
  }
  for (let i = races.length - 1; i >= 0; i--) {
    const x = a.sc[races[i]]?.pts ?? Infinity;
    const y = b.sc[races[i]]?.pts ?? Infinity;
    if (x !== y) return x - y;
  }
  return String(a.sail).localeCompare(String(b.sail), "tr", { numeric: true });
}

// Geçici genel sıralama, sınıf sınıf: [{ cls, races: [n…], rows: [{ rank, sail, name, club, born, cats, sc: { n: { pts, code, grp } }, total }] }]
// entries: kayıt listesi (sail, name, club, cls, born, sex, cat); groups: cleanGroups; who: kayıt listesinde olmayanlar için ad/kulüp (sonuç PDF'leri)
export function provisional({ starts = [], rounds = {}, entries = [], groups = {}, who = {}, year = new Date().getFullYear() }) {
  const bySail = new Map((entries || []).map((r) => [r.sail, r]));
  const people = new Map();
  for (const st of starts || []) {
    if (st.void || !rounds[st.id]) continue;
    const e = rounds[st.id];
    const day = groupMap(groupsOn(groups, st.day));
    const members = e.grp && Object.keys(day).length ? Object.keys(day).filter((s) => day[s] === e.grp) : null;
    const r = startScores(st, e, members);
    for (const [sail, v] of Object.entries(r.scores)) {
      if (!people.has(sail)) people.set(sail, {});
      const sc = people.get(sail);
      if (!sc[r.n]) sc[r.n] = { ...v, grp: r.grp };
    }
  }
  const out = new Map();
  for (const [sail, sc] of people) {
    const en = bySail.get(sail) || null;
    const cls = en?.cls || "";
    if (!out.has(cls)) out.set(cls, []);
    const w = en || who[sail] || {};
    out.get(cls).push({ sail, name: w.name || "", club: w.club || "", born: bornYear(en?.born) || "", cats: en ? catsOf(en, year) : [], sc, total: Object.values(sc).reduce((t, x) => t + x.pts, 0) });
  }
  return [...out]
    .map(([cls, rows]) => {
      const races = [...new Set(rows.flatMap((r) => Object.keys(r.sc).map(Number)))].sort((a, b) => a - b);
      rows.sort((a, b) => better(a, b, races));
      return { cls, races, rows: rows.map((r, i) => ({ ...r, rank: i + 1 })) };
    })
    .sort((a, b) => b.rows.length - a.rows.length);
}

// Kızlar / Junior süzgeci: sıralamadaki sırası korunur, kendi içinde yeniden numaralanır
export function onlyCat(rows, cat) {
  return (rows || []).filter((r) => !cat || r.cats.includes(cat)).map((r, i) => ({ ...r, place: i + 1 }));
}
