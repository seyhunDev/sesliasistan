## Nerede kaldım

- Mesajlar sohbetinde iki düzeltme (Seyhun: "uzun yazılar alt satıra geçmiyor, ekrandan taşıyor; mesaj kutusuna dokununca yazı çizgisi kutunun üstünde, mesaj alanında çıkıyor"; telefonda denenmedi): (1) Uzun bağlantı (ör. GitHub release linki) ya da boşluksuz uzun yazı artık balonun içinde alt satıra geçer. Nedeni balonun en az genişliğinin en uzun kelime kadar olması (`min-width: auto`, `max-w-[78%]`'i geçiyordu) ve `break-words`'ün bunu küçültmemesiydi; balona `min-w-0`, metne `overflow-wrap: anywhere` (ChatView.jsx). (2) Mesaj kutusuna dokununca iPhone klavyeyi açarken sayfayı kaydırıyor, uygulama sohbet kutusunu yerinde tutmak için sayfayı başa alıyor; iPhone yazı imlecini eski yerinde (mesajların üstünde) bırakıyordu. Sayfa başa alındığında odaktaki yazı alanı bir kare için yeniden çizdirilir, imleç kutunun içine gelir (`fit`, ChatView.jsx).

## Sıradaki işler

- Sohbette uzun bir bağlantı gönder: balonun içinde alt satıra geçmeli. Mesaj kutusuna dokun: yanıp sönen çizgi kutunun içinde olmalı. Hâlâ dışarıda çıkıyorsa ekran görüntüsüyle yeni threade yaz.
