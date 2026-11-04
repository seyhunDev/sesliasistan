## Nerede kaldım
- Mac ve iPad 2. grup: Yarış detayı (solda geniş lacivert: hava tablosu, harita, sekmeler; sağda sekmenin içeriği; yarış günü lacivert tam genişlik), Sporcular (solda kokpit, sağda sporcu kartları ızgarası), Mesajlar (iki bölme: solda liste hep açık, sağda sohbet), Hava (lacivert üst kenardan kenara, tablo tam genişlik), Aidatlar (solda kokpit, sağda sporcu kartları ızgarası; dik iPad'de iki sütun). Telefonda değişiklik yok.

## Sıradaki işler
- Diğer sayfalar aynı desenle (Fişler, Hesaplar, Envanter, Medya, Antrenman, Kişiler, Doğum günü, Arşiv, Sporcu detayı…).

## Tasarım
- `ul.card-grid`: tek kartta alt alta satırlar iPad ve Mac'te ayrı kartlardan ızgara. `split-even`: lacivert sol sütun geniş (Yarış detayı). Mesajlar `.chat-pane` / `.chat-view` / `.chat-blank` (globals.css MESAJLAR).
