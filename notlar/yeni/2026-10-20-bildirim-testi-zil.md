## Nerede kaldım

- Bildirim testi zile ve simge sayısına da düşüyor (Seyhun: "gerçek bildirim gönderelim, ikonun üstünde sayıyı görmek istiyorum"; telefonda denenmedi): deneme gönderilirken `recordInbox` ile zile yazılır, bildirimde `badge` gider. Zildeki deneme satırları etiket `test-…`; "Kaydı temizle" ve 3 saatten eski denemelerin temizliği bunları da siler, gerçek bildirimler kalır. Dosyalar: src/lib/server/pushTestSend.js, src/app/api/push-tests/route.js; test bildirim.mjs.

## Sıradaki işler

0. Telefonda: 30 sn denemesi gelince simgede sayı, zilde satır; Velora'yı açıp zile bakınca sayı sıfırlanmalı.
