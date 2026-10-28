// Yarış sonuç belgesi (PDF): yapay zeka listeyi okur (sınıf başına sıra, ad, yelken no, kulüp, cinsiyet, kategori),
// sıralamayı uygulama hesaplar (saf fonksiyonlar, test edilir):
// - Genel sıra: sınıftaki bütün sporcular (kategori, cinsiyet ayrımı yok).
// - Optimist'te kategori: yanında Junior ya da Bambino yazmayan Senior; Junior ve Bambino ayrıca kendi içinde sıralanır.
// - ILCA 4'te Junior doğum yılından (CAT_RULES, withCats): yarışın yılında 15 yaş ve altı.
// - Kızlar: sınıftaki bütün kızlar kendi içinde sıralanır. Bizim sporcularda cinsiyet sporcu kartından,
//   diğerlerinde belgeden; belgede yoksa yapay zekanın addan tahmini.
// - Bizim sporcular listede adından bulunur (aynı adlı iki satır varsa yelken no, sonra kulüp adı ayırır).
// Sonuç yarışın results.rows alanına sporcu başına yazılır: { cls, cat, place, n, cp, cn, gp, gn, f }.

const plain = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[c])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const tokens = (s) => plain(s).split(" ").filter(Boolean);
const digits = (s) => String(s || "").replace(/\D/g, "");

// Sonuç listesinde arama: ad, kulüp ya da yelken numarası ("dikili", "kaya", "1234", "TUR 1234"); her kelime geçmeli, rakamlar yelken no'da
export function sheetMatch(r, q) {
  const words = tokens(q);
  const num = digits(q);
  if (!words.length && !num) return true;
  const hay = plain([r?.name, r?.club, r?.sail].join(" "));
  return words.every((w) => hay.includes(w)) && (!num || digits(r?.sail).includes(num));
}
export const isOptimist = (cls) => /opti/.test(plain(cls));

// Sınıfa göre yaş kategorileri (doğum yılından): yarışın yılında en çok `age` yaşında olan o kategoriye girer.
// ILCA 4: 15 yaş ve altı Junior (2026 yarışlarında 2011 ve sonrası doğumlular; her yıl kendiliğinden bir yıl kayar).
// Yeni sınıfın kuralı (Optimist Junior/Bambino gibi) buraya eklenir; kuralı olan sınıfta belgedeki işaret yalnız doğum yılı yoksa kullanılır.
export const CAT_RULES = [{ cls: /^ILCA 4$/, cats: [{ cat: "Junior", age: 15 }] }];
const ruleOf = (cls) => CAT_RULES.find((r) => r.cls.test(String(cls || "")));
// "2011", "12.03.2011", "2011-03-12" → 2011
export const bornYear = (s) => {
  const m = String(s || "").match(/\b(19\d\d|20\d\d)\b/);
  return m ? +m[1] : 0;
};

// "J", "JR", "Junior", "U12" → Junior; "B", "Bambino" → Bambino; Optimist'te boş → Senior;
// kuralı olan sınıfta (CAT_RULES) belgedeki işaret, boşsa kategori yok; diğer sınıflarda kategori yok
export function catOf(cls, raw) {
  const c = plain(raw);
  const opti = isOptimist(cls);
  if (!opti && !ruleOf(cls)) return "";
  if (/^b$|bamb/.test(c)) return "Bambino";
  if (/^j$|^jr$|junior|^jun|genc/.test(c)) return "Junior";
  return opti ? "Senior" : "";
}

// Kuralı olan sınıflarda kategoriyi doğum yılından yazar (year: yarışın yılı). Doğum yılı okunamayan satırda belgedeki işaret kalır.
export function withCats(fleets, year = new Date().getFullYear()) {
  return (fleets || []).map((f) => {
    const rule = ruleOf(f.cls);
    if (!rule) return f;
    const rows = f.rows.map((r) => {
      const b = bornYear(r.born);
      if (!b) return r;
      return { ...r, cat: rule.cats.find((c) => year - b <= c.age)?.cat || "" };
    });
    return { ...f, rows };
  });
}
// Yarışın yılı (başlangıç tarihinden; yoksa bu yıl)
export const raceYear = (race) => +String(race?.startDate || "").slice(0, 4) || new Date().getFullYear();

// "K", "F", "W", "Kız", "Kadın", "Female", "Girl" → K; "E", "M", "Erkek", "Male", "Boy" → E
export function sexOf(raw) {
  const c = plain(raw);
  if (!c) return "";
  if (/^(k|f|w|g)$|^kiz|^kad|^fem|^wom|^girl|^bayan/.test(c)) return "K";
  if (/^(e|m|b)$|^erk|^mal|^man|^men|^boy|^bay$/.test(c)) return "E";
  return "";
}

// Sınıf adı: "OPTİMİST" → "Optimist", "ilca4" → "ILCA 4"
export function clsName(raw) {
  const s = String(raw || "").replace(/\s+/g, " ").trim();
  if (isOptimist(s)) return "Optimist";
  const ilca = s.match(/(ilca|laser)\s*(\d)?/i);
  if (ilca) return ilca[2] ? `ILCA ${ilca[2]}` : "ILCA";
  return s.slice(0, 30);
}

// Yapay zekanın okuduğu listeyi temizler: [{ cls, rows: [{ rank, name, sail, club, born, pts, sex, cat }] }] (sıraya göre)
export function cleanSheet(raw) {
  const fleets = [];
  for (const f of (Array.isArray(raw) ? raw : []).slice(0, 12)) {
    const cls = clsName(f?.cls || f?.title);
    const rows = (Array.isArray(f?.rows) ? f.rows : [])
      .slice(0, 400)
      .map((r, i) => ({
        rank: Number(r?.rank) > 0 ? Math.round(Number(r.rank)) : i + 1,
        name: String(r?.name || "").replace(/\s+/g, " ").trim().slice(0, 80),
        sail: String(r?.sail || "").trim().slice(0, 20),
        club: String(r?.club || "").replace(/\s+/g, " ").trim().slice(0, 80),
        born: String(r?.born || "").replace(/\s+/g, " ").trim().slice(0, 10),
        pts: Number.isFinite(Number(r?.pts)) && r?.pts !== null && r?.pts !== "" && Number(r.pts) >= 0 ? Math.round(Number(r.pts) * 10) / 10 : "",
        sex: sexOf(r?.sex),
        cat: catOf(cls, r?.cat),
      }))
      .filter((r) => r.name)
      .sort((a, b) => a.rank - b.rank);
    if (cls && rows.length) fleets.push({ cls, rows });
  }
  return fleets;
}

// Ad eşleşmesi: sporcunun ilk ve son adı satırda geçiyor (sıra fark etmez: "KAYA Ali" = Ali Kaya)
function nameHit(rowName, athleteName) {
  const r = new Set(tokens(rowName));
  const a = tokens(athleteName);
  if (a.length < 2 || r.size < 2) return false;
  return r.has(a[0]) && r.has(a[a.length - 1]);
}

// Bizim sporcuları listede bulur: { sporcuId: { fi, ri } } (fi: sınıf sırası, ri: satır sırası)
export function findOurs(fleets, athletes, club = "dikili") {
  const out = {};
  for (const a of athletes || []) {
    if (!a?.id || !a.studentName) continue;
    const hits = [];
    fleets.forEach((f, fi) => f.rows.forEach((r, ri) => nameHit(r.name, a.studentName) && hits.push({ fi, ri, r })));
    if (!hits.length) continue;
    let pick = hits;
    const sail = digits(a.sailNo);
    if (pick.length > 1 && sail.length >= 3) pick = pick.filter((h) => digits(h.r.sail).endsWith(sail)).concat(pick).slice(0, pick.length);
    if (pick.length > 1) {
      const ours = pick.filter((h) => plain(h.r.club).includes(club));
      if (ours.length) pick = ours;
    }
    out[a.id] = { fi: pick[0].fi, ri: pick[0].ri };
  }
  return out;
}

// Sporcu başına sonuç: { sporcuId: { cls, cat, place, n, cp, cn, gp, gn } }
// place/n: genel sıralama (bütün sporcular, kategori ve cinsiyet ayrımı yok).
// cp/cn: Junior ya da Bambino ise o kategorinin kendi sırası (Senior'a ayrı sıra yok, genel sıra yeter).
// gp/gn: kızlar sırası, sınıftaki bütün kızlar arasında (kategoriden bağımsız).
// jp/jn: kategorinin kızlar sırası (Junior Kızlar): Junior ya da Bambino kızlar kendi aralarında.
// Bizim sporcunun cinsiyeti sporcu kartından (studentGender) alınır, kızlar sıralamasında o geçerli.
export function rankOurs(fleets, athletes, club) {
  const found = findOurs(fleets, athletes, club);
  const byId = Object.fromEntries((athletes || []).map((a) => [a.id, a]));
  // Kartta cinsiyet yazıyorsa belgedekinin yerine o
  const sexes = fleets.map((f) => f.rows.map((r) => r.sex));
  for (const [id, { fi, ri }] of Object.entries(found)) {
    const g = sexOf(byId[id]?.studentGender);
    if (g) sexes[fi][ri] = g;
  }
  const out = {};
  for (const [id, { fi, ri }] of Object.entries(found)) {
    const f = fleets[fi];
    const me = f.rows[ri];
    const sub = me.cat && me.cat !== "Senior" ? f.rows.map((r, i) => ({ r, i })).filter((x) => x.r.cat === me.cat) : [];
    const cp = sub.length ? sub.findIndex((x) => x.i === ri) + 1 : 0;
    const girls = f.rows.map((r, i) => i).filter((i) => sexes[fi][i] === "K");
    const gp = sexes[fi][ri] === "K" ? girls.indexOf(ri) + 1 : 0;
    // Kategorinin kızları (Junior Kızlar): kızlar arasında aynı kategoridekiler
    const catGirls = cp && gp ? girls.filter((i) => f.rows[i].cat === me.cat) : [];
    const jp = catGirls.length ? catGirls.indexOf(ri) + 1 : 0;
    out[id] = {
      cls: f.cls,
      cat: me.cat,
      place: ri + 1,
      n: f.rows.length,
      cp: cp || "",
      cn: cp ? sub.length : "",
      gp: gp || "",
      gn: gp ? girls.length : "",
      jp: jp || "",
      jn: jp ? catGirls.length : "",
    };
  }
  return out;
}

// "Optimist Junior", "ILCA 4"
export const groupName = (x) => [x?.cls, x?.cat].filter(Boolean).join(" ");

// Kısa sonuç: "Optimist genel 56. / 120 · Junior 4. / 38 · Kızlar 7. / 30 · Junior Kızlar 2. / 12"
export function resultLine(x) {
  if (!x?.place) return "";
  const head = `${x.cls ? `${x.cls} genel ` : ""}${x.place}.${x.n ? ` / ${x.n}` : ""}`;
  const cat = x.cp ? `${x.cat} ${x.cp}.${x.cn ? ` / ${x.cn}` : ""}` : "";
  const girls = x.gp ? `Kızlar ${x.gp}.${x.gn ? ` / ${x.gn}` : ""}` : "";
  const catGirls = x.jp ? `${x.cat} Kızlar ${x.jp}.${x.jn ? ` / ${x.jn}` : ""}` : "";
  return [head, cat, girls, catGirls].filter(Boolean).join(" · ");
}

// Sesli/yazılı cevap için: "Optimist genelde 120 sporcu içinde 56., Junior'da 38 sporcu içinde 4., kızlarda 30 sporcu içinde 7."
export function resultSpeech(x) {
  if (!x?.place) return "";
  const head = `${x.cls ? `${x.cls} genelde ` : ""}${x.n ? `${x.n} sporcu içinde ` : ""}${x.place}.`;
  const cat = x.cp ? `, ${x.cat} sıralamasında ${x.cn ? `${x.cn} sporcu içinde ` : ""}${x.cp}.` : "";
  const girls = x.gp ? `, kızlarda ${x.gn ? `${x.gn} sporcu içinde ` : ""}${x.gp}.` : "";
  const catGirls = x.jp ? `, ${x.cat} kızlarda ${x.jn ? `${x.jn} sporcu içinde ` : ""}${x.jp}.` : "";
  return `${head}${cat}${girls}${catGirls}`;
}

// ---- Asistan: "Ali'nin sonuçları", "Ali Kaya kaçıncı oldu", "Foça yarışında Ali kaçıncı oldu" ----
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[?.!…]+\s*$/u, "").replace(/\s+/g, " ").trim();
export function resultsAsk(raw) {
  const t = low(raw);
  if (/(sonuç\p{L}* (yükle|ekle|sil)|pdf)/u.test(t)) return null;
  let m = t.match(/^(.+?)(?:['’]?n[ıiuü]n)? (?:yarış |son yarış )?(?:sonuçları|sonuçlarını göster|sonuçları neler|derece\p{L}*)(?: (?:neler|ne|nasıl|göster|söyle|oku))?$/u);
  if (m) return { name: nameIn(m[1]), race: "" };
  m = t.match(/^(?:(.+?) yarışında )?(.+?) kaçıncı (?:oldu|geldi|bitirdi|olmuş|gelmiş)$/u);
  if (m) return { name: nameIn(m[2]), race: m[1] ? m[1].trim() : "" };
  return null;
}
function nameIn(s) {
  const words = String(s || "")
    .replace(/^(sporcu(muz)?|bizim) /u, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.replace(/['’`´].*$/u, ""));
  return words.join(" ").trim();
}

// Sporcunun sonuçlarını söyler; races yeniden eskiye sıralı olmalı. race: istenen yarışın adından bir parça
export function resultsAnswer(races, athlete, race = "") {
  const first = String(athlete?.studentName || "").split(" ")[0];
  const q = plain(race).replace(/\b(yaris\w*|regat\w*)\b/g, "").trim();
  const list = (races || [])
    .filter((r) => r.results?.rows?.[athlete.id]?.place)
    .filter((r) => !q || plain(r.name).includes(q) || plain(`${r.district || ""} ${r.city || ""}`).includes(q));
  if (!list.length) return `${athlete.studentName} için ${race ? "bu yarışta " : ""}kayıtlı sonuç yok. Yarışın Sporcular sekmesinden sonuç PDF'ini yükleyebilirsin.`;
  const parts = list.slice(0, 4).map((r) => {
    const x = r.results.rows[athlete.id];
    return `${r.name}: ${x.cat || x.cls ? resultSpeech(x) : `${x.place}.${r.results.fleet ? ` (${r.results.fleet} tekne)` : ""}`}`;
  });
  return `${first || athlete.studentName}${list.length > 1 ? ` ${list.length} yarışta sonuç var` : ""}. ${parts.join(" ")}${list.length > 4 ? ` Diğerleri sporcu kartında.` : ""}`;
}

// Belgeden bulunan sonuçları yarışın results alanına ekler. file: { id, … } künye; ranked: rankOurs çıktısı.
// Aynı sporcunun eski satırı yenisiyle değişir (elle yazılan not kalır).
export function mergeSheet(res, ranked, file) {
  const rows = { ...(res?.rows || {}) };
  for (const [id, x] of Object.entries(ranked || {})) rows[id] = { ...x, note: rows[id]?.note || "", f: file?.id || "" };
  const files = [...(res?.files || []).filter((f) => f.id !== file?.id), ...(file?.id ? [file] : [])];
  return { fleet: res?.fleet || "", rows, files };
}

// Belge silinince ondan gelen satırlar da gider
export function dropSheet(res, fileId) {
  const rows = Object.fromEntries(Object.entries(res?.rows || {}).filter(([, x]) => x.f !== fileId));
  return { fleet: res?.fleet || "", rows, files: (res?.files || []).filter((f) => f.id !== fileId) };
}
