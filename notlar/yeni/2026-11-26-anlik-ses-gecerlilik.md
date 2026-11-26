## Nerede kaldım
- Anlık ses ve mesajlar yalnız gönderildiği an çalar (Seyhun 2026-11-26 "iPad evdeydi, açınca deneme diye söylediğimi duydum"). Sporcu ekranında ses/mesaj 20 sn'den eskiyse çalınmaz/okunmaz; Yönet'te sporcudan gelen ses 30 sn'den eskiyse çalınmaz (yalnız listede/günlükte durur). Önceden Yönet ilk açılıştan sonra gelen her sesi yaşına bakmadan çalıyordu (önbellekten açılış + sonradan bağlanınca eski ses "yeni" sayılıyordu); sporcu ekranında sınır 60 sn idi.
- Saat farkı: `src/lib/serverClock.js` (syncClock, serverNow, isLive), sunucu saati `/api/saat`. Ses, kalıp, mesaj ve gelen ses `at`'ı sunucu saatiyle yazılır. Ceza uyarısı ayrı (değişmedi). Test elle.mjs "Anlık ses geçerliliği".

## Sıradaki işler
- Telefonda dene: ekran kapalıyken ses gönder, 30 sn sonra aç; çalmamalı. Açıkken gönderilen ses hemen çalmalı.
- Denizde zayıf bağlantıda 20 sn'den geç gelen ses çalınmaz; sorun olursa süre uzatılır (LIVE_SES_MS).
