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

// Kullanıcının kendi cümlesinden sorumlu(lar): yapay zeka seçmese de (ya da hızlı komut/yedek kurallarla hazırlansa da) atanır.
// Kalıplar (ad kişi listesinde olmalı; soyad gerekmez):
//   "Ali'nin benzin alma görevi", "Ali'nin işi"          (tamlayan + görev/iş)
//   "Ali'ye söyle", "Ali'ye ver", "Sanver'e ata"          (yönelme + ver/söyle/ata/yaptır/bırak/ilet)
//   "Ali benzin alsın", "Ali ve Sanver halletsin"         (ad + -sın/-sin/-sun/-sün)
//   "sorumlu Ali", "sorumlusu Ali", "Ali sorumlu"
// "Ali ile toplantı", "Ali'yle görüşme" atama sayılmaz.
// Aynı ada sahip birden çok kişi ("Ali" → Ali Kaya, Ali Yılmaz): soyad ya da ikinci ad söylenmediyse seçim kullanıcıya sorulur
export function sameName(raw, people = []) {
  if (matchPerson(raw, people)) return [];
  const names = people.map((p) => (typeof p === "string" ? p : p.name)).filter(Boolean);
  for (const f of forms(raw)) {
    const same = names.filter((n) => plain(n.split(/\s+/)[0]) === f);
    if (same.length > 1) return same;
  }
  return [];
}

function scan(text, people = []) {
  const t = String(text || "");
  const found = [];
  const ambiguous = []; // [{ said: "Ali", options: ["Ali Kaya", "Ali Yılmaz"] }]
  if (!t || !people.length) return { found, ambiguous };
  // Önceki kelimeyle birlikte de dener: "Ali Y.", "Mehmet Ali'ye", "Ali Yılmaz'ın"
  const before = (w) => {
    const m = t.match(new RegExp(`([\\p{L}]+\\.?)\\s+${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u"));
    return m ? `${m[1].replace(/\.$/, "")} ${w}` : "";
  };
  const add = (w0) => {
    const pair = before(w0);
    const hit2 = pair && matchPerson(pair, people);
    const w = hit2 ? pair : w0;
    const hit = hit2 || matchPerson(w0, people);
    if (hit) {
      if (!found.includes(hit)) found.push(hit);
      return;
    }
    const options = sameName(w, people);
    const said = w.replace(/['’][\p{L}]*$/u, "");
    if (options.length && !ambiguous.some((x) => x.said === said)) ambiguous.push({ said, options });
  };
  const W = "[\\p{L}]+\\.?(?:['’][\\p{L}]+)?";
  const chain = `((?:${W}\\s+ve\\s+)*${W})`;
  const each = (m) => m.split(/\s+ve\s+/u);
  // tamlayan + görev/iş
  for (const m of t.matchAll(new RegExp(`${chain}\\s+(?:[\\p{L}]+\\s+){0,4}(?:görevi|görev|işi|işleri|vazifesi)\\b`, "giu")))
    each(m[1]).forEach((w) => /(?:['’]?n?[ıiuü]n)$/iu.test(w) && add(w));
  // yönelme + ver/söyle/ata…
  for (const m of t.matchAll(new RegExp(`${chain}\\s+(?:[\\p{L}]+\\s+){0,4}(?:ver|söyle|ata|yaptır|bırak|ilet|havale et)`, "giu")))
    if (/(?:['’]?y?[ae])$/iu.test(each(m[1]).at(-1))) each(m[1]).forEach(add);
  // ad + -sın/-sin (istek), arada "ile" yoksa
  for (const m of t.matchAll(new RegExp(`${chain}\\s+(?!ile\\b)(?:[\\p{L}]+\\s+){0,4}?[\\p{L}]+s[ıiuü]n(?:lar)?\\b`, "giu"))) {
    const names = each(m[1]);
    if (!/['’]?y?(?:le|la)$|^(ile)$/iu.test(names.at(-1))) names.forEach(add);
  }
  for (const m of t.matchAll(/sorumlu(?:su|ları|lari)?\s*[:：]?\s*([\p{L}]+)/giu)) add(m[1]);
  for (const m of t.matchAll(/([\p{L}]+)\s+sorumlu\b/giu)) add(m[1]);
  return { found, ambiguous };
}

export const assigneesInText = (text, people = []) => scan(text, people).found;
// Sorumlular + belirsiz adlar (kullanıcıya "Hangi Ali?" diye sorulur)
export const assigneeHints = (text, people = []) => scan(text, people);

// ---- Yanlış duyulan ada en yakın adlar (yoklamada "ilave katıldı": İlayda? İlker?) ----
// Cümledeki her kelime (yoklama sözleri hariç) adların ilk adıyla karşılaştırılır: düzeltme uzaklığı en çok 2 ya da
// baştaki en az 3 harf aynı. En yakınlar önce, en çok n ad.
const NOT_NAME = new Set(["bugun", "dun", "dunku", "antrenman", "antrenmana", "antrenmanda", "yoklama", "yoklamaya", "yoklamada", "geldi", "gelmedi", "katildi", "katilmadi", "izinli", "raporlu", "ekle", "onu", "bunu", "sporcu", "sporcuyu", "kisi", "kim", "yaz", "isaretle", "ilk", "olarak"]);
export function closeNames(text, names = [], n = 4) {
  const words = String(text || "").split(/[\s,.;:!?]+/).map((w) => plain(w.replace(/['’].*$/, ""))).filter((w) => w.length >= 3 && !NOT_NAME.has(w));
  const scored = [];
  for (const name of names) {
    const first = plain(String(name).split(/\s+/)[0] || "");
    if (!first) continue;
    let best = 9;
    for (const w of words) {
      let p = 0;
      while (p < w.length && p < first.length && w[p] === first[p]) p++;
      const d = dist(w, first);
      const s = d <= 2 ? d : p >= 3 ? 3 - Math.min(p, 5) / 10 : 9;
      if (s < best) best = s;
    }
    if (best < 9) scored.push([best, name]);
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
}

// Söylenen ad birden çok kişiye uyuyorsa ("Mustafa", iki Mustafa var) o kişiler; uymuyorsa ya da tek kişiyse []
// (bulunamadı yerine "İki Mustafa var, hangisi?" denebilsin; denetim B4, B17)
export function sameNamed(raw, people = []) {
  if (matchPerson(raw, people)) return [];
  const names = people.map((p) => (typeof p === "string" ? p : p?.name)).filter(Boolean);
  for (const f of forms(raw)) {
    const hit = names.filter((n) => {
      const w = n.split(/\s+/).filter(Boolean);
      return plain(w[0]) === f || plain(n) === f || (w.length > 1 && plain(w[w.length - 1]) === f);
    });
    if (hit.length > 1) return hit.slice(0, 4);
  }
  return [];
}
