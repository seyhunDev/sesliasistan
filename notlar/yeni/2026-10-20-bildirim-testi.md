## Nerede kaldım

- Bildirim testi sayfası (Seyhun: "bildirimleri elle nasıl deneyebilirim, 30 sn sonra, 1 saat önce hatırlatma, telefon kilitliyken geliyor mu"; telefonda denenmedi): Ayarlar › Diğer › Testler › Bildirim testi (`/settings/push-test`).
  - "30 saniye sonra": Yeni görev, Yeni plan, Mesaj, Fiş ödeme bekliyor, Yoklama alınmadı, Sabah özeti. Gerçek metin işlevleriyle, sonunda "· Deneme". Ada dokununca telefondaki görünüşü (simge + tek satır) açılır.
  - "Plan hatırlatması (1 saat önce)": planın saati ~1 saat 1 dk sonra olan sahte plan; hatırlatmayı gerçek 5 dakikalık zamanlayıcı gerçek kuralla (dueReminders) gönderir, yani hatırlatma zamanından 0-5 dk sonra gelir.
  - Kayıt: oluşturuldu / gönderildi (yol: "anında" ya da "zamanlayıcı") / telefona ulaştı (service worker'ın imzalı onayı, /api/ack) zamanları ve gecikme.
  - Deneme kayıtları yalnız `users/{uid}.pushTests` (+ `pushTestAt` bekleyen varsa) alanında; plan listesine, zile, simge sayısına yazılmaz. 3 saatte silinir, "Kaydı temizle" hepsini siler. Kural değişikliği yok (yazmalar sunucudan).
  - Dosyalar: src/lib/pushTest.js, src/lib/server/pushTestSend.js, src/lib/server/ackSign.js (imza, Netlify işlevleri için), src/app/api/push-tests, netlify/functions/push-test-background.mjs (30 sn bekleyip gönderir), plan-reminders.mjs (sendPushTests), /api/ack (pushTests onayı). Test: bildirim.mjs "Bildirim testi" 15 senaryo.
  - Belirsiz: Netlify arka plan işlevi (`-background`) ücretsiz planda çalışmayabilir. Çalışmazsa 30 sn denemesi zamanlayıcıyla 0-5 dk içinde gider; kayıtta yol "zamanlayıcı" yazar.

## Sıradaki işler

0. Telefonda dene: uygulama açıkken, kapalıyken, telefon kilitliyken; kayıtta yol "anında" mı "zamanlayıcı" mı.
