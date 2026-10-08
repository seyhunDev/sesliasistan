## Nerede kaldım

- Sesli arama kullanım takibi (Seyhun: "tüm aramaları ben tutmak istiyorum, kota yaklaşınca haber verilsin, ayarlarda her görüşmenin kaç MB olduğunu göreyim"; telefonda denenmedi): arama bitince iki telefon da kendi ölçtüğünü (`getStats`: gönderilen/alınan bayt, TURN'den geçti mi, süre; `pickStats`, call.js) `/api/call-stats`'a gönderir. Sunucu arama kaydına `stats.<uid>` yazar ve ay sayacını tutar: `usage/calls_{org}_{YYYY-MM}` {calls, sec, bytes, relayBytes, warn80, warn100} (`recordCall`, src/lib/server/callUsage.js; aynı kişi iki kez sayılmaz). TURN kotası (Cloudflare ücretsiz kısım, `TURN_LIMIT_GB`, varsayılan 1000 GB) %80'e ve sınıra gelince ana hesaba bildirim; sınır dolunca `/api/turn` ay sonuna kadar TURN vermez (ücret çıkmaz, Wi-Fi'de doğrudan bağlanan aramalar sürer). Ayarlar › Aramalar (yalnız ana hesap): bu ay konuşma sayısı, süre, MB, TURN kota çubuğu, geçen ay ve son 60 arama (kim kimi aradı, süre ya da Cevapsız/Reddedildi, tarih, MB, "TURN"). MB bu sürümden sonraki aramalarda görünür. Kural değişikliği yok (yazmayı yalnız sunucu yapar). Testleri `test:elle` › "Sesli arama".

## Sıradaki işler

- Bir arama yap, bitir, Ayarlar › Aramalar'ı aç: arama listede, süre ve MB görünüyor mu. Mobil internette yapılan aramada "TURN" yazmalı (Cloudflare TURN kuruluysa).
