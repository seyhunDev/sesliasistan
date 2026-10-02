// Asistanla kişi ekleme (yalnız ana hesap): "Kişi ekle: Ayşe Yılmaz, eşim, 0532 123 45 67",
// "Annem Fatma Yıldız'ı aileye ekle, doğum günü 12 Mart", "Ali Kaya'yı çalışan olarak ekle, antrenör".
// Saf fonksiyonlar: cümleyi tanıma, alanları çıkarma (yapay zeka yoksa ve sorulara verilen cevaplarda),
// eksik/hatalı alanı sorma, mükerrer kişi bulma, özet. Kaydetme ve hesap açma AssistantSheet'te, onaydan sonra.
import { KINDS, KIND_LABEL, RELATIONS, kindOf } from "@/lib/kinds";

const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const clean = (s) => lower(s).replace(/[.,!?;:]+/g, " ").replace(/\s+/g, " ").trim();
const TR = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
// Karşılaştırma için: küçük harf, Türkçe harfler sadeleşir ("Şükrü" = "sukru")
export const fold = (s) => lower(s).replace(/[çğıöşü]/g, (c) => TR[c]).normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const capWords = (s) => String(s || "").trim().replace(/\s+/g, " ").split(" ").map((w) => (w ? w[0].toLocaleUpperCase("tr-TR") + w.slice(1) : w)).join(" ");

// ---- Cümle kişi ekleme isteği mi? ----
const VERB = "(?:ekle\\S*|kaydet\\S*|tanımla\\S*|oluştur\\S*)";
const WANT = [
  new RegExp(`(^|\\s)(yeni\\s+)?(kişi|aile bireyi|aile üyesi|çalışan|personel|veli)\\s+${VERB}`), // "kişi ekle: …", "yeni çalışan ekle"
  new RegExp(`(^|\\s)yeni\\s+(kişi|aile bireyi|aile üyesi|çalışan|personel|veli|öğrenci)(\\s|$)`), // "yeni kişi: …"
  new RegExp(`(^|\\s)(kişilere|kişi listesine|rehbere|aileye|ailemize|aile listesine|çalışanlara|ekibe|velilere)\\s+${VERB}`), // "Ali'yi aileye ekle"
  new RegExp(`(^|\\s)(aile bireyi|aile üyesi|çalışan|personel|veli|öğrenci|sporcu|antrenör)\\s+olarak\\s+(kişilere\\s+|rehbere\\s+)?${VERB}`), // "çalışan olarak ekle"
];
export function wantsPerson(text) {
  const t = clean(text);
  if (!t || /\?\s*$/.test(String(text).trim()) || /(nasıl|nereden|ne zaman|kimler)/.test(t)) return false;
  if (/(yarış|regat|listeye|alışveriş|gruba|sohbete|göreve|plana|nota)/.test(t)) return false; // başka işler
  return WANT.some((re) => re.test(t));
}

// ---- Alanlar ----
const KIND_WORDS = [
  ["family", /(^|\s)(aile\S*|eşim|eşimi|karım\S*|kocam\S*|annem\S*|babam\S*|kardeşim\S*|oğlum\S*|kızım\S*|çocuğum\S*|teyzem\S*|halam\S*|amcam\S*|dayım\S*|kuzenim\S*|yeğenim\S*|ablam\S*|ağabeyim\S*|abim\S*|dedem\S*|ninem\S*|babaannem\S*|anneannem\S*|eniştem\S*|yengem\S*|akrabam\S*)(?=\s|$)/],
  ["parent", /(^|\s)(veli\S*)(?=\s|$)/],
  ["student", /(^|\s)(öğrenci\S*)(?=\s|$)/],
  ["athlete", /(^|\s)(sporcu\S*)(?=\s|$)/],
  ["staff", /(^|\s)(çalışan\S*|personel\S*|ekibe|ekip\S*|antrenör\S*|eğitmen\S*|muhasebe\S*|sekreter\S*|kaptan\S*)(?=\s|$)/],
  ["other", /(^|\s)(diğer)(?=\s|$)/],
];
const REL_WORDS = [
  ["Eş", /(^|\s)(eş|eşim\S*|karım\S*|kocam\S*|hanımım\S*)(?=\s|$)/],
  ["Anne", /(^|\s)(anne|annem\S*)(?=\s|$)/],
  ["Baba", /(^|\s)(baba|babam\S*)(?=\s|$)/],
  ["Kardeş", /(^|\s)(kardeş\S*|ablam\S*|abla|ağabey\S*|abim\S*)(?=\s|$)/],
  ["Çocuk", /(^|\s)(çocuk\S*|oğlum\S*|oğul|kızım\S*)(?=\s|$)/],
  ["Akraba", /(^|\s)(akraba\S*|teyze\S*|hala|halam\S*|amca\S*|dayı\S*|kuzen\S*|yeğen\S*|dede\S*|nine\S*|babaanne\S*|anneanne\S*|enişte\S*|yenge\S*)(?=\s|$)/],
  ["Diğer", /(^|\s)(diğer)(?=\s|$)/],
];
const TITLE_WORDS = [["Antrenör", /antrenör/], ["Eğitmen", /eğitmen/], ["Muhasebe", /muhasebe/], ["Sekreter", /sekreter/], ["Kaptan", /kaptan/], ["Bakım", /(^|\s)bakım/], ["Temizlik", /temizlik/]];

export const kindIn = (text) => KIND_WORDS.find(([, re]) => re.test(clean(text)))?.[0] || "";
export const relationIn = (text) => REL_WORDS.find(([, re]) => re.test(clean(text)))?.[0] || "";
export function titleIn(text) {
  const t = clean(text);
  const m = /(?:unvanı|görevi|işi)\s+([\p{L} ]{2,30}?)(?:\s+(?:olsun|olarak))?$/u.exec(t);
  if (m) return capWords(m[1]);
  return TITLE_WORDS.find(([, re]) => re.test(t))?.[0] || "";
}

// E-posta: "ali@gmail.com" ya da sesle "ali et gmail nokta com"
export function emailIn(text) {
  let t = lower(text).replace(/\s+(et|at)\s+(?=[a-z0-9-]+\s*(nokta|\.)\s*[a-z])/g, "@").replace(/\s*(nokta)\s*(?=[a-z]{2,6}(\s|$|[.,]))/g, ".");
  t = t.replace(/\s*@\s*/g, "@");
  const m = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.exec(t);
  return m ? m[0].replace(/\.$/, "") : "";
}
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || ""));

// Telefon: rakamlar (boşluk/tire olabilir). Türkiye numarası 0 ile başlayan 11 hane olarak saklanır: "0532 123 45 67"
export function phoneDigits(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("0090")) d = d.slice(4);
  else if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && !d.startsWith("0")) d = `0${d}`;
  return d;
}
export const validPhone = (raw) => /^0[2-5]\d{9}$/.test(phoneDigits(raw));
export function formatPhone(raw) {
  const d = phoneDigits(raw);
  return validPhone(d) ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}` : String(raw || "").trim();
}
// Cümledeki telefon numarası (tarihler önce çıkarılmış metinden); bulunamazsa ""
export function phoneIn(text) {
  const runs = String(text || "").match(/\+?\d[\d\s()-]{6,18}\d/g) || [];
  const hit = runs.map((r) => r.trim()).find((r) => r.replace(/\D/g, "").length >= 7);
  if (hit) return hit;
  // "telefon 0532 12": kısa ama söylenmiş numara (hatalı diye sorulsun)
  return /(?:telefon\S*|numara\S*|tel)\s*:?\s*(\+?\d[\d\s-]*\d|\d)/iu.exec(String(text || ""))?.[1]?.trim() || "";
}

// Doğum günü: "12 Mart 1985", "12.03.1985", "12 Mart"
const MONTHS = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
const ASCII = ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"];
const DATE_NAME = new RegExp(`(\\d{1,2})\\s*(${[...MONTHS, ...ASCII].join("|")})\\S*(?:\\s+(\\d{4}))?`, "u");
const DATE_NUM = /(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?/;
export function birthIn(text) {
  const t = lower(text);
  const n = DATE_NAME.exec(t);
  const m = n || DATE_NUM.exec(t);
  if (!m) return null;
  const k = n ? (MONTHS.indexOf(n[2]) >= 0 ? MONTHS.indexOf(n[2]) : ASCII.indexOf(n[2])) + 1 : +m[2];
  return { day: +m[1], month: k, year: m[3] ? +m[3] : null, raw: m[0] };
}
export function validBirth(b, todayYear = new Date().getFullYear()) {
  if (!b) return true;
  const days = new Date(2024, b.month, 0).getDate(); // artık yıl: 29 Şubat geçerli
  return b.month >= 1 && b.month <= 12 && b.day >= 1 && b.day <= days && (!b.year || (b.year >= 1900 && b.year <= todayYear));
}
export const birthIso = (b) => (b?.year ? `${b.year}-${String(b.month).padStart(2, "0")}-${String(b.day).padStart(2, "0")}` : "");

// Ad: "kişi ekle: Ayşe Yılmaz, …", "Fatma Yıldız'ı aileye ekle", büyük harfle başlayan kelimeler
const NOT_NAME = new Set(fold("kişi kişiyi yeni ekle kaydet aile aileye bireyi üyesi çalışan çalışanlara personel veli öğrenci sporcu antrenör eğitmen olarak rehbere kişilere ekibe doğum günü telefon telefonu numarası e posta mail eşim annem babam kardeşim oğlum kızım çocuğum teyzem halam amcam dayım kuzenim yeğenim ablam abim dedem ninem karım kocam lütfen bir de da ve ile adı soyadı unvanı görevi ocak şubat mart nisan mayıs haziran temmuz ağustos eylül ekim kasım aralık").split(" "));
const isNameWord = (w) => /^\p{Lu}[\p{L}]+$/u.test(w) && !NOT_NAME.has(fold(w));
export function nameIn(text) {
  const s = String(text || "").trim();
  // 1) "kişi ekle: Ad Soyad, …"
  const colon = /(?:ekle|kaydet|kişi|bireyi|çalışan|veli)\S*\s*:\s*([^,;\n]+)/iu.exec(s);
  const fromColon = colon && colon[1].replace(/\d.*$/, "").trim().split(/\s+/).filter((w) => /^[\p{L}'’-]+$/u.test(w) && !NOT_NAME.has(fold(w))).slice(0, 4);
  if (fromColon?.length) return capWords(fromColon.join(" ").replace(/['’].*$/u, ""));
  // 2) Ek almış ad: "Fatma Yıldız'ı", "Ali'yi", "Ege'yi"
  const acc = /((?:\p{Lu}[\p{L}]+\s+){0,3}\p{Lu}[\p{L}]+)['’](?:y?[ıiuü]|n[ıiuü])(?=[\s,.]|$)/u.exec(s);
  if (acc) {
    const words = acc[1].split(/\s+/).filter(isNameWord);
    if (words.length) return words.join(" ");
  }
  // 3) Büyük harfle başlayan en uzun kelime dizisi (cümle başındaki komut kelimesi sayılmaz)
  let best = [];
  let cur = [];
  for (const w of s.replace(/[,.;:!?]/g, " ").split(/\s+/)) {
    if (isNameWord(w)) cur.push(w);
    else cur = [];
    if (cur.length > best.length) best = [...cur];
  }
  return best.slice(0, 4).join(" ");
}

// Cümleden bulunan alanlar (boş olanlar yazılmaz). Yapay zekaya ulaşılamazsa ve düzeltmelerde kullanılır.
export function parsePerson(text) {
  const s = String(text || "");
  const out = {};
  const b = birthIn(s);
  const noDate = b ? s.replace(new RegExp(b.raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ") : s;
  if (b && /doğum|doğdu|dogum/i.test(s)) out.birth = { day: b.day, month: b.month, year: b.year };
  const email = emailIn(noDate);
  if (email) out.email = email;
  const phone = phoneIn(noDate.replace(email, " "));
  if (phone) out.phone = phone;
  const kind = kindIn(s);
  if (kind) out.kind = kind;
  const relation = relationIn(s);
  if (relation) {
    out.relation = relation;
    if (!out.kind) out.kind = "family";
  }
  if ((out.kind || "staff") === "staff") {
    const title = titleIn(s);
    if (title) out.title = title;
  }
  const name = nameIn(noDate);
  if (name) out.name = name;
  return out;
}

// Yapay zekanın döndürdüğü alanları taslağa çevirir (geçersizler atılır, kontrol yine burada)
export function fromAi(r = {}) {
  const out = {};
  if (r.name) out.name = capWords(String(r.name).replace(/[^\p{L} .'-]/gu, "").slice(0, 40));
  if (KINDS.includes(r.kind)) out.kind = r.kind;
  if (RELATIONS.includes(r.relation)) out.relation = r.relation;
  if (r.title) out.title = String(r.title).trim().slice(0, 40);
  if (r.phone) out.phone = String(r.phone).trim();
  if (r.email) out.email = lower(r.email).trim();
  if (r.birthMonth && r.birthDay) out.birth = { month: +r.birthMonth, day: +r.birthDay, year: r.birthYear ? +r.birthYear : null };
  if (out.relation && !out.kind) out.kind = "family";
  return out;
}

// ---- Eksik / hatalı alan: sırayla tek soru ----
export const KIND_ASK = "Hangi gruba ekleyeyim: çalışan, aile bireyi, sporcu, öğrenci, veli ya da diğer?";
export function nextQuestion(d) {
  if (!d.name) return { field: "name", ask: "Kişinin adı ve soyadı ne?" };
  if (d.name.split(" ").length < 2 && !d.noSurname) return { field: "surname", ask: `${d.name} için soyadını da söyler misin? Soyadı yoksa “yok” de.` };
  if (!d.kind) return { field: "kind", ask: KIND_ASK };
  if (d.kind === "family" && !d.relation) return { field: "relation", ask: "Yakınlığı ne: eş, çocuk, anne, baba, kardeş, akraba ya da diğer?" };
  if (d.phone && !validPhone(d.phone)) return { field: "phone", ask: `Telefon numarası eksik ya da hatalı görünüyor (${d.phone}). Doğrusunu söyler misin? İstemiyorsan “telefon yok” de.` };
  if (d.email && !validEmail(d.email)) return { field: "email", ask: `E-posta adresi hatalı görünüyor (${d.email}). Doğrusunu söyler misin? İstemiyorsan “e-posta yok” de.` };
  if (d.birth && !validBirth(d.birth)) return { field: "birth", ask: "Doğum günü tarihini anlayamadım. Gün, ay ve varsa yılı söyler misin? İstemiyorsan “doğum günü yok” de." };
  return null;
}

const NONE = /^(yok|bilmiyorum|bilinmiyor|boş|geç|gerek yok|olmasın|istemiyorum|atla)/;
// Sorulan alana verilen cevap ya da "telefonu … yap" gibi düzeltme: taslağın yeni hâli
export function applyAnswer(d, text, field = "") {
  const t = clean(text);
  const next = { ...d };
  // "telefonu sil", "e-posta yok", "doğum günü yok"
  const drop = (re) => re.test(t) && /(sil|kaldır|yok|olmasın|boş|çıkar)/.test(t);
  if (drop(/telefon/)) delete next.phone;
  if (drop(/(e.?posta|mail)/)) delete next.email;
  if (drop(/doğum/)) delete next.birth;
  if (field === "surname" && NONE.test(t)) return { ...next, noSurname: true };
  if (["phone", "email", "birth"].includes(field) && NONE.test(t)) {
    delete next[field];
    return next;
  }
  const p = parsePerson(text);
  if (field === "name" || field === "surname") {
    const words = String(text).replace(/[^\p{L}\s'’-]/gu, " ").trim().split(/\s+/).filter((w) => w && !NOT_NAME.has(fold(w)));
    if (words.length) next.name = field === "surname" && words.length === 1 ? `${d.name} ${capWords(words[0])}` : capWords(words.slice(0, 4).join(" "));
    return next;
  }
  if (field === "kind") {
    const k = kindIn(t) || (/aile/.test(t) ? "family" : "");
    if (k) next.kind = k;
    if (p.relation) next.relation = p.relation;
    return next;
  }
  if (field === "relation") {
    const r = relationIn(t) || RELATIONS.find((x) => fold(x) === fold(t)) || "";
    if (r) next.relation = r;
    return next;
  }
  if (field === "phone" && !p.phone && /\d/.test(t)) next.phone = t;
  if (field === "birth" && !p.birth) {
    const b = birthIn(text);
    if (b) next.birth = { day: b.day, month: b.month, year: b.year };
  }
  // Açık düzeltmeler: "adı X olsun", "soyadı Y", "telefonu …", "e-postası …"
  const nm = /(?:^|\s)adı(?:nı)?\s+(.+?)(?:\s+(?:olsun|yap|olarak))?$/u.exec(t);
  if (nm && !/soyadı/.test(t)) next.name = capWords(nm[1]);
  const sn = /soyadı(?:nı)?\s+(\S+)/u.exec(t);
  if (sn && next.name) next.name = `${next.name.split(" ")[0]} ${capWords(sn[1])}`;
  for (const k of ["phone", "email", "kind", "relation", "title"]) if (p[k]) next[k] = p[k];
  if (p.relation && !p.kind) next.kind = "family";
  if (next.kind !== "family") delete next.relation;
  if (field === "birth" || /doğum/.test(t)) {
    const b = birthIn(text);
    if (b) next.birth = { day: b.day, month: b.month, year: b.year };
  }
  if (!nm && !sn && p.name && field === "" && !p.phone && !p.email && !p.birth && !p.kind && !p.relation) next.name = p.name;
  return next;
}
// Cümle taslağı değiştirdi mi (onay beklerken: değiştiriyorsa düzeltme, değilse başka bir istek)
export const changes = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

// ---- Mükerrer kişi ----
function dist(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
// members: ana hesabın tüm kişileri (ayrılanlar dahil). Dönüş: [{ person, why, left }]
export function findDuplicates(d, members = []) {
  const out = [];
  const name = fold(d.name);
  const [first, ...rest] = name.split(" ");
  const last = rest.join(" ");
  const tel = d.phone && validPhone(d.phone) ? phoneDigits(d.phone) : "";
  const mail = lower(d.email);
  for (const m of members) {
    const why = [];
    if (tel && m.phone && phoneDigits(m.phone) === tel) why.push("aynı telefon");
    if (mail && m.email && lower(m.email) === mail) why.push("aynı e-posta");
    const mn = fold(m.name);
    const [mf, ...mr] = mn.split(" ");
    const ml = mr.join(" ");
    if (name && mn === name) why.push("aynı ad");
    else if (name && last && ml && dist(first, mf) <= 1 && dist(last, ml) <= 1) why.push("benzer ad");
    else if (name && !last && first === mf) why.push("aynı ilk ad");
    if (why.length) out.push({ person: m, why: why.join(", "), left: m.status === "left" });
  }
  return out.slice(0, 3);
}

// ---- Özet ----
const MONTH_UP = MONTHS.map((m) => m[0].toLocaleUpperCase("tr-TR") + m.slice(1));
export const birthText = (b) => (b ? `${b.day} ${MONTH_UP[b.month - 1] || ""}${b.year ? ` ${b.year}` : ""}` : "");
export const kindText = (d) => [KIND_LABEL[d.kind] || "", d.kind === "family" && d.relation ? d.relation.toLocaleLowerCase("tr-TR") : "", d.kind === "staff" && d.title].filter(Boolean).join(" · ");
// Kart satırları: [etiket, değer]
export const summaryRows = (d) => [
  ["Ad soyad", d.name || "—"],
  ["Grup", kindText(d) || "—"],
  ["Telefon", d.phone ? formatPhone(d.phone) : "—"],
  ["E-posta", d.email || "—"],
  ["Doğum günü", birthText(d.birth) || "—"],
];
// Sesli özet: "Ayşe Yılmaz, aile bireyi, eş. Telefon 0532 123 45 67. Doğum günü 12 Mart 1985."
export function summarySay(d) {
  const kind = [KIND_LABEL[d.kind], d.kind === "family" && d.relation && d.relation.toLocaleLowerCase("tr-TR"), d.kind === "staff" && d.title].filter(Boolean).join(", ");
  const parts = [`${d.name}, ${lower(kind)}.`];
  if (d.phone) parts.push(`Telefon ${formatPhone(d.phone)}.`);
  if (d.email) parts.push(`E-posta ${d.email}.`);
  if (d.birth) parts.push(`Doğum günü ${birthText(d.birth)}.`);
  const none = [!d.phone && "telefon", !d.email && "e-posta", !d.birth && "doğum günü"].filter(Boolean);
  const list = none.join(", ").replace(/, ([^,]*)$/, " ve $1");
  if (none.length) parts.push(`${list[0]?.toLocaleUpperCase("tr-TR")}${list.slice(1)} yok; istersen söyle.`);
  return parts.join(" ");
}

// Kaydedilecek kişi kaydı (orgs/{uid}/members; hesapsız). Kişiler sayfasındaki "Kişi ekle" ile aynı alanlar.
export function memberData(d, now = new Date().toISOString()) {
  const kind = kindOf({ kind: d.kind });
  return {
    name: d.name.trim(),
    kind,
    relation: kind === "family" ? d.relation || "" : "",
    title: kind === "staff" ? (d.title || "").trim() : "",
    phone: d.phone ? formatPhone(d.phone) : "",
    email: lower(d.email || "").trim(),
    birth: birthIso(d.birth),
    updatedAt: now,
    account: false,
    status: "active",
    createdAt: now,
    addedBy: "assistant",
  };
}
