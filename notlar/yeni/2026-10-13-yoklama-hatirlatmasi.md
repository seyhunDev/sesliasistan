## Nerede kaldım

- Bildirim haritası ve yoklama hatırlatması (Seyhun: "bildirimler sistemi nasıl çalışıyor, tam bir harita çıkar, kopukluklar var; antrenman varsa ve yoklama doldurulmadıysa bitiş saatinde, bitiş yoksa gün batımında ana hesaba bildirim"; telefonda denenmedi). Harita: `/mnt/project-files/bildirimler/harita.md` (her bildirim, ne zaman, kime, dokununca nereye, zil ve simge sayısı, kopukluklar).
  - Yeni bildirim "Yoklama alınmadı": bugün antrenman planı (iptal değil) varsa ve bugünün yoklaması bu uygulamada girilmediyse ana hesaba antrenman bitince (saat + süre), saat/süre yoksa gün batımında (hava konumu, yoksa Dikili; hesapla, internetsiz) bir kez. Birden çok antrenmanda en geç biteni. Dokununca o günün yoklaması açılır (`/athletes/attendance?gun=…`).
  - Sunucu kulüp yoklamasını okuyamadığı için yoklama bugüne kaydedilince uygulama `users/{uid}.attLast = bugün` yazar (`mirrorChanges`, mirror.js; yoklama sayfası, asistan, antrenman günlüğü hepsi buradan geçer).
  - Ayar `users.attAt` ("on"/""): sporcu yetkili ana hesapta kendiliğinden açılır (DataProvider), Ayarlar › Günlük özetler › "Yoklama hatırlatması" ile kapatılır. Gönderildi işareti `attRemindSent`.
  - Mantık `src/lib/attRemind.js` (`sunsetHM`, `attRemindAt`, `attRemindDue`, `attRemindText`), gönderim `sendAttRemind` (plan-reminders.mjs; okuma: diğer bildirimlerle paylaşılan plan sorgusu).
  - Kopukluk düzeltmesi: plan hatırlatmasına dokununca artık o plan açılıyor (önceden Planlar listesi; `reminderText`).
  - Kural değişikliği yok. Testleri `test:elle` › "Yoklama hatırlatması".

## Sıradaki işler

- Bugün bir antrenman planı varken yoklamayı girme; antrenman bitince "Yoklama alınmadı" bildirimi gelmeli, dokununca o günün yoklaması açılmalı. Bir başka gün yoklamayı gir, bildirim gelmemeli. Ayarlar › Günlük özetler'de "Yoklama hatırlatması" görünüyor mu bak.
- Haritadaki kalan kopukluklar: velilere giden aidat hatırlatmasının gideceği sayfa yok; Dikili sitesinden ya da çalışanın girdiği yoklama "alındı" sayılmıyor. İstenirse sırayla.
