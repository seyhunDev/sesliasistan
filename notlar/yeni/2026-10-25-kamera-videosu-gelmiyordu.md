## Nerede kaldım

- iPhone uygulamasında Kayıt ile çekilen video Medya'ya gelmiyordu (Seyhun 2026-10-25, 20 sn'lik video). Neden: sayfa canlı siteden (https) açılıyor, VeloraKamera dosyayı capacitor:// adresiyle veriyor; Capacitor .mp4/.mov uzantılı dosyaya CORS başlığı koymadığı için `fetch` düşüyor, hata yalnız konsola yazılıyordu. Fotoğraf (.jpg) etkilenmiyordu.
- Düzeltme: VeloraKamera.swift `cevap` videoyu `.dat` uzantısıyla verir (tür ayrıca `type` ile gider); RecPick alınamazsa "Kayıt uygulamaya alınamadı" der. Videonun aslı zaten Fotoğraflar'a kaydediliyor.
- Xcode'dan yeniden kurulum gerekir. Telefonda denenmedi.

## Sıradaki işler

- Seyhun yeniden kurup 20 sn ve 80 sn video denesin; Medya'da görünmeli, yükleme %100 olmalı.
