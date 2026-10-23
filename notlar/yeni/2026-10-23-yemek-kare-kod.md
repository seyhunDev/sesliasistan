## Nerede kaldım

- Restoran ekranı › Hazırlanan: her siparişte kare kod ve kısa numara (#7XT9), "Bastır" (80 mm fiş: ürünler, toplam, ödeme, müşteri, adres, büyük kare kod) ve "Kuryeye ver" (elle, kalıyor).
- Kurye ekranı › "Kare kod okut": kamera açılır, fişteki ya da ekrandaki kod okununca sipariş özeti çıkar, "Teslim al" → sipariş bu kuryeye verilir (Yolda). Onaylanmamış / yolda / kapanmış siparişte nedeni söylenir.
- Kod: `src/yemek/qr.js` (kod "VY:<id>", pickupOf), `ui/OrderQr.jsx`, `ui/PrintSlip.jsx` (globals.css `.print-slip`, yalnız basarken), `ui/ScanSheet.jsx`. Kütüphaneler pakete eklenmedi (bulutta npm kilidi xlsx yüzünden kuruluyor değil): `src/lib/vendor/qrcode.mjs` (qrcode-generator, MIT), `src/lib/vendor/jsQR.cjs` (jsQR, Apache-2.0; yalnız okuturken yüklenir).
- Telefonda denenmedi (kamera ve yazıcı).

## Sıradaki işler

- Siparişteki kurye seçilemesin, Yönetim'de müsait / siparişte; Dikili'de 6 deneme kuryesi; en yakın müsait kuryeye otomatik atama.
