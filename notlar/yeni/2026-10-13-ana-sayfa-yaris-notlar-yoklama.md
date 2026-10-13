## Nerede kaldım

- Ana sayfa Kulüp alanı yeni düzen (Seyhun'un onayladığı örnek `/mnt/project-files/ana-sayfa/yaris-kulup-notlar-oneri.png`; telefonda denenmedi):
  - Başlık "Kulüp" büyük, altında "Dikili Yelken · Ekim", sağda "Yarışlar ›" (`ClubHead`, HomeSummary.jsx).
  - Sıradaki yarış kartı: solda yeşil tarih kutusu (17 / EKİ), "5 gün kaldı" hapı, ad, "tarih · yer · N sporcu", hazırlık çubuğu "Hazırlık 4/6" ve "2 iş eksik ›" (`clubRace` day/mon/total/done, homeTiles.js; `nextInfo` total/start/place, raceHome.js). Eski kayıtlı özette tarih yoksa tarih kutusunda bayrak simgesi.
  - Notlar kartı: başlıkta sayı, "Tümü ›" ve yeşil + (yeni not). Notlar SABİT (sağda yıldız) ve SON NOTLAR (solda kategori noktası, sağda tarih) grupları (`noteGroups`). Alttaki "+ Not ekle" satırı kalktı.
- Ana sayfa Antrenman kartında güne dokununca o günün yoklaması açılır (`/athletes/attendance?gun=…`; `attHref`). Yalnız sporcu yetkisi olan hesapta ve bugün ya da geçmiş günlerde; gelecek güne dokunulmaz. Kartın altında "Yoklama için güne dokun".
- Firestore'a ek okuma yok, kural değişikliği yok. Testleri `test:elle` › "Ana sayfa kartları".

## Sıradaki işler

- Telefonda ana sayfaya bak: Kulüp başlığı, yarış kartı ve Notlar örnekteki gibi mi; Antrenman kartında bugüne dokun, yoklama açılıp kimin geldiğini seçebiliyor musun.
