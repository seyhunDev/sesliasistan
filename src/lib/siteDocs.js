// Yarış sitesindeki belgeler (Seyhun 2026-11-03 "siteye yüklendiğinde hemen alıp kullanmamız gerekiyor"): TYF Yelken Ligi
// İlan Tahtası (yelkenligi.tyf.org.tr/home/noticeboard) sezon › ayak › sınıf sekmelerinde PDF listesi (Yüklenme Zamanı + Dosya Adı).
// Aynı ad birden çok kez yüklenir (PROTESTO.pdf), bu yüzden belgenin anahtarı ad + yükleme zamanıdır.
// Türü adından anlaşılır: renk listesi o günün grupları, sporcu listesi katılımcılar, altın/gümüş/bronz listesi final filoları,
// sonuç (geçici/kesin) sonuç listesi, ek talimat (V2, V3…) en yenisi geçerli, gerisi Belgeler'de PDF olarak durur.
// Saf fonksiyonlar (test: scripts/asistan-test/yerel/yaris.mjs "Yarış sitesi belgeleri").

const plain = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[c])
    .replace(/\.pdf$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Türler: kind, ekranda görünen ad. Sıra önemli: ilk eşleşen kazanır ("EK TALİMAT" talimattan, "GEÇİCİ SONUÇ" sonuçtan önce)
export const KINDS = [
  ["groups", "Renk listesi", /\brenk\b|\bgrup listesi\b|\b(mavi|sari|kirmizi|yesil|pembe|turuncu|mor) (grup |sporcu )?liste/],
  ["results", "Sonuçlar", /\bsonuc|\bresults?\b|\bsiralama/],
  ["fleets", "Final grupları", /\baltin\b.*\b(gumus|bronz|liste|lst)\b|\bgumus\b.*\bbronz\b|\bfinal (filo|grup)/],
  ["entries", "Sporcu listesi", /\bsporcu listesi?\b|\bkatilim(ci)? listesi?\b|\bkayit listesi\b|\bentry list\b|\bentries\b/],
  ["amend", "Ek talimat", /\bek (yaris )?talimat|\bdegisiklik\b|\bamendment\b/],
  ["notice", "Yarış talimatı", /\btalimat|\bilani?\b|\bsailing instructions\b|\bnotice of race\b/],
  ["program", "Program", /\bprogram\b|\bschedule\b/],
];
// src: "results" (sitenin Sonuçlar sayfası): adında tür yoksa ("RS Feva 4 YARIS.pdf") sonuç sayılır; ödül formu değil
export function docKind(name, src = "") {
  const p = plain(name);
  const k = KINDS.find(([, , re]) => re.test(p));
  if (k) return k[0];
  return src === "results" && !/\bodul\b/.test(p) ? "results" : "other";
}
// Tek renkli liste ("8.10.2025 MAVİ SPORCU LİSTESİ"): satırlarda grup yoksa adındaki renk
const COLOR_WORDS = [["mavi", "Mavi"], ["sari", "Sarı"], ["kirmizi", "Kırmızı"], ["yesil", "Yeşil"], ["pembe", "Pembe"], ["turuncu", "Turuncu"], ["mor", "Mor"], ["altin", "Altın"], ["gumus", "Gümüş"], ["bronz", "Bronz"]];
export function colorOf(name) {
  const w = plain(name).split(" ");
  const hit = COLOR_WORDS.filter(([k]) => w.includes(k));
  return hit.length === 1 ? hit[0][1] : "";
}
export const kindLabel = (k) => KINDS.find(([x]) => x === k)?.[1] || "Belge";

// Sonuç listesinin durumu: geçici / kesin (adında yoksa "")
export function resultState(name) {
  const p = plain(name);
  return /\bkesin\b|\bfinal results\b|\bofficial\b/.test(p) ? "kesin" : /\bgecici\b|\bprovisional\b/.test(p) ? "gecici" : "";
}

// Ek talimat sürümü: "EK TALİMAT_V3" → 3, yoksa 1
export function version(name) {
  const p = plain(name);
  const m = p.match(/\bv ?(\d{1,3})\b/) || p.match(/\btalimati? (\d{1,3})$/);
  return m ? +m[1] : 1;
}

// Adın içindeki gün ("RENK LİSTESİ-04.11.2026", "04-11-2026", "4.11") → "2026-11-04". Yıl yoksa yüklenme gününün yılı.
export function dayOf(name, uploaded = "") {
  const s = String(name || "");
  const y0 = String(uploaded).slice(0, 4) || String(new Date().getFullYear());
  const m = s.match(/(\d{1,2})[.\-_/](\d{1,2})(?:[.\-_/](\d{2,4}))?/);
  if (!m) return "";
  const d = +m[1];
  const mo = +m[2];
  let y = m[3] ? +m[3] : +y0;
  if (y < 100) y += 2000;
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return "";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Yüklenme zamanı ("03.11.2026 14:05", "2026-11-03 14:05:10") → "2026-11-03T14:05" (Türkiye saati, olduğu gibi)
export function uploadedAt(raw) {
  const s = String(raw || "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4].padStart(2, "0")}:${m[5]}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s+(\d{1,2}):(\d{2})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T${m[4].padStart(2, "0")}:${m[5]}`;
  return "";
}

// Belgenin anahtarı: ad + yüklenme zamanı (Firestore belge kimliği olabilir: yalnız harf, rakam, - _)
export function docKey(name, at) {
  const n = plain(name).replace(/ /g, "-").slice(0, 80);
  return `${String(at || "").replace(/[^0-9]/g, "").slice(0, 12)}_${n}`;
}

// Listeden henüz alınmamışlar (seen: alınmış anahtarlar), eskiden yeniye
export function newDocs(list, seen) {
  const have = new Set(seen || []);
  return (list || [])
    .map((d) => ({ ...d, at: d.at || uploadedAt(d.time), kind: d.kind || docKind(d.name, d.src) }))
    .filter((d) => d.name && d.url && d.at)
    .map((d) => ({ ...d, key: docKey(d.name, d.at) }))
    .filter((d) => !have.has(d.key))
    .sort((a, b) => a.at.localeCompare(b.at));
}

// Ek talimatlardan geçerli olan: en büyük sürüm, eşitse en son yüklenen
export function currentAmend(docs) {
  return (docs || []).filter((d) => (d.kind || docKind(d.name)) === "amend").sort((a, b) => version(a.name) - version(b.name) || String(a.at).localeCompare(String(b.at))).at(-1) || null;
}

// Bildirim yazısı: "1. Ayak Optimist · Renk listesi (4 Kas) geldi"
const MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
export function docNote(race, d) {
  const day = d.kind === "groups" ? dayOf(d.name, d.at) : "";
  const extra = day ? ` (${+day.slice(8)} ${MON[+day.slice(5, 7) - 1]})` : d.kind === "results" && resultState(d.name) ? ` (${resultState(d.name) === "kesin" ? "kesin" : "geçici"})` : d.kind === "amend" ? ` V${version(d.name)}` : "";
  return `${race} · ${kindLabel(d.kind)}${extra} geldi`;
}

// Sezon (Seyhun 2026-11-03 "her zaman bulunduğumuz sezon varsayılan olmalı"): Eylül'den itibaren yeni sezon ("2026-2027")
export function seasonOf(day) {
  const y = +String(day).slice(0, 4);
  const m = +String(day).slice(5, 7);
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
// Sitedeki sezonlardan varsayılan: bugünün sezonu varsa o, yoksa bugünden sonraki ilk, o da yoksa en yenisi
export function pickSeason(list, day) {
  const all = [...new Set((list || []).filter((s) => /^\d{4}-\d{4}$/.test(s)))].sort();
  const now = seasonOf(day);
  return all.includes(now) ? now : all.find((s) => s > now) || all.at(-1) || now;
}

// Program satırları (talimat, ek talimat; lib/server/raceSiteTake.js)
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const loose = (t) =>
  String(t || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-zçğıöşü0-9]/g, "");
export const cleanSchedule = (a) =>
  (Array.isArray(a) ? a : [])
    .filter((x) => DATE.test(x?.date || "") && S(x?.title, 120))
    .map((x) => ({ date: x.date, time: TIME.test(x?.time || "") ? x.time : "", title: S(x.title, 120) }))
    .slice(0, 40);
// Programa yeni satırlar: aynı gün ve aynı başlıklı satır yenisiyle değişir, olmayan eklenir; tarihe göre sıralı
export function mergeSchedule(old, add) {
  const out = cleanSchedule(old);
  for (const x of cleanSchedule(add)) {
    const i = out.findIndex((y) => y.date === x.date && loose(y.title) === loose(x.title));
    if (i > -1) out[i] = x;
    else out.push(x);
  }
  return out.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 40);
}

