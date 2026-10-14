## Nerede kaldım

- Zildeki bildirim başka yoldan görülünce de görüldü oluyor (Seyhun: "mesaj geldi, zile düştü; Mesajlar'dan açıp okudum ama zildeki bildirim kaldı"; telefonda denenmedi). Önceden zildeki sayı yalnız zil penceresi açılınca düşüyordu (`inboxSeen` tek zaman). Artık bildirimin işi başka yoldan açılınca o bildirim `read` işaretlenir, zil ve uygulama simgesindeki sayı düşer: sohbet açılıp okununca (etiket `chat-<id>`; sohbet açıkken gelen yeni bildirim de), plan/görev/not ekranı açılınca (etiketin sonundaki kayıt kimliği), bildirimin gittiği sayfaya başka yoldan gidilince (ör. `/receipts/<id>`). Eşleşen okunmamış yoksa Firestore'a yazılmaz (`inboxMatch`, `inboxSeeOne`, lib/inbox.js; `InboxSeen`, `seeInbox`, features/home/InboxSeen.jsx; ChatView, AddSheet). Aynı sohbetten yeni mesaj gelince yeniden okunmamış olur. Kural değişikliği yok. Testi `npm run test:bildirim` › "Bildirim kutusu (zil)".

## Sıradaki işler

- Telefonda dene: başka hesaptan mesaj at, zile dokunmadan Mesajlar'dan sohbeti aç; ana sayfaya dönünce zilde sayı düşmüş olmalı, uygulama simgesindeki sayı da.
