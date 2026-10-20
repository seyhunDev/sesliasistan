## Nerede kaldım

- "Mesajları sıfırla"dan sonra Sporcular (ve Aile, Ekip) grubunda eski mesajlar görünüyordu (Seyhun, 2026-10-20). Sunucu grupları da siliyordu (Firestore emülatöründe denendi: Sporcular, Ekip, Aile, birebir, kurulan grup ve belgesiz sohbet dahil 16 mesaj → 0). Neden telefondaydı: sabit grubun belgesi silinince sohbet ekranı "henüz yok" sayıp sunucuyu dinlemiyor, bellekteki ya da telefondaki (IndexedDB) eski kopyayı gösteriyordu.
- Düzeltme: belgesi olmayan sohbette mesaj gösterilmez; silinip yeniden açılan sohbette belgeden önceki önbellek mesajları atlanır (lib/chatArchive.js `liveMsgs`, ChatView); listede belgesi olmayan grup kartı önden okunmaz (ChatList). Test: elle.mjs "Silinen sohbet". firestore.rules değişmedi; sıfırlama kurallardan etkilenmez. Telefonda denenmedi.

## Sıradaki işler

- Seyhun yayınlayıp Sporcular, Aile, Ekip gruplarını açsın: boş görünmeli. Gerekirse sıfırlamayı yeniden çalıştırmaya gerek yok, veriler zaten silinmiş.
