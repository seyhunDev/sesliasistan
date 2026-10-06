## Nerede kaldım

- Kendi mesajına bildirim gelmesi düzeltildi (Seyhun: "birine mesaj attığımda niye bana bildirim geliyor"; telefonda denenmedi): sunucu mesajı gönderene zaten bildirim göndermiyordu, ama bildirim aboneliği cihaza bağlı ve aynı telefonda başka bir hesapla (deneme/çalışan hesabı) girildiyse telefonun aboneliği o hesabın kaydında da kalıyordu (`users/{uid}.push`). O kişiye yazınca ona giden bildirim senin telefonuna da düşüyordu. Şimdi: (1) `/api/notify` gönderenin kendi cihazlarını her bildirimden çıkarır (`otherDevices`, src/lib/pushDevices.js; `sendTo(uid, payload, skip)`, `profileOf().devices`); (2) uygulama açılınca (oturum başına bir kez) bu cihazın aboneliği diğer hesaplardan silinir, yalnız giriş yapan hesapta kalır (`/api/push-claim`, `claimPush` push.js). Kural değişikliği yok. Testi `test:elle` › "Kendi bildirimi".
- Sohbet ekranında yapay zeka şimdilik kapalı (Seyhun: "mesajlarda input'un yanından yapay zeka küresini kaldır, şimdilik kullanmayacağız"): yazı kutusunun yanındaki asistan küresi ve son mesajın altındaki yapay zekalı "hazır yanıt" önerileri görünmez; kutu boşken gönder düğmesi soluk durur (`CHAT_AI = false`, ChatView.jsx; true yapılınca ikisi geri gelir). Diğer sayfalardaki asistan çubuğu değişmedi.

## Sıradaki işler

- Telefonda bir kişiye mesaj at: kendi telefonuna bildirim gelmemeli. Sohbette yazı kutusunun yanında küre olmamalı, yazınca gönder düğmesi çalışmalı.
