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
  ["duyuru", "Yarış", "flag", "YARIŞ"],
  ["sonuc", "Yarış sonucu", "star", "YARIŞ SONUCU"],
  ["antrenman", "Antrenman", "wind", "ANTRENMAN"],
  ["genel", "Duyuru", "bell", "DUYURU"],
  ["kayit", "Kayıt / yelken okulu", "users", "KAYITLAR AÇIK"],
  ["kulup", "Kulüp haberi", "anchor", "KULÜP HABERİ"],
  ["ozel", "Özel gün", "cal", ""],
  ["kutlama", "Kutlama", "cake", "KUTLAMA"],
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
// Kare: profil ızgarası her gönderiyi ortadan 3:4 dikey keserek gösterir; karede sağdan ve soldan 135'er px
// görünmez, yazı ve logo bu yüzden ortadaki 810 px'te kalır (l/r ek kenar). Dikey 4:5'te kesilen yalnız 34 px,
// normal kenar boşluğu (84) yeter.
export const safeOf = (f) =>
  ({ square: { t: 0, b: 0, l: 66, r: 66 }, story: { t: 200, b: 280, l: 0, r: 0 }, reels: { t: 250, b: 440, l: 0, r: 130 } })[f] || { t: 0, b: 0, l: 0, r: 0 };
// Üç boyut birden: gönderi (seçili Kare/Dikey, yoksa Kare), hikâye, reels
export const SET_LABELS = { square: "Gönderi", portrait: "Gönderi", story: "Hikâye", reels: "Reels" };
export const setOf = (f) => [f === "portrait" ? "portrait" : "square", "story", "reels"];

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
  ["al", "Al", "#d0142c", "#7d0a17", "#ffffff"],
];
// Her türün kendi zemin rengi (tür değişince renk de değişir; elle seçilen renk kalır)
export const KIND_THEME = { duyuru: "gece", sonuc: "gun", antrenman: "deniz", genel: "mor", kayit: "turkuaz", kulup: "kum", kutlama: "bordo", ozel: "al", diger: "antrasit" };
export const kindTheme = (k) => KIND_THEME[k] || "deniz";

// Özel günler: hazır şablon (etiket, başlık, alt satır, dilek) ve görselin havası (mood):
// milli kırmızı-beyaz + ay yıldız, anma siyah-gri (kutlama dili yok), dini lacivert-altın, deniz lacivert + bayrak, genel lacivert-sarı.
// date: "AA-GG" ya da yıla göre tarih (hareketli günler). n: yıl dönümü sayısı.
const nthSunday = (y, m, n) => {
  const d = new Date(Date.UTC(y, m - 1, 1));
  const first = 1 + ((7 - d.getUTCDay()) % 7);
  return `${String(m).padStart(2, "0")}-${String(first + 7 * (n - 1)).padStart(2, "0")}`;
};
// Dini bayramların ilk günü (Diyanet takvimiyle karşılaştırılmalı; listede olmayan yılda gösterilmez)
const RAMAZAN = { 2026: "03-20", 2027: "03-09", 2028: "02-26", 2029: "02-14", 2030: "02-04" };
const KURBAN = { 2026: "05-27", 2027: "05-16", 2028: "05-05", 2029: "04-24", 2030: "04-13" };
export const DAYS = [
  { id: "yilbasi", name: "Yılbaşı", date: "01-01", mood: "genel", tag: "YENİ YIL", head: () => "Mutlu Yıllar", sub: (y) => `${y} yılında denizde bol rüzgâr, sağlık ve başarı dileriz.`, wish: () => "İyi yıllar!" },
  { id: "canakkale", name: "18 Mart Çanakkale", date: "03-18", mood: "anma", tag: "18 MART", head: () => "Çanakkale Geçilmez", sub: (y) => `Çanakkale Zaferi'nin ${y - 1915}. yılında tüm şehitlerimizi rahmet ve minnetle anıyoruz.`, wish: () => "" },
  { id: "ramazan", name: "Ramazan Bayramı", date: (y) => RAMAZAN[y], mood: "dini", tag: "RAMAZAN BAYRAMI", head: () => "Ramazan Bayramınız Mübarek Olsun", sub: () => "Bayramın sevdiklerinizle birlikte sağlık ve huzur getirmesini dileriz.", wish: () => "İyi bayramlar!" },
  { id: "23nisan", name: "23 Nisan", date: "04-23", mood: "milli", tag: "23 NİSAN", head: () => "Ulusal Egemenlik ve Çocuk Bayramı", sub: () => "Tüm çocuklarımızın bayramı kutlu olsun.", wish: (y) => `TBMM'nin ${y - 1920}. yılı kutlu olsun!` },
  { id: "anneler", name: "Anneler Günü", date: (y) => nthSunday(y, 5, 2), mood: "genel", tag: "ANNELER GÜNÜ", head: () => "Anneler Günü Kutlu Olsun", sub: () => "Sporcularımızın en büyük destekçisi tüm annelerimize sevgiyle.", wish: () => "" },
  { id: "19mayis", name: "19 Mayıs", date: "05-19", mood: "milli", tag: "19 MAYIS", head: () => "Gençlik ve Spor Bayramımız Kutlu Olsun", sub: () => "Atatürk'ü saygı, minnet ve özlemle anıyoruz.", wish: (y) => `Samsun'a çıkışın ${y - 1919}. yılı kutlu olsun!` },
  { id: "kurban", name: "Kurban Bayramı", date: (y) => KURBAN[y], mood: "dini", tag: "KURBAN BAYRAMI", head: () => "Kurban Bayramınız Mübarek Olsun", sub: () => "Bayramın sevdiklerinizle birlikte sağlık ve huzur getirmesini dileriz.", wish: () => "İyi bayramlar!" },
  { id: "babalar", name: "Babalar Günü", date: (y) => nthSunday(y, 6, 3), mood: "genel", tag: "BABALAR GÜNÜ", head: () => "Babalar Günü Kutlu Olsun", sub: () => "Sporcularımızın yanında olan tüm babalarımıza sevgiyle.", wish: () => "" },
  { id: "kabotaj", name: "1 Temmuz Kabotaj", date: "07-01", mood: "deniz", tag: "1 TEMMUZ", head: () => "Denizcilik ve Kabotaj Bayramı Kutlu Olsun", sub: (y) => `Kabotaj Kanunu'nun ${y - 1926}. yılında denizlerimiz özgür, rüzgârımız bol olsun.`, wish: () => "Bayramımız kutlu olsun!" },
  { id: "15temmuz", name: "15 Temmuz", date: "07-15", mood: "anma", tag: "15 TEMMUZ", head: () => "Demokrasi ve Millî Birlik Günü", sub: () => "15 Temmuz şehitlerimizi rahmetle, gazilerimizi minnetle anıyoruz.", wish: () => "" },
  { id: "30agustos", name: "30 Ağustos", date: "08-30", mood: "milli", tag: "30 AĞUSTOS", head: () => "Zafer Bayramımız Kutlu Olsun", sub: () => "Büyük Zafer'in kahramanlarını saygı ve minnetle anıyoruz.", wish: (y) => `Büyük Zafer'in ${y - 1922}. yılı kutlu olsun!` },
  { id: "29ekim", name: "29 Ekim", date: "10-29", mood: "milli", tag: "29 EKİM", head: () => "Cumhuriyet Bayramımız Kutlu Olsun", sub: () => "", wish: (y) => `Cumhuriyetimizin ${y - 1923}. yılı kutlu olsun!` },
  { id: "10kasim", name: "10 Kasım", date: "11-10", mood: "anma", tag: "10 KASIM", head: () => "Saygı, Minnet ve Özlemle", sub: (y) => `Ulu Önder Mustafa Kemal Atatürk'ü aramızdan ayrılışının ${y - 1938}. yılında saygıyla anıyoruz.`, wish: () => "" },
  { id: "ogretmen", name: "Öğretmenler Günü", date: "11-24", mood: "genel", tag: "ÖĞRETMENLER GÜNÜ", head: () => "Öğretmenler Günü Kutlu Olsun", sub: () => "Bize denizi, rüzgârı ve yelkeni öğreten tüm öğretmen ve antrenörlerimize teşekkürler.", wish: () => "" },
];
export const dayOf = (id) => DAYS.find((d) => d.id === id) || null;
// Bu yıldaki tarihi: "2026-10-29" (bilinmiyorsa "")
export const dayDate = (d, y) => {
  const md = typeof d?.date === "function" ? d.date(y) : d?.date;
  return md ? `${y}-${md}` : "";
};
// Yaklaşan özel günler, en yakını önce: [{ ...gün, year, at: "2026-10-29", left: gün sayısı }]
export function nextDays(today) {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(today || "") ? today : new Date().toISOString().slice(0, 10);
  const y = Number(t.slice(0, 4));
  const ms = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const out = [];
  for (const d of DAYS) {
    const at = [dayDate(d, y), dayDate(d, y + 1)].find((x) => x && x >= t);
    if (at) out.push({ ...d, year: Number(at.slice(0, 4)), at, left: Math.round((ms(at) - ms(t)) / 864e5) });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
// Cümledeki özel gün ("29 Ekim gönderisi hazırla", "Atatürk'ü anma", "kabotaj bayramı"): en yakın tarihli o gün ya da null
const DAY_WORDS = {
  yilbasi: /yılbaşı|yeni yıl/, canakkale: /18 mart|çanakkale/, ramazan: /ramazan|şeker bayram/, "23nisan": /23 nisan|çocuk bayram/, anneler: /anneler günü/,
  "19mayis": /19 mayıs|gençlik ve spor/, kurban: /kurban/, babalar: /babalar günü/, kabotaj: /1 temmuz|kabotaj|denizcilik/, "15temmuz": /15 temmuz|demokrasi/,
  "30agustos": /30 ağustos|zafer bayram/, "29ekim": /29 ekim|cumhuriyet bayram/, "10kasim": /10 kasım|atatürk.{0,12}anma|anma.{0,12}atatürk/, ogretmen: /öğretmenler günü|24 kasım/,
};
export function dayIn(text, today) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  return nextDays(today).find((d) => DAY_WORDS[d.id]?.test(t)) || null;
}
// Görselin havası: özel günde günün havası, diğer türlerde genel
export const moodOf = (p) => (p?.kind === "ozel" && dayOf(p.day)?.mood) || "genel";
const MOOD_THEME = { milli: "al", anma: "antrasit", dini: "gece", deniz: "deniz", genel: "bordo" };
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

// Tasarım: Klasik (yukarıdaki şablonlar) ya da Modern (style "modern"). Modern'de yerleşim türe göre değişir:
// race: yarış duyurusu ve sonucu (dev başlık, arkada dış çizgili büyük yazı, tarih/yer kutusu),
// training: antrenman (eğik, hızlı başlık, bilgi hapları, hız çizgileri),
// school: kayıt / yelken okulu (açık zemin, yuvarlak şekiller, eğik çıkartma etiketi, düğme gibi dilek),
// news: duyuru, kulüp haberi, kutlama, diğer (dergi düzeni: üstte künye, çerçeveli görsel, altında başlık).
// Özel günde Modern de Afiş'i kullanır (günün havası: bayrak, anma, bayram).
export const DESIGNS = [
  ["klasik", "Klasik"],
  ["modern", "Modern"],
];
export const designOf = (style) => (style === "modern" ? "modern" : "klasik");
const MODERN = { duyuru: "race", sonuc: "race", antrenman: "training", kayit: "school", genel: "news", kulup: "news", kutlama: "news", diger: "news" };
export const modernOf = (kind) => MODERN[kind] || null;
export const MODERN_HINT = { race: "Yarış: dev başlık, tarih ve yer kutusu", training: "Antrenman: eğik başlık, bilgi hapları", school: "Yelken okulu: açık zemin, çıkartma etiket", news: "Haber: dergi düzeni, çerçeveli görsel" };

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
    day: dayOf(p.day) ? p.day : "",
    year: Math.max(2000, Math.min(2100, Math.round(Number(p.year)) || new Date().getFullYear())),
    topic: L(p.topic, 1500),
    race: cleanRace(p.race),
    headline: L(p.headline, 90),
    // Başlık kaldırılabilir; başlık ve alt yazı boyutu yüzde (100 = otomatik)
    noHead: !!p.noHead,
    // Üstteki logo ve "Dikili Yelken Spor Kulübü" yazısı kapatılabilir
    noBrand: !!p.noBrand,
    headSize: Math.max(60, Math.min(150, Math.round(Number(p.headSize) / 5) * 5 || 100)),
    subSize: Math.max(80, Math.min(150, Math.round(Number(p.subSize) / 5) * 5 || 100)),
    sub: S(p.sub, 200),
    people: cleanPeople(p.people),
    wish: S(p.wish, 60),
    info: S(p.info, 60),
    classes: S(p.classes, 100),
    meta: p.meta !== false,
    style: p.style === "modern" ? "modern" : styleOf(p.style)[0],
    // "Yarış duyurusu" etiketi artık "Yarış" (eski kayıtlar da)
    tag: S(p.tag, 24),
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
    // Kullanılmış gönderi arşive kaldırılır: listeden çıkar, Arşiv sekmesinde durur
    archived: !!p.archived,
    thumb,
  };
}

// Yeni gönderi Dikey 4:5: akışta en büyük görünen, profil ızgarasında en az kesilen boyut
export const freshPost = (kind = "diger") => cleanPost({ kind, tag: kindOf(kind)[3], theme: kindTheme(kind), format: "square" });

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
// Yarış bağlıyken başlık yarışın adı değil, bizden kısa bir söz (yarışın adı ve yeri açıklamada ve yer · tarih satırında)
export const raceHeadline = (race, kind) => (!race ? "" : kind === "sonuc" ? "Emeğinize Sağlık" : "Yarışa Hazırız");
// Görseldeki yer · tarih satırı: "Foça · 7-11 Ekim 2026"
export const raceMeta = (race) => (race ? [String(race.place || "").split(",")[0].trim(), race.dates].filter(Boolean).join(" · ") : "");

// Özel günün hazır yazıları (yıl dönümü sayısı günün yılına göre)
const dayAuto = (p) => {
  const d = dayOf(p.day);
  if (!d) return { headline: "", sub: "", people: "", wish: "", info: "", classes: "", tag: "ÖZEL GÜN", theme: kindTheme("ozel") };
  return { headline: d.head(p.year), sub: d.sub(p.year), people: "", wish: d.wish(p.year), info: "", classes: "", tag: d.tag, theme: MOOD_THEME[d.mood] };
};
// Yarış ve türden kendiliğinden gelen yazılar
export const autoOf = (p) =>
  p.kind === "ozel"
    ? dayAuto(p)
    : {
        headline: raceHeadline(p.race, p.kind),
        sub: raceSub(p.race, p.kind),
        people: racePeople(p.race),
        wish: raceWish(p.race, p.kind),
        info: raceMeta(p.race),
        classes: raceClasses(p.race).join(", "),
        tag: kindOf(p.kind)[3],
        theme: kindTheme(p.kind),
      };
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
  if (/mesaj/.test(t)) return false;
  if (/([iı]nstagram|[iı]nsta\b|gönderi(?!l)|gönderisi|paylaşım|\bpost)/.test(t) && /(hazırla|oluştur|yap\b|yapalım|yaz\b|yazalım|çıkar|tasarla)/.test(t)) return true;
  // "Yarış için görsel oluştur", "Cumhuriyet yarışının afişini hazırla": Instagram denmese de yarış/duyuru görseli gönderidir
  return /(görsel|afiş|poster)/.test(t) && /(hazırla|oluştur|yap\b|yapalım|çıkar|tasarla|üret)/.test(t) && /(yarış|kupa|için|duyuru|tebrik|bayram|kutlama|29 ekim|10 kasım|19 mayıs|23 nisan|30 ağustos)/.test(t);
};
// Gönderi ekranında görsel isteği: "gün batımında teknelerle görsel üret", "başka resim yap"
export const wantsPostImage = (s) => {
  const t = String(s || "").toLocaleLowerCase("tr-TR");
  return /(görsel|resim|fotoğraf|foto\b|arka ?plan)/.test(t) && /(üret|çiz|oluştur|yap|değiştir|yenile|hazırla|başka|koy)/.test(t);
};

// Asistana söylenen başlık/yazı boyu isteği ("başlığı kaldır", "başlığı biraz küçült", "alt yazıyı büyüt"); yapay zekaya gitmeden uygulanır
export function sizeAsk(text, post = {}) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  // "Logoyu kaldır", "kulüp adını kaldır", "logoyu geri getir"
  if (/logo|kulüp ?(ad|yazı|ism)/.test(t)) {
    if (/geri|göster|olsun|ekle/.test(t) && !/olmasın/.test(t)) return { noBrand: false };
    if (/(kaldır|olmasın|sil|gizle|çıkar|istemiyorum)/.test(t)) return { noBrand: true };
  }
  const head = /başlı(k|ğ)/.test(t);
  const sub = /alt ?(satır|yazı)|açıklama yazı|küçük yazı/.test(t);
  // Yeni başlık yazdırma ("başlığı “Denizdeyiz” yap") yapay zekaya gider
  if ((!head && !sub) || /["“”'‘’]/.test(t) || / yap$| olarak /.test(t.trim())) return null;
  if (head && /(kaldır|olmasın|sil|gizle|çıkar|istemiyorum)/.test(t) && !/geri/.test(t)) return { noHead: true };
  if (head && /(geri (getir|gelsin|ekle|koy|aç)|başlığı göster)/.test(t) && !/(küçük|büyük|küçült|büyüt)/.test(t)) return { noHead: false };
  const down = /(küçült|küçük|ufalt)/.test(t);
  const up = /(büyüt|büyük|iri)/.test(t);
  if (down === up) return null;
  const step = /(bir tık|biraz|azıcık|hafif)/.test(t) ? 10 : 20;
  const k = sub && !head ? "subSize" : "headSize";
  const clamp = (v) => Math.max(k === "subSize" ? 80 : 60, Math.min(150, v));
  const out = { [k]: clamp((post[k] || 100) + (up ? step : -step)) };
  if (k === "headSize") out.noHead = false;
  return out;
}

// Söylenen tasarım isteği → gönderi alanları (Seyhun: "renk, şablon falan söylediklerimi uygulamadaki seçeneklerle eşleştirip
// hazırlasın", 2026-10-09). "mavi, hikâye boyutunda, modern" → { theme: "gece", format: "story", style: "modern" }.
// Yalnız açıkça söylenen alanlar döner; boşsa {}.
const LOOK_THEME = [
  [/turkuaz|camgöbeği/u, "turkuaz"], [/bordo|şarap/u, "bordo"], [/kırmızı|al bayrak|bayrak rengi/u, "al"], [/lacivert|mavi/u, "gece"],
  [/yeşil|deniz rengi/u, "deniz"], [/turuncu|pembe|gün ?batımı|somon/u, "gun"], [/bej|krem|kum|açık renk/u, "kum"], [/ mor(?:[ ,]|u |a | renk)|lila/u, "mor"], [/ gri |siyah|antrasit|koyu renk/u, "antrasit"],
];
export function designFrom(text) {
  const t = ` ${String(text || "").toLocaleLowerCase("tr-TR").replace(/[.,!?;:]/g, " ")} `;
  const out = {};
  const th = LOOK_THEME.find(([re]) => re.test(t));
  if (th) out.theme = th[1];
  if (/hik[aâ]?ye|story/u.test(t)) out.format = "story";
  else if (/reels/u.test(t)) out.format = "reels";
  else if (/ kare /u.test(t) || /kare (boyut|olsun|format)/u.test(t)) out.format = "square";
  else if (/dikey/u.test(t)) out.format = "portrait";
  if (/modern/u.test(t)) out.style = "modern";
  else if (/afiş/u.test(t)) out.style = "afis";
  else if (/klasik/u.test(t)) out.style = "afis";
  else if (/ bant /u.test(t)) out.style = "bant";
  else if (/kart şablon|şablonu kart/u.test(t)) out.style = "kart";
  if (/sonu[çc]|kazandı|derece|birinci oldu|ikinci oldu|üçüncü oldu/u.test(t)) out.kind = "sonuc";
  else if (/kayıt|yelken okulu|yaz okulu/u.test(t)) out.kind = "kayit";
  else if (/kutlama|tebrik/u.test(t)) out.kind = "kutlama";
  // "Yarış duyurusu yap", "kulüp yarış duyurusu olacak", "kulüp haberi olsun": türü ve görseldeki etiketi
  const tg = TAG_ASK.find(([re]) => re.test(t));
  if (tg && FORM.test(t)) {
    if (tg[1]) out.kind = tg[1];
    out.tag = tg[2];
  }
  return out;
}
// [söz, tür (boşsa tür değişmez), görseldeki etiket]
const TAG_ASK = [
  [/kulüp yarış duyuru/u, "duyuru", "KULÜP YARIŞ DUYURUSU"],
  [/yarış duyuru/u, "duyuru", "YARIŞ DUYURUSU"],
  [/kulüp duyuru/u, "", "KULÜP DUYURUSU"],
  [/yarış sonu[çc]/u, "sonuc", "YARIŞ SONUCU"],
  [/kulüp haber/u, "kulup", "KULÜP HABERİ"],
  [/ duyuru/u, "", "DUYURU"],
];
const FORM = /(yap|olsun|olacak|olarak|çevir|değiştir|türü|etiket|şeklinde)/u;
// Tasarım dışında bir yazı isteği de var mı ("daha kısa yaz", "Mete'yi ekle")
export const askBeyondLook = (text) => /(yaz|ekle|kısalt|uzat|kısa|uzun|başlık|açıklama|görsel|fotoğraf|çıkar|tarih|(^|\s)yer(i|ini)?(\s|$)|(^|\s)ad(ı|ını)\s|ism|değiştir(?!.*(renk|şablon|boyut|duyuru|haber|tür|etiket)))/iu.test(text);

// Asistanın değişiklikten sonra söyleyeceği: gerçekten neyin değiştiği ("Değiştirdim: başlık, açıklama.")
const FIELD_NAMES = [["headline", "başlık"], ["sub", "alt satır"], ["info", "yer ve tarih"], ["tag", "etiket"], ["wish", "dilek satırı"], ["people", "sporcu satırları"], ["caption", "açıklama"]];
export function changedText(before, after) {
  const ch = FIELD_NAMES.filter(([k]) => after?.[k] != null && String(after[k] || "").trim() !== String(before?.[k] || "").trim()).map(([, n]) => n);
  return ch.length
    ? `Değiştirdim: ${ch.join(", ")}.`
    : "Gönderide bir şey değişmedi. İstediğini Görseldeki yazılar ya da Açıklama bölümünden elle değiştirmen gerekiyor.";
}
