// Instagram gönderileri: görsel (telefonda canvas ile çizilir) + açıklama (yapay zeka yazar). orgs/{orgId}/posts.
// Hem telefon hem sunucu (yapay zeka cevabını temizlemek için) kullanır; "use client" yok, Firebase yok.
//
// post = {
//   kind (KINDS), topic (kullanıcının anlattığı), race { name, place, dates, count, classes, athletes [{ name, cls }] } | null,
//   headline (görseldeki başlık), sub (alt satır), tag (etiket: YARIŞ, SONUÇ…),
//   people (görselde sporcu satırları: "Ali Yılmaz · Optimist · ilk yarışı", en çok 4 satır),
//   wish (görselde başarı satırı: "Sporcularımıza başarılar!"), meta (görselde yarış yeri, tarihi ve sınıfları), style (STYLES),
//   caption (açıklama), hashtags [#etiket],
//   format "square" 1080x1080 | "portrait" 1080x1350 | "story" 1080x1920 (hikâye), theme (fotoğraf yokken zemin), pos "bottom" | "top", focus 0-100 (fotoğraf kaydırma),
//   hasPhoto (fotoğraf ayrı belgede: orgs/{orgId}/postPhotos/{id}), thumb (listede görünen küçük görsel, ~15 KB)
// }

import { withResults } from "@/lib/raceResults";

// Yarış sayfasındaki "Gönderi hazırla" yarışı buraya bırakır (sessionStorage; ek Firestore okuması olmasın diye)
export const RACE_KEY = "sa-post-race";
// Asistana söylenen cümle ("Foça yarışı için gönderi hazırla"): gönderi ekranı açılınca yapay zekaya konu olarak gider
export const POST_ASK_KEY = "sa-post-ask";

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
  ["story", "Hikâye 9:16", 1080, 1920],
];
// CSS en-boy oranı (önizleme ve liste)
export const aspectOf = (f) => ({ portrait: "4 / 5", story: "9 / 16" })[f] || "1 / 1";
export const formatOf = (f) => FORMATS.find(([x]) => x === f) || FORMATS[0];

// Fotoğraf yokken zemin: [ad, üst renk, alt renk, vurgu]
export const THEMES = [
  ["deniz", "Deniz", "#2f7d6b", "#123c33", "#f2c14e"],
  ["gece", "Gece", "#1d3557", "#0b1726", "#7fd1c3"],
  ["gun", "Gün batımı", "#e76f51", "#7a2e3b", "#ffe8a3"],
  ["kum", "Kum", "#f4ead8", "#d9c6a2", "#1f5a4b"],
];
export const themeOf = (t) => THEMES.find(([x]) => x === t) || THEMES[0];

// Yazı yerleşimi: Klasik (yazı fotoğrafın üstünde), Kart (açık renk kutu içinde), Bant (alt/üstte koyu şerit)
export const STYLES = [
  ["klasik", "Klasik"],
  ["kart", "Kart"],
  ["bant", "Bant"],
];
export const styleOf = (s) => STYLES.find(([x]) => x === s) || STYLES[0];

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
    sub: S(p.sub, 200),
    people: cleanPeople(p.people),
    wish: S(p.wish, 60),
    meta: p.meta !== false,
    style: styleOf(p.style)[0],
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

// Türkçe ilgi eki (ünlü uyumu): Foça → Foça'nın, Çeşme → Çeşme'nin, Bodrum → Bodrum'un, Göcek → Göcek'in
export function genitive(word) {
  const w = String(word || "").trim();
  const v = w.toLocaleLowerCase("tr-TR").match(/[aıoueiöü](?=[^aıoueiöü]*$)/)?.[0];
  if (!v) return w;
  const suf = { a: "ın", ı: "ın", e: "in", i: "in", o: "un", u: "un", ö: "ün", ü: "ün" }[v];
  return `${w}'${/[aıoueiöü]$/i.test(w.toLocaleLowerCase("tr-TR")) ? "n" : ""}${suf}`;
}

// Yarış bağlıysa görseldeki alt satır: 1 sporcu "Sporcumuz Mete Ok", 2 sporcu "Sporcularımız A ve B",
// 3 ve fazlası yalnız "Sporcularımız" (ad ve sayı yok). Yer yarışın ilçesi (yoksa ili).
export function raceSub(race, kind = "duyuru") {
  if (!race) return "";
  const a = race.athletes || [];
  const who = a.length === 1 ? `Sporcumuz ${a[0].name}` : a.length === 2 ? `Sporcularımız ${a[0].name} ve ${a[1].name}` : "Sporcularımız";
  const town = String(race.place || "").split(",")[0].trim();
  const where = town ? `${genitive(town)} rüzgarlı sularında` : "yarışta";
  return kind === "sonuc" ? `${who}, ${where} kulübümüzü başarıyla temsil etti.` : `${who}, ${where} kulübümüzü temsil etmek üzere tüm hazırlıklarını tamamladı.`;
}
// Ad zaten alt satırda geçiyorsa (1-2 sporcu) ayrı sporcu satırı yazılmaz
export const racePeople = (race) => ((race?.athletes?.length || 0) > 2 ? peopleLines(race.athletes) : "");

// Başarı satırı: duyuruda "Sporcumuza / Sporcularımıza başarılar!", sonuçta tebrik
export function raceWish(race, kind = "duyuru") {
  if (!race) return "";
  const one = (race.athletes?.length || race.count || 0) === 1;
  if (kind === "sonuc") return one ? "Sporcumuzu tebrik ederiz!" : "Sporcularımızı tebrik ederiz!";
  return one ? "Sporcumuza başarılar!" : "Sporcularımıza başarılar!";
}

// Görseldeki sınıf etiketleri: talimattaki sınıflar, yoksa sporcuların sınıfları (en çok 4, tekrarsız)
export function raceClasses(race) {
  if (!race) return [];
  const from = race.classes ? race.classes.split(",") : (race.athletes || []).map((a) => a.cls);
  const out = [];
  for (const c of from.map((x) => S(x, 24)).filter(Boolean)) if (!out.some((o) => o.toLocaleLowerCase("tr-TR") === c.toLocaleLowerCase("tr-TR"))) out.push(c);
  return out.slice(0, 4);
}
// Görseldeki yer · tarih satırı: "Foça · 7-11 Ekim 2026"
export const raceMeta = (race) => (race ? [String(race.place || "").split(",")[0].trim(), race.dates].filter(Boolean).join(" · ") : "");

// Yarış ve türden kendiliğinden gelen yazılar
export const autoOf = (p) => ({
  headline: p.race?.name || "",
  sub: raceSub(p.race, p.kind),
  people: racePeople(p.race),
  wish: raceWish(p.race, p.kind),
  tag: kindOf(p.kind)[3],
});
// Yarış, tür ya da sporcular değişince: elle değiştirilmemiş (boş ya da kendiliğinden gelmiş) yazılar yenilenir
export function reauto(prev, next) {
  const a = autoOf(prev);
  const b = autoOf(next);
  const out = { ...next };
  for (const k of Object.keys(b)) if (!prev[k] || prev[k] === a[k]) out[k] = b[k];
  return out;
}

// Yarıştan gönderinin ilk hali: yarış bitmediyse duyuru, bittiyse sonuç
export function postFromRace(r, today) {
  const kind = r?.endDate || r?.startDate ? ((r.endDate || r.startDate) < today ? "sonuc" : "duyuru") : "duyuru";
  const race = raceBrief(r, r?.athletes);
  return cleanPost({ kind, race, ...autoOf({ kind, race }) });
}

// Yarış kaydı + sporcu listesi (kulüp projesi) → gönderiye giden yarış: seçili sporcuların yalnız adı, sınıfı ve sonucu
// data: { athletes: [{ id, studentName, currentClassId }], classes: [{ id, name }] }
export function raceWithAthletes(r, data) {
  const cls = Object.fromEntries((data?.classes || []).map((c) => [c.id, c.name]));
  const byId = new Map((data?.athletes || []).map((a) => [a.id, a]));
  const ids = (r?.athleteIds || []).filter((id) => byId.has(id));
  const list = ids.map((id) => ({ name: byId.get(id).studentName || "", cls: cls[byId.get(id).currentClassId] || "" }));
  return { ...r, athletes: withResults(list, ids, r?.results) };
}

// Ana asistan: "Foça yarışı için Instagram gönderisi hazırla" (her sayfada; sayfa açma değil, gönderi hazırlama)
export const wantsPost = (s) => {
  const t = String(s || "").toLocaleLowerCase("tr-TR");
  return /(instagram|insta\b|gönderi(?!l)|gönderisi|paylaşım|\bpost)/.test(t) && /(hazırla|oluştur|yap\b|yapalım|yaz\b|yazalım|çıkar|tasarla)/.test(t) && !/mesaj/.test(t);
};
// Gönderi ekranında görsel isteği: "gün batımında teknelerle görsel üret", "başka resim yap"
export const wantsPostImage = (s) => {
  const t = String(s || "").toLocaleLowerCase("tr-TR");
  return /(görsel|resim|fotoğraf|foto\b|arka ?plan)/.test(t) && /(üret|çiz|oluştur|yap|değiştir|yenile|hazırla|başka|koy)/.test(t);
};
