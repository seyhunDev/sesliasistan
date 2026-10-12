## Nerede kaldım

- Veli bilgi notunun altındaki "Gün ve saatler değişebilir. Sorular için kulübe ulaşın: …" yazısı kaldırıldı (Seyhun: "ona gerek yok"); boşalan yer programa kalır (athleteSheet.js). Telefonda denenmedi.
- Yarış › Özet › Yapılacaklar'da iş "yapıldı" işaretlenir (Seyhun: "bir tanesini yaptım, yapıldı olarak gösterilebilir mi"; telefonda denenmedi): her işin solunda daire, dokununca iş listenin altına iner, yeşil ✓, üstü çizili, "Yapıldı" etiketi; yeniden dokununca geri gelir. × (listeden çıkar, gerek yok) aynı kaldı. Kayıt yarışta yeni alan `done` (iş anahtarları; `cleanDone`, `doneSteps`, races.js). Yapılan iş sayılarda (yarış listesi, ana sayfa "… iş") kalan işe girmez. Veli bilgi notunun Son tarihler bölümünde yapılan işin yanında kalan gün yerine yeşil "Yapıldı" yazar; talimattaki son tarih o günün işleri yapılınca yapılmış sayılır (`doneFor`). Asistan: yarış sayfasında "vize başvurusu yapıldı", "velilere imzalat işini yaptım", "… yapılmadı" (`raceHereCommand` op step, `matchStep`). Kural değişikliği yok. Testleri `test:yaris` › "Yarış iş listesi" › "yapıldı …", `test:asistan` › iş yapıldı.

## Tasarım

- Yarış Yapılacaklar: soldaki daire = yapıldı (listede kalır, altta yeşil ✓), sağdaki × = gerek yok (listeden çıkar).
