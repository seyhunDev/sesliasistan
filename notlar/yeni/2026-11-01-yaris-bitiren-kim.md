## Nerede kaldım

- Yarış günü Start sekmesine (Yarışı yönet sayfası, RaceMedia StartTab) antrenmandaki "Bitiren kim? Sırayla dokun" kareleri geldi (Seyhun 2026-11-01 yeni akış onayı): start olmuş yarışta bu yarıştaki sporcularımız (`ours`); dokununca sıra ve startan beri süre start satırına `fins: [{ id, name, t }]` olarak yazılır (`lib/raceLive.js` cleanStarts → cleanFins), tekrar dokununca çıkar; hepsi dokununca yarış biter (finishRace, sayaç durur, 8 sn Geri al). Satırda "1 Deniz · 2 Ece".
- Hata düzeltildi: start sonrası (20 dk içinde) yarış sayfası açılınca sayaç 0 olayı (onZero) yarışlar yüklenmeden boş listeye yazıyor, günün diğer yarışlarını silebiliyordu. Artık yarışlar yüklenmeden yazmaz (RaceMedia `liveIn`).
- Canlı ekran ipliğine `fins` alanı bildirildi.
- Test: test:yaris-ekran "Yarış sayfası › bitiren kim".

## Sıradaki işler

- Canlı ekranda (herkese açık) bizim sporcuların bitişi gösterilebilir (canlı ekran ipliği).
- Telefonda denenmedi.
