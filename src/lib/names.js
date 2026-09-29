// Çalışan adlarının doğru yazılması ve yapay zekanın verdiği adların kişilere eşlenmesi.
// Ses tanıma özel isimleri bölebilir ya da küçük harfle yazabilir ("san ver" → "Sanver").

const PAIRS = { i: "iİ", ı: "ıI", ş: "şŞ", ç: "çÇ", ğ: "ğĞ", ö: "öÖ", ü: "üÜ" };
const esc = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Harf için büyük/küçük (Türkçe) sınıfı
const cls = (c) => {
  const lo = c.toLocaleLowerCase("tr-TR");
  const set = PAIRS[lo] || `${lo}${lo.toLocaleUpperCase("tr-TR")}`;
  return set.length > 1 ? `[${esc(set)}]` : esc(set);
};

// Karşılaştırma için sade biçim: küçük harf, Türkçe işaretsiz, boşluksuz
export const plain = (s = "") =>
  s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]/gu, "");

// Tek bir adı arayan kalıp: harflerin arasında boşluk olabilir, önünde harf olamaz (ekler serbest: "Sanver'e")
function pattern(word) {
  const letters = [...word];
  return new RegExp(`(?<![\\p{L}])${letters.map(cls).join("[ -]?")}`, "gu");
}

// Metinde bölünmüş yazılan çalışan adlarını birleştirir: "san ver" → "Sanver". names: ["Sanver", "Ali Yılmaz"]
// Bitişik yazılmış kelimeye dokunmaz ("deniz" bir isim de olabilir, sıradan kelime de); onu yapay zeka bağlamdan düzeltir.
export function fixNames(text, names = []) {
  if (!text || !names.length) return text || "";
  const words = [...new Set(names.flatMap((n) => String(n).split(/\s+/)))].filter((w) => [...w].length >= 4);
  let out = text;
  for (const w of words) out = out.replace(pattern(w), (m) => (/[ -]/.test(m) ? w : m));
  return out;
}

// ---- Söylenen/yazılan adı kişi listesindeki bir kişiye eşleme ----
// Soyad gerekmez: "Sanver", "Sanver'e", "sanvere", "Sanver Bey", "san ver", ses tanıma hatası "Sanvar" hepsi Sanver Kaya'ya gider.
// Kural: tek başına ad, ADI o olan kişiye aittir; soyadı o olana yalnızca o ada sahip kimse yoksa. Belirsizse eşleşmez.
const HONOR = /\s+(bey|hanım|hanim|abi|abla|hoca|hocam|usta|amca|teyze)$/u;
const SUFFIX = ["nın", "nin", "nun", "nün", "yla", "yle", "ile", "ya", "ye", "yı", "yi", "yu", "yü", "da", "de", "ta", "te", "a", "e", "ı", "i", "u", "ü"];

// Aday biçimler: kesme işaretinden sonrası atılır, unvan atılır; eki olabilecek son kelimeden ek düşülmüş hâlleri de eklenir
function forms(raw) {
  let t = String(raw || "").toLocaleLowerCase("tr-TR").trim();
  const cut = t.search(/['’`´]/);
  if (cut > 0) t = t.slice(0, cut);
  t = t.replace(HONOR, "").trim();
  const out = [plain(t)];
  const last = t.split(/\s+/).pop();
  for (const sfx of SUFFIX) if (last.endsWith(sfx) && [...last].length - [...sfx].length >= 3) out.push(plain(t.slice(0, t.length - sfx.length)));
  return [...new Set(out.filter(Boolean))];
}

// İki kelime arası düzeltme uzaklığı (küçük; adlar kısa)
function dist(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// people: ["Sanver Kaya", "Ali Yılmaz"] ya da [{ name, aliases: ["sano"] }]. Dönüş: listedeki ad ya da "".
export function matchPerson(raw, people = []) {
  const list = people.map((p) => (typeof p === "string" ? { name: p, aliases: [] } : { name: p.name, aliases: p.aliases || [] })).filter((p) => p.name);
  const parts = list.map((p) => {
    const w = p.name.split(/\s+/).filter(Boolean);
    return { name: p.name, full: plain(p.name), first: plain(w[0]), last: w.length > 1 ? plain(w[w.length - 1]) : "", alias: p.aliases.map(plain) };
  });
  const one = (arr) => (arr.length === 1 ? arr[0].name : "");
  for (const f of forms(raw)) {
    const hit =
      one(parts.filter((p) => p.full === f)) ||
      one(parts.filter((p) => p.alias.includes(f))) ||
      one(parts.filter((p) => p.first === f)) ||
      one(parts.filter((p) => f.startsWith(p.full) || (p.first.length >= 3 && f.startsWith(p.first) && p.full.startsWith(f)))) ||
      (parts.some((p) => p.first === f) ? "" : one(parts.filter((p) => p.last === f)));
    if (hit) return hit;
  }
  // Ses tanıma hatası: ada ya da tam ada çok yakın tek kişi ("sanvar" -> Sanver, "ali yilmas" -> Ali Yılmaz)
  const f = forms(raw)[0] || "";
  if ([...f].length < 4) return "";
  const tol = (s) => ([...s].length >= 7 ? 2 : 1);
  const near = parts
    .map((p) => ({ p, d: Math.min(dist(f, p.first) <= tol(p.first) ? dist(f, p.first) : 9, dist(f, p.full) <= tol(p.full) ? dist(f, p.full) : 9) }))
    .filter((x) => x.d < 9)
    .sort((a, b) => a.d - b.d);
  if (!near.length || (near[1] && near[1].d === near[0].d)) return "";
  return near[0].p.name;
}

// Yapay zekanın döndürdüğü adları çalışan kimliklerine çevirir (ad, ekli ad, soyad ya da yakın yazım eşleşir)
export function namesToUids(list, members = []) {
  if (!Array.isArray(list)) return undefined;
  const out = [];
  const names = members.map((m) => m.name).filter(Boolean);
  for (const n of list) {
    const hit = matchPerson(n, names);
    const m = hit && members.find((x) => x.name === hit);
    if (m && !out.includes(m.uid)) out.push(m.uid);
  }
  return out;
}

// Yapay zeka mesajda birine verdiğini söyleyip sorumlu alanını boş bıraktıysa mesajdan bul:
// "Görevi Sanver'e verdim", "sorumlusu Ali", "Ali ve Sanver'e atadım"
export function namesInMessage(message, people = []) {
  const t = String(message || "");
  const found = [];
  const add = (w) => {
    const hit = matchPerson(w, people) || matchPerson(w.split(/\s+/)[0], people);
    if (hit && !found.includes(hit)) found.push(hit);
  };
  // "X'e / X ve Y'ye ... verdim|atadım": son adın yönelme eki (-e/-a) olmalı ("Sanver ile toplantıyı ekledim" atama değildir)
  const verb = /((?:[\p{L}]+(?:['’][\p{L}]+)?\s+ve\s+)*[\p{L}]+(?:['’][\p{L}]+)?)\s+(?:[\p{L}]+\s+){0,2}(?:verdim|atadım|atandı|bıraktım|verildi)/giu;
  for (const m of t.matchAll(verb)) {
    const ws = m[1].split(/\s+ve\s+/u);
    if (/(?:['’]?y?[ae])$/iu.test(ws[ws.length - 1])) ws.forEach(add);
  }
  for (const m of t.matchAll(/sorumlu(?:su|lar[ıi])?\s*[:：]?\s*([\p{L}]+(?:\s+[\p{L}]+)?)/giu)) add(m[1]);
  return found;
}

// Kimliklerden adlar (yapay zekaya mevcut taslağı anlatmak için)
export const uidsToNames = (uids = [], members = []) => uids.map((u) => members.find((m) => m.uid === u)?.name).filter(Boolean);
