## Nerede kaldım

- Mesajlar sohbetinde fotoğraf, kamera, dosya ve sesli mesaj (Seyhun: "fotoğraf gönderme, dosya gönderme, sesli mesaj gönderme kurallarıyla birlikte"; telefonda denenmedi): yazı kutusunun yanındaki ataş penceresinde Fotoğraf, Kamera, Dosya, Sesli mesaj. Önceden bunlar "yakında" yazıyordu, sesli mesaj hiç çalışmıyordu. Fotoğraf telefonda 1600 px'e küçültülür; dosya en çok 20 MB, fotoğraf ve ses 10 MB; sesli mesaj en çok 5 dakika, 1 saniyeden kısası gönderilmez. Dosyalar Firebase Storage'da `orgs/{org}/chatFiles/{sohbet}/{gönderen}/{id}`, mesajda künye `file {kind, name, type, size, path, url, w, h, sec}` (`src/lib/chatFile.js`, `src/features/chat/chatUpload.js`). Balonda fotoğraf, oynatıcı ya da dosya satırı; listede ve bildirimde "📷 Fotoğraf", "🎤 Sesli mesaj 0:12", "📎 ad". Arşivden silinen mesajın dosyası da silinir. Sporcu kısıtları aynı.
- Mesaj kutusuna dokununca yanıp sönen imleç kutunun dışında kalıyordu: klavye açılınca kutu birkaç kez yeniden çizdirilir (ChatView `fit`, `onFocus`).
- KURAL DEĞİŞİKLİĞİ VAR: storage.rules (chatFiles: yalnız sohbetin üyeleri okur/yükler, boyut sınırı) ve firestore.rules (mesajda `file` alanı, eki olan mesaj yazısız olabilir).

## Sıradaki işler

- İki kuralı Firebase konsolunda yayınla (Firestore ve Storage).
- Telefonda bir çalışana fotoğraf, PDF ve sesli mesaj gönder; karşı telefonda açılıyor ve oynuyor mu bak.
