// Instagram gönderileri: görsel (telefonda canvas ile çizilir) + açıklama (yapay zeka yazar). orgs/{orgId}/posts.
// Hem telefon hem sunucu (yapay zeka cevabını temizlemek için) kullanır; "use client" yok, Firebase yok.
//
// post = {
//   kind (KINDS), topic (kullanıcının anlattığı), race { name, place, dates, count, classes, athletes [{ name, cls }] } | null,
//   headline (görseldeki başlık), sub (alt satır), tag (etiket: YARIŞ, SONUÇ…),
//   people (görselde sporcu satırları: "Ali Yılmaz · Optimist · ilk yarışı", en çok 4 satır),
//   wish (görselde başarı satırı: "Sporcularımıza başarılar!"), info (görselde yer · tarih), classes (yarışın sınıfları, virgülle; görselde değil, başlıkta geçer), meta (görselde yarış yeri ve tarihi), style (STYLES),
//   caption (açıklama), hashtags [#etiket],
//   format "square" 1080x1080 | "portrait" 1080x1350 | "story" 1080x1920 (hikâye) | "reels" 1080x1920 (reels kapağı), theme (fotoğraf yokken zemin), pos "bottom" | "top", focus 0-100 (fotoğrafı dikey kaydırma), fx 0-100 (yatay kaydırma), zoom 100-250 (fotoğrafı büyütme, %), shade 0-100 (fotoğrafı karartma, yazı okunsun diye),
//   hasPhoto (fotoğraf ayrı belgede: orgs/{orgId}/postPhotos/{id}), thumb (listede görünen küçük görsel, ~15 KB)
// }

import { withResults } from "@/lib/raceResults";

// Yarış sayfasındaki "Gönderi hazırla" yarışı buraya bırakır (sessionStorage; ek Firestore okuması olmasın diye)
export const RACE_KEY = "sa-post-race";
// Asistana söylenen cümle ("Foça yarışı için gönderi hazırla"): gönderi ekranı açılınca yapay zekaya konu olarak gider
export const POST_ASK_KEY = "sa-post-ask";

// [anahtar, ad, ikon, görseldeki etiket]; ekrandaki sıra da bu (yarış türleri önde)
export const KINDS = [
  ["duyuru", "Yarış duyurusu", "flag", "YARIŞ DUYURUSU"],
  ["sonuc", "Yarış sonucu", "star", "YARIŞ SONUCU"],
  ["antrenman", "Antrenman", "wind", "ANTRENMAN"],
  ["genel", "Duyuru", "bell", "DUYURU"],
  ["kayit", "Kayıt / yelken okulu", "users", "KAYITLAR AÇIK"],
  ["kulup", "Kulüp haberi", "anchor", "KULÜP HABERİ"],
  ["kutlama", "Kutlama / özel gün", "cake", "KUTLAMA"],
  ["diger", "Diğer", "tag", ""],
];
// Yarışa bağlı türler (ekranda yarış adımı bunlarda öne çıkar)
export const RACE_KINDS = ["duyuru", "sonuc"];
export const kindOf = (k) => KINDS.find(([x]) => x === k) || KINDS[KINDS.length - 1];

export const FORMATS = [
  ["square", "Kare 1:1", 1080, 1080],
  ["portrait", "Dikey 4:5", 1080, 1350],
  ["story", "Hikâye 9:16", 1080, 1920],
  ["reels", "Reels 9:16", 1080, 1920],
];
// CSS en-boy oranı (önizleme ve liste)
export const aspectOf = (f) => ({ portrait: "4 / 5", story: "9 / 16", reels: "9 / 16" })[f] || "1 / 1";
export const formatOf = (f) => FORMATS.find(([x]) => x === f) || FORMATS[0];
export const tallOf = (f) => f === "story" || f === "reels";
// Instagram'ın kendi yazılarının/düğmelerinin kapladığı kenarlar (px): yazı ve logo bunların içinde kalır.
// Hikâye: üstte profil satırı, altta yanıt kutusu. Reels: profil ızgarasında orta 3:4 kırpılır (üst/alt 240),
// altta kullanıcı adı + açıklama, sağda beğen/yorum düğmeleri.
export const safeOf = (f) => ({ story: { t: 200, b: 280, r: 0 }, reels: { t: 250, b: 440, r: 130 } })[f] || { t: 0, b: 0, r: 0 };
// Üç boyut birden: gönderi (seçili Kare/Dikey, yoksa Dikey), hikâye, reels
export const SET_LABELS = { square: "Gönderi", portrait: "Gönderi", story: "Hikâye", reels: "Reels" };
export const setOf = (f) => [f === "square" ? "square" : "portrait", "story", "reels"];

// Fotoğraf yokken zemin: [ad, üst renk, alt renk, vurgu]; yumuşak, az doygun tonlar
export const THEMES = [
  ["deniz", "Deniz", "#5e9488", "#2b544c", "#f1d9a7"],
  ["gece", "Gece", "#506a8a", "#1f2f45", "#bfe0d8"],
  ["gun", "Gün batımı", "#d48b7a", "#8a4b55", "#fde9cf"],
  ["kum", "Kum", "#f5eee2", "#e3d4bb", "#2f6556"],
  ["mor", "Mor", "#8a80b3", "#433a68", "#f3d9e2"],
  ["turkuaz", "Turkuaz", "#5ea6a2", "#285f66", "#fbecc4"],
  ["bordo", "Bordo", "#b07077", "#5a2b37", "#f6e2c6"],
  ["antrasit", "Antrasit", "#69727d", "#2a3038", "#ecd8ad"],
];
// Her türün kendi zemin rengi (tür değişince renk de değişir; elle seçilen renk kalır)
export const KIND_THEME = { duyuru: "deniz", sonuc: "gun", antrenman: "gece", genel: "mor", kayit: "turkuaz", kulup: "kum", kutlama: "bordo", diger: "antrasit" };
export const kindTheme = (k) => KIND_THEME[k] || "deniz";
export const themeOf = (t) => THEMES.find(([x]) => x === t) || THEMES[0];

// Yazı yerleşimi: Afiş (üstte logo + kulüp adı, büyük başlık, eğik etiket; varsayılan), Klasik (yazı fotoğrafın üstünde),
// Kart (açık renk kutu içinde), Bant (alt/üstte koyu şerit)
export const STYLES = [
  ["afis", "Afiş"],
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
    info: S(p.info, 60),
    classes: S(p.classes, 100),
    meta: p.meta !== false,
    style: styleOf(p.style)[0],
    tag: S(p.tag, 18),
    caption: L(p.caption, 2200),
    hashtags: cleanTags(p.hashtags),
    format: formatOf(p.format)[0],
    theme: themeOf(p.theme)[0],
    pos: p.pos === "top" ? "top" : "bottom",
    focus: Math.max(0, Math.min(100, Math.round(Number(p.focus ?? 50)))),
    fx: Math.max(0, Math.min(100, Math.round(Number(p.fx ?? 50)))),
    zoom: Math.max(100, Math.min(250, Math.round(Number(p.zoom ?? 100)) || 100)),
    shade: Math.max(0, Math.min(100, Math.round(Number(p.shade ?? 55)))),
    hasPhoto: !!p.hasPhoto,
    thumb,
  };
}

export const freshPost = (kind = "diger") => cleanPost({ kind, tag: kindOf(kind)[3], theme: kindTheme(kind) });

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
// Yarış bağlıyken görselde ayrı sporcu satırı yok: 1-2 sporcunun adı alt satırda geçer, 3 ve fazlasının adları yalnız açıklamada
export const racePeople = () => "";
// Görselde en çok 2 sporcu adı: daha çok satır varsa görselde ad yazılmaz (adlar açıklamaya gider)
export const imagePeople = (v) => {
  const l = cleanPeople(v);
  return l.split("\n").filter(Boolean).length > 2 ? "" : l;
};

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
// Başlıktaki sınıf adları: "ILCA 4, ILCA 6" → "ILCA"; "Optimist, ILCA 4" → "Optimist ve ILCA" (en çok 3)
export function raceClassNames(race) {
  const out = [];
  for (const c of raceClasses(race)) {
    const b = c.split(/\s+/)[0];
    if (b && !out.some((o) => o.toLocaleLowerCase("tr-TR") === b.toLocaleLowerCase("tr-TR"))) out.push(b);
  }
  return out.slice(0, 3);
}
const andTr = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} ve ${a[a.length - 1]}` : a[0] || "");
// Başlıkta her zaman sınıf geçer: "TYF Ligi Başlıyor" → "ILCA TYF Ligi Başlıyor"; sınıf zaten yazılıysa dokunulmaz
export function withClass(headline, race) {
  const h = String(headline || "").trim();
  const names = raceClassNames(race);
  if (!h || !names.length) return h;
  const low = h.toLocaleLowerCase("tr-TR");
  if (names.some((n) => low.includes(n.toLocaleLowerCase("tr-TR")))) return h;
  return `${andTr(names)} ${h}`.slice(0, 90);
}
export const raceHeadline = (race) => withClass(race?.name || "", race);
// Görseldeki yer · tarih satırı: "Foça · 7-11 Ekim 2026"
export const raceMeta = (race) => (race ? [String(race.place || "").split(",")[0].trim(), race.dates].filter(Boolean).join(" · ") : "");

// Yarış ve türden kendiliğinden gelen yazılar
export const autoOf = (p) => ({
  headline: raceHeadline(p.race),
  sub: raceSub(p.race, p.kind),
  people: racePeople(p.race),
  wish: raceWish(p.race, p.kind),
  info: raceMeta(p.race),
  classes: raceClasses(p.race).join(", "),
  tag: kindOf(p.kind)[3],
  theme: kindTheme(p.kind),
});
// Görseldeki sınıf etiketleri (düzenlenen alandan; en çok 4)
export const classList = (v) => String(v || "").split(",").map((x) => S(x, 24)).filter(Boolean).slice(0, 4);
// Eski kayıtta yer · tarih ve sınıf alanı yoktu: yarıştan doldurulur
export const withInfo = (p) => (p.race && !p.info && !p.classes ? { ...p, info: raceMeta(p.race), classes: raceClasses(p.race).join(", ") } : p);
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
