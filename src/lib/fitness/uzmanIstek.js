// "Uzmanla çalış" isteği (Seyhun 2026-11-27): sporcu (ya da ana hesap, sporcu adına) bir uzman antrenörden program ister.
// Kayıt orgs/{org}/uzmanIstekleri/{id}; biçim Admin › Uzman antrenörler çalışmasıyla ortak:
// { sporcuUid, sporcuAd, by, brans, spor, uzmanId, sure, hedef, ders, paylas: { acik, turler }, durum, at, guncel }.
// Yalnız sunucu yazar (/api/uzman-istek). Planlar kopyalanmaz: uzman hesabı açılınca, izin açıksa ve yalnız seçilen türler gösterilir.

export const SURELER = [1, 3, 6];
export const TURLER = [
  ["antrenman", "Antrenmanlar"],
  ["yelken", "Yelken antrenmanı"],
  ["yaris", "Yarışlar"],
  ["tatil", "Tatil günleri"],
  ["yemek", "Beslenme"],
];
// Paylaşım açılınca ilk seçili türler (beslenme kişinin kendi seçimi)
export const VARSAYILAN_TURLER = ["antrenman", "yelken", "yaris", "tatil"];
export const DURUMLAR = {
  bekliyor: "Uzman bekleniyor",
  atandi: "Uzmanla çalışıyor",
  kabul: "Uzmanla çalışıyor",
  ret: "Uzman alamadı",
  bitti: "Bitti",
  iptal: "İptal edildi",
};
export const DERS_MAX = 4_000_000;
export const DERS_TUR = /^(application\/pdf|image\/(jpeg|png|webp|heic|heif))$/;

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function cleanPaylas(p) {
  const acik = p?.acik === true;
  const izin = TURLER.map(([k]) => k);
  const turler = acik ? [...new Set((Array.isArray(p?.turler) ? p.turler : []).filter((k) => izin.includes(k)))] : [];
  return { acik: acik && turler.length > 0, turler };
}

// İstemciden gelen alanlar: yalnız bunlar kabul edilir, gerisi sunucuda (sporcuUid, by, durum, zaman)
export function cleanIstek(b) {
  const sure = SURELER.includes(Number(b?.sure)) ? Number(b.sure) : 3;
  // yas ve sehir yalnız biliniyorsa (Admin'deki eşleştirme puanı kullanır; 12 ve altına çocukla çalışan uzman)
  const yas = Math.round(Number(b?.yas));
  const sehir = S(b?.sehir, 40);
  return { brans: "fitness", spor: S(b?.spor, 24), sure, hedef: S(b?.hedef, 300), paylas: cleanPaylas(b?.paylas), ...(yas >= 5 && yas <= 90 ? { yas } : {}), ...(sehir ? { sehir } : {}) };
}

export const durumYaz = (d) => DURUMLAR[d] || DURUMLAR.bekliyor;
export const acikMi = (d) => !["bitti", "iptal", "ret"].includes(d || "bekliyor");

// Sporcunun uzmanı (Seyhun 2026-11-27 "uzmanla çalışma sporcunun fitness datasında tutulsun"): users/{uid}.fitUzman
// { id, ad, istek, bas, bit } (atayınca sunucu yazar; fit alanı değil, çünkü profil kaydı fit'i baştan yazar), bitenler
// users/{uid}.fitUzmanGecmis [{ …, bitti }]. Yol tek: atamak başlatmaktır, süre bitince ya da "Bitir" ile biter.
export function ayEkle(gun, ay) {
  const [y, m, d] = String(gun).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + (Number(ay) || 0), 1));
  const son = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, son));
  return t.toISOString().slice(0, 10);
}
export const uzmanBag = (u, istek, bas) => ({ id: String(u?.id || ""), ad: S(u?.ad, 60), istek: String(istek?.id || ""), bas, bit: ayEkle(bas, SURELER.includes(Number(istek?.sure)) ? Number(istek.sure) : 3) });
export const uzmanSurer = (b, bugun) => !!b?.id && (!b.bit || b.bit >= bugun);
// Program kaç hafta: 1 ay 4, 3 ay ve üstü 12 (Program ekle'deki seçenekler 4/6/8/12)
export const istekHafta = (sure) => (Number(sure) >= 3 ? 12 : 4);
