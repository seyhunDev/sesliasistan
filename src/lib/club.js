// Kulüp bilgisi (Seyhun 2026-11-27 "kulüp çatısını sonra kuracağız ama o yapıyla kuralım"): kulüp bir hesap değil, etiket.
// Resmi kulüpler üst düzey `clubs/{id}` listesinde (herkes okur, yalnız Velora ana hesabı yazar). Kullanıcı profilinde
// users/{uid}.clubId (listeden) ya da boş ("Kulüpsüz devam et"); serbest kulüp adı yazılmaz. clubAsked: soru bir kez soruldu.
// Belgeler, veli mesajları ve raporlar kulübün adını, anteti ve logosunu buradan okur (eskiden koda gömülü Dikili bilgisi).
// Saf modül: React ve Firebase yok (testlerde de kullanılır).

export const CLUB_FIELDS = [
  ["name", "Kulüp adı"],
  ["short", "Kısa ad (DYK)"],
  ["tyfName", "TYF kaydındaki adı"],
  ["city", "İli"],
  ["district", "İlçesi"],
  ["web", "Web sitesi"],
  ["mail", "E-posta", "email"],
  ["phone", "Telefon", "tel"],
  ["address", "Adres"],
  ["logo", "Logo adresi"],
];

// Seyhun'un kulübü: listeye ilk yüklenen kayıt (Admin › Kulüpler'de yoksa eklenir). Bilgiler eski koddaki antetle aynı.
export const DIKILI_ID = "dikili-yelken";
export const DIKILI = {
  name: "Dikili Yelken Spor Kulübü",
  short: "DYK",
  tyfName: "DİKİLİ YELKEN VE KANO SPOR KULÜBÜ",
  city: "İzmir",
  district: "Dikili",
  web: "www.dikiliyelken.com",
  mail: "bilgi@dikiliyelken.com",
  phone: "(533) 470 78 73",
  address: "Cumhuriyet Mahallesi, Bankacılar Sitesi, 370 SK. No: 28  Dikili / İZMİR",
  logo: "/club-logo.png",
};

const S = (v, n = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
// Kayda girecek alanlar (bilinmeyen alan atılır)
export const cleanClub = (c) => Object.fromEntries(CLUB_FIELDS.map(([k]) => [k, S(c?.[k], k === "address" ? 200 : k === "logo" ? 500 : 120)]));

// Arama ve eşleştirme için sade yazı: "Dikili Yelken Spor Kulübü" → "dikili yelken spor kulubu"
export const plainTr = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[c])
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Kulüp adında ayırt etmeyen sözler ("Foça Yelken Kulübü" ile "Foça YK" aynı kulüp)
const NOISE = new Set(["spor", "kulubu", "klubu", "kulup", "sk", "yk", "ysk", "ve", "derneği", "dernegi", "yelken", "yat", "deniz", "su", "sporlari", "kano", "ihtisas"]);
// Kulübün ayırt edici sözleri (şehir/ad): "Dikili Yelken ve Kano Spor Kulübü" → ["dikili"]
export const clubWords = (s) => plainTr(s).split(" ").filter((w) => w.length > 1 && !NOISE.has(w));
export const clubKey = (s) => clubWords(s).join(" ");

// Listeden kimlik: ad + sayı yerine okunur, kalıcı ("Foça Yelken Kulübü" → "foca-yelken-kulubu")
export const clubIdOf = (name) =>
  plainTr(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 6)
    .join("-")
    .slice(0, 60);

// Listede arama: adın, kısa adın, il ve ilçenin her sözü yazılan sözlerle başlıyorsa eşleşir; ad sırasına göre
export function searchClubs(list, q) {
  const want = plainTr(q).split(" ").filter(Boolean);
  const all = [...(list || [])].sort((a, b) => String(a.name).localeCompare(String(b.name), "tr"));
  if (!want.length) return all;
  return all.filter((c) => {
    const hay = plainTr([c.name, c.short, c.tyfName, c.city, c.district].join(" ")).split(" ");
    return want.every((w) => hay.some((h) => h.startsWith(w)));
  });
}

// Sonuç listelerindeki kulüp adları (yarış sonuçları; TYF yarışlarına katılan resmi kulüpler): listede olmayanlar, en çok geçen önce.
// sheets: [{ fleets: [{ rows: [{ club }] }] }]; list: mevcut kulüpler. Dönüş [{ name, n }] (aynı kulübün yazılışları birleşir, en uzun ad kalır)
export function clubSuggestions(sheets, list = []) {
  const have = new Set((list || []).flatMap((c) => [clubKey(c.name), clubKey(c.tyfName)]).filter(Boolean));
  const by = new Map();
  for (const s of sheets || [])
    for (const f of s?.fleets || [])
      for (const r of f?.rows || []) {
        const name = S(r?.club, 80);
        const k = clubKey(name);
        // Kısaltma ("DYK", "TUR") kulüp sayılmaz; tek sözlü tam ad (GALATASARAY) sayılır
        if (!k || name.length < 4 || /^[A-ZÇĞİÖŞÜ.]{2,5}$/.test(name) || have.has(k)) continue;
        const x = by.get(k) || { name, n: 0 };
        x.n += 1;
        if (name.length > x.name.length) x.name = name;
        by.set(k, x);
      }
  return [...by.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "tr"));
}

// Şu anki kullanıcının kulübü: belgeler (raceDocs, veli PDF'leri, gün kaydı) ve mesajlar bunu okur. ClubSync girişte doldurur.
// Kulüpsüzde alanlar boş: belgeler anteti boş bırakır, mesajlar kulüp adı yerine kullanıcının adıyla biter.
// upper: antetteki büyük harfli ad; place: "Dikili / İZMİR".
const derive = (c) => ({
  upper: c.name.toLocaleUpperCase("tr-TR"),
  place: [c.district, c.city.toLocaleUpperCase("tr-TR")].filter(Boolean).join(" / "),
});
export const CLUB = { id: "", ...cleanClub({}), upper: "", place: "", signer: "" };
export function setClub(club, signer = "") {
  const c = cleanClub(club || {});
  Object.assign(CLUB, { id: club ? S(club.id, 60) : "", ...c, ...derive(c), signer: S(signer, 80) });
  return CLUB;
}
// Mesajın altındaki imza: kulüp adı, yoksa kullanıcının adı
export const clubSign = () => CLUB.name || CLUB.signer || "";
// Sonuç listesinde "bizim kulüp" araması için anahtar söz ("dikili"); kulüpsüzde boş (eşleştirme yalnız ada göre)
export const clubMatch = () => clubWords(CLUB.tyfName || CLUB.name)[0] || "";
