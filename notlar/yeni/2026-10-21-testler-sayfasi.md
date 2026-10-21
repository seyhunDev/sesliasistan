## Nerede kaldım
- Testler sayfası (Seyhun: "Testler karman çorman… her özelliğin kendi testleri olsun, her testin raporu olsun, seçilip toplu da test yapılabilsin, hepsi de"; telefonda denenmedi): Ayarlar › Diğer › Testler artık ayrı sayfa `/settings/tests` (src/features/tests). Lacivert üstte GitHub "Testler" iş akışının son sonucu (test-sonuclari dalı son.txt, depo açık olduğu için raw.githubusercontent'tan okunur; ghResult.js), Hepsini çalıştır / Seçilenler. Altta özellik özellik: Asistan (Örnek cümleler + GitHub Anlama ve akış, Asistan ekranı), Ses (Sesli okuma, Ses tanıma, elle Ses testi), Bildirimler (Deneme bildirimi, Zamanlayıcı, elle Bildirim testi), Çevrimdışı (GitHub), Uygulama (Bağlantı, GitHub Sayfalar, Birim testleri); Kayıtlar (Asistan raporu, Süre kaydı) ve Araçlar (Tanıtım, Örnek veri). Her çalıştırma bu cihazda rapor bırakır (reports.js, son 20), rapor Paylaş ile gönderilir; satıra dokununca o testin son raporu + Çalıştır.
- Yeni test eklemek: src/features/tests/registry.js içinde ilgili özelliğe bir satır (run / gh / href). GitHub bölümü son.txt başlık adıyla bağlanır.
- Eski "Örnekleri dene" (ProbeRow) ve "Deneme bildirimi" satırı (TestPushRow) kaldırıldı, işleri registry'de. Ses testi, Bildirim testi, Asistan raporu sayfaları geri düğmesiyle Testler'e döner.
- Asistan: "testleri çalıştır" (Testler sayfası açılır, telefondaki testlerin hepsi başlar), "testleri aç" (yalnız açar); ana hesap. features/tests/testWords.js, assistRoute "tests". Testler: test:asistan "Testler: …" grupları.

## Sıradaki işler
0. Telefonda: Ayarlar › Testler; Hepsini çalıştır (Örnek cümleler yapay zekaya ~17 istek, onay sorar), rapor açılıyor mu, Paylaş; Sesli okuma GOOGLE_TTS_KEY yoksa "Kaldı" der.
1. İstenirse GitHub testini telefondan başlatma (GitHub anahtarı gerekir).

## Tasarım
- Testler sayfası yeni tasarımda (lacivert üst, özellik başına liste, solda seçim kutusu, sağda son sonuç: Geçti / 22/24, kalan amber).
