## Nerede kaldım

- Yeni test: `npm run test:yaris-ekran` (test:hepsi de çalıştırır, "3. YARIŞ SAYFASI"): sahte Firebase'de yarış sayfası SPORCU SEÇİLİ açılır (yarış günü, yarıştan önce, bütün sekmeler, Multimedya). #837'deki çökme sporcusuz denemede görünmemişti; bu test o hatayı yakalıyor (denendi). Kulüp verisi (dikili.js) yerel testte emülatöre bağlanır (yayında çalışmaz); test kulüp projesine sahte sporcu, hesap ve açık kural yazar.
- Evrak yenileme (Seyhun 2026-10-26: "hiçbir değişiklik olmadan yenileme istiyor"). Nedenler: (1) hazır PDF yalnız o cihazda saklanır; başka cihazda ya da telefon sildiyse "Eski, yenilenmeli" yazıyordu, (2) sayfa açılırken cihazdaki kopyaya bakılana kadar bir an "yenile" görünüyordu, (3) aynı değeri yeniden seçmek de evrakı geçersiz sayıyordu. Şimdi: bakılana kadar uyarı yok, yalnız değer gerçekten değişince "Eski, yenile"; cihazda yoksa "Evrak bu cihazda yok · Hazırla".
- Evrakı geçersiz sayan değişiklikler: yarış adı, tarihler, sporcular, sınıf, otel adı, kulüp yazısı alanları, antrenör bilgisi, belge seçimi, sporcu bilgisi düzeltme, talimattan bilgi güncelleme. Yolculuk ve bütçe saymaz. Telefonda denenmedi.

## Sıradaki işler

- Yok.
