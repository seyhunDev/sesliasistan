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
  atandi: "Uzmana iletildi",
  kabul: "Uzman kabul etti",
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
