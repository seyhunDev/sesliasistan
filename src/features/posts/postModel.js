// Instagram gönderileri: görsel (telefonda canvas ile çizilir) + açıklama (yapay zeka yazar). orgs/{orgId}/posts.
// Hem telefon hem sunucu (yapay zeka cevabını temizlemek için) kullanır; "use client" yok, Firebase yok.
//
// post = {
//   kind (KINDS), topic (kullanıcının anlattığı), race { name, place, dates, count, classes, athletes [{ name, cls }] } | null,
//   headline (görseldeki başlık), sub (alt satır), tag (etiket: YARIŞ, SONUÇ…),
//   people (görselde sporcu satırları: "Ali Yılmaz · Optimist · ilk yarışı", en çok 4 satır),
//   caption (açıklama), hashtags [#etiket],
//   format "square" 1080x1080 | "portrait" 1080x1350, theme (fotoğraf yokken zemin), pos "bottom" | "top", focus 0-100 (fotoğraf kaydırma),
//   hasPhoto (fotoğraf ayrı belgede: orgs/{orgId}/postPhotos/{id}), thumb (listede görünen küçük görsel, ~15 KB)
// }

// Yarış sayfasındaki "Gönderi hazırla" yarışı buraya bırakır (sessionStorage; ek Firestore okuması olmasın diye)
export const RACE_KEY = "sa-post-race";

export const KINDS = [
  ["duyuru", "Yarış duyurusu", "flag", "YARIŞ"],
  ["sonuc", "Yarış sonucu", "star", "SONUÇ"],
  ["antrenman", "Antrenman", "anchor", "ANTRENMAN"],
  ["kulup", "Kulüp haberi", "users", "KULÜP"],
  ["diger", "Diğer", "tag", ""],
];
export const kindOf = (k) => KINDS.find(([x]) => x === k) || KINDS[KINDS.length - 1];

export const FORMATS = [
  ["square", "Kare 1:1", 1080, 1080],
  ["portrait", "Dikey 4:5", 1080, 1350],
];
export const formatOf = (f) => FORMATS.find(([x]) => x === f) || FORMATS[0];

// Fotoğraf yokken zemin: [ad, üst renk, alt renk, vurgu]
export const THEMES = [
  ["deniz", "Deniz", "#2f7d6b", "#123c33", "#f2c14e"],
  ["gece", "Gece", "#1d3557", "#0b1726", "#7fd1c3"],
  ["gun", "Gün batımı", "#e76f51", "#7a2e3b", "#ffe8a3"],
  ["kum", "Kum", "#f4ead8", "#d9c6a2", "#1f5a4b"],
];
export const themeOf = (t) => THEMES.find(([x]) => x === t) || THEMES[0];

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const L = (v, n) => String(v ?? "").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, n);

// "#Dikili Yelken", "yelken" → "#dikiliyelken", "#yelken"; en çok 15, tekrarsız
export function cleanTags(v) {
  const list = Array.isArray(v) ? v : String(v ?? "").split(/[\s,]+/);
  const out = [];
  for (const x of list) {
    const t = String(x ?? "").replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    if (t.length < 2) continue;
    const tag = `#${t.slice(0, 40)}`;
    if (!out.some((o) => o.toLocaleLowerCase("tr-TR") === tag.toLocaleLowerCase("tr-TR"))) out.push(tag);
    if (out.length >= 15) break;
  }
  return out;
}

const cleanAthletes = (a) =>
  (Array.isArray(a) ? a : [])
    .map((x) => ({ name: S(x?.name, 60), cls: S(x?.cls, 30), ...(S(x?.res, 30) ? { res: S(x.res, 30) } : {}) }))
    .filter((x) => x.name)
    .slice(0, 20);

export function cleanRace(r) {
  if (!r || typeof r !== "object" || !S(r.name, 100)) return null;
  const athletes = cleanAthletes(r.athletes);
  return {
    name: S(r.name, 100),
    place: S(r.place, 80),
    dates: S(r.dates, 60),
    count: Math.max(athletes.length, Math.min(200, Math.round(Number(r.count) || 0))),
    classes: S(r.classes, 80),
    ...(athletes.length ? { athletes } : {}),
  };
}

// Görseldeki sporcu satırları: en çok 4 satır, her biri 60 karakter
export const cleanPeople = (v) =>
  String(v ?? "")
    .split("\n")
    .map((l) => S(l, 60))
    .filter(Boolean)
    .slice(0, 4)
    .join("\n");

// Yarışın sporcularından görsel satırları: az kişiyse "Ad · sınıf", kalabalıksa adlar yan yana
export function peopleLines(athletes = []) {
  if (!athletes.length) return "";
  if (athletes.length <= 4) return athletes.map((a) => [a.name, a.cls, a.res].filter(Boolean).join(" · ")).join("\n");
  const first = (n) => n.split(" ")[0];
  return cleanPeople(`${athletes.length} sporcumuz yarışta\n${athletes.map((a) => first(a.name)).join(", ")}`);
}

export function cleanPost(p = {}) {
  const thumb = typeof p.thumb === "string" && p.thumb.startsWith("data:image/") && p.thumb.length < 60_000 ? p.thumb : "";
  return {
    kind: KINDS.some(([k]) => k === p.kind) ? p.kind : "diger",
    topic: L(p.topic, 1500),
    race: cleanRace(p.race),
    headline: L(p.headline, 90),
    sub: S(p.sub, 90),
    people: cleanPeople(p.people),
    tag: S(p.tag, 18),
    caption: L(p.caption, 2200),
    hashtags: cleanTags(p.hashtags),
    format: formatOf(p.format)[0],
    theme: themeOf(p.theme)[0],
    pos: p.pos === "top" ? "top" : "bottom",
    focus: Math.max(0, Math.min(100, Math.round(Number(p.focus ?? 50)))),
    hasPhoto: !!p.hasPhoto,
    thumb,
  };
}

export const freshPost = (kind = "diger") => cleanPost({ kind, tag: kindOf(kind)[3] });

// Instagram'a yapıştırılacak metin: açıklama + boş satır + etiketler
export const fullCaption = (p) => [p.caption.trim(), p.hashtags.join(" ")].filter(Boolean).join("\n\n");

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const ymd = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || "") ? s.split("-").map(Number) : null);
// "2026-10-07", "2026-10-11" → "7-11 Ekim 2026"
export function dateRange(a, b) {
  const x = ymd(a);
  const y = ymd(b) || x;
  if (!x) return "";
  if (x[0] !== y[0]) return `${x[2]} ${MONTHS[x[1] - 1]} ${x[0]}-${y[2]} ${MONTHS[y[1] - 1]} ${y[0]}`;
  if (x[1] !== y[1]) return `${x[2]} ${MONTHS[x[1] - 1]}-${y[2]} ${MONTHS[y[1] - 1]} ${y[0]}`;
  if (x[2] === y[2]) return `${x[2]} ${MONTHS[x[1] - 1]} ${x[0]}`;
  return `${x[2]}-${y[2]} ${MONTHS[y[1] - 1]} ${y[0]}`;
}

// Yarış kaydından gönderiye giden kısa bilgi (sporcu adı ya da kişisel bilgi yok; yalnız sayı)
// athletes: [{ name, cls }] (yarış sayfasındaki seçili sporcular; yalnız ad ve sınıf)
export const raceBrief = (r, athletes) =>
  cleanRace({
    athletes,
    name: r?.name,
    place: [r?.district, r?.city].filter(Boolean).join(", "),
    dates: dateRange(r?.startDate, r?.endDate),
    count: r?.athleteIds?.length || 0,
    classes: (r?.notice?.classes || []).filter((c) => typeof c === "string").join(", "),
  });

// Yarıştan gönderinin ilk hali: yarış bitmediyse duyuru, bittiyse sonuç
export function postFromRace(r, today) {
  const kind = r?.endDate || r?.startDate ? ((r.endDate || r.startDate) < today ? "sonuc" : "duyuru") : "duyuru";
  const race = raceBrief(r, r?.athletes);
  return cleanPost({ kind, tag: kindOf(kind)[3], race, people: peopleLines(race?.athletes), headline: race?.name || "", sub: [r?.district, race?.dates.replace(/ \d{4}$/, "")].filter(Boolean).join(" · ") });
}
