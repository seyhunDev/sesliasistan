## Nerede kaldım
- Seyhun 2026-11-18: sporcunun bas-konuşu Yönet'te duyulmuyor, gösterilmiyor. Kodda sessiz kalan üç yer vardı, düzeltildi:
  - Yönet gelen sesleri okuyamazsa (bilgiGelen kuralı yayınlanmamışsa) hata sessizce boş liste oluyordu; artık "Firestore kuralları yayınlandı mı?" uyarısı çıkar.
  - Ses bu cihazda çalınamazsa (biçim, izin) hiçbir şey görünmüyordu; artık konuşan tekne süre kadar haritada atar ve sebep yazar.
  - Yeni ses yalnız sporcu telefonunun saatine göre son 20 sn içindeyse çalınıyordu (saat farkında hiç çalmaz); artık Yönet açıkken gelen her yeni ses çalınır, açılıştakiler yalnız 30 sn içindeyse.
  - Sporcu tarafında gönderim başarısızsa "Ses gönderilemedi" yazar (önce yalnız titreşimdi).
- Kök neden telefonda doğrulanmadı; en olası: bilgiGelen kuralı konsolda yayınlanmamış.

## Sıradaki işler
- Seyhun kuralları yayınlayıp tekrar denesin; uyarı metnine göre devam.
