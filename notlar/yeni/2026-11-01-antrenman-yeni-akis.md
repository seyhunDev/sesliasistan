## Nerede kaldım

- Antrenman sayfası yeni akış (Seyhun 2026-11-01 "Böyle yap", örnek /mnt/project-files/antrenman-sayfasi/yeni-akis/ornek.png): tek ekran, yarışın evresine göre değişir. Alt çubuk Yarış · Videolar (+ asistan); Sonuçlar ve Hava sekmeleri kalktı. Kayıt alt çubuktan kalktı, Başlat'ın yanında "Video" düğmesi (RecPick); çekim Yarış ekranında kalır, yarışın satırında görünür (MediaTab `list`).
- Üstte Yoklama ve Günlük düğmeleri (pencere açar). Yarışta (start sonrası) "Bitiren kim? Sırayla dokun" kareleri (`src/features/training/TrainFlow.jsx` `FinishTap`): yoklamada gelenler, yoksa bütün sporcular, o da yoksa bugünkü yarışlara girenler; dokununca sıra + süre (`addFinish`), tekrar dokununca çıkar; herkes dokununca yarış biter (sıralama ve süre tek kayıt, sayaç durur, 8 sn Geri al). Altında Sesle söyle ve Start · Şamandıra · Finish kareleri.
- Günün yarışları (`useTrainList`): satırda kaç dk start, sıralama, saat · süre; biten son yarış açık (bütün sıralama süresiyle, Düzelt · Paylaş, 2+ yarışta genel durum). Satıra dokununca yarış penceresi (Races) açılır.
- Yarış kaydına `cd` (kaç saniyelik startla) eklendi (`useTrainingFlow` onStart, `raceScore.js` cleanRaces).
- Medya bilgi kartı sayfadan kalktı; doğru yazı Çekim penceresinde (iPhone uygulamasında aslı Fotoğraflar'da). Yarış Start satırında "5 dk start" ve "… sürdü".
- Test: test:yaris-ekran "Antrenman › yeni akış: bitiren kim", Start satırı.

## Sıradaki işler

- Yarış günlerine (multimedya Start) aynı akış: bizim sporcuların bitişine dokunma (raceLive starts'a bitiş kaydı gerekir).
- Telefonda denenmedi.

## Tasarım

- Antrenman: tek ekran, sekme gezmek yok; Video hep Başlat'ın yanında; sonuç bitişte dokunarak girilir, biten yarış açık görünür.
