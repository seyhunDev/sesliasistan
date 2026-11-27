## Nerede kaldım
- Sporcular yalnız Velora'dan (Seyhun 2026-11-27: "sporcuları Velora'ya taşıdım, Dikili Yelken'in database'ini kaldıralım, her şeyi Velora'dan yapacağız; taşı butonunu da kaldıralım"; telefonda denenmedi). `features/athletes/data.js` her işi `orgs/{uid}/athletes` (+ `history`), `sailingClasses`, `coaches`'tan yapar (bellek önbellekli bağlantı `veloraMem.js`, `/api/sporcu-giris`); eski kulüp veritabanına (dikili-c7cc8) düşen yol, "Kulüp hesabına bağlan" formları (Sporcular, sporcu sayfası, yoklama, yoklama raporu, yarış, aidatlar) ve "Kulüp hesabı · bağlantıyı kes" satırı kalktı. Taşıma düğmesi ve kodu kaldırıldı (`MoveAthletes.jsx`, `/api/sporcu-tasi`, `lib/athleteCopy.js`, testi). Kulüpteki veri silinmedi (yedek). Yarış ekranı testi sporcuyu Velora'ya yazar (`scripts/yaris-ekran-test/senaryolar.mjs`); yerel testte (emülatör) bellek bağlantısı yerine ana bağlantı kullanılır. Kural değişikliği yok.
- Eski veritabanına bağlı kalan tek şey: gönderi › Paylaş › "Kulüpten haberler" (`posts/clubNews.js`, `NewsPanel.jsx`, `athletes/dikili.js`, `athletes/Connect.jsx` DikiliLogin). Seyhun'a soruldu.

## Sıradaki işler
0. Telefonda: Sporcular listesi, sporcu sayfası, + sporcu ekle, yoklama, aidatlar; hiçbir yerde kulüp girişi sorulmamalı.
1. "Kulüpten haberler" kalsın mı, kalksın mı (cevaba göre `dikili.js` ve `Connect.jsx` tamamen silinir).
