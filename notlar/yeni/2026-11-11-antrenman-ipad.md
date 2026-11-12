## Nerede kaldım

- Antrenman sayfası iPad'de "A · Üç sütun" (Seyhun 2026-11-11 "A yap"; örnek /mnt/project-files/antrenman-ipad/ornekler.html). `/training/day` geniş ekranda (≥48rem, `useWide`) `.tw` düzeni: solda Start (büyük süre, 5·4·2·1 dk, Yarış olarak say, Start ver; geri sayımda −1/+1/İptal; startan sonra Sesle söyle · DNF · Yarışı bitir) ve altında antrenman saatinin rüzgâr eğrisi (`src/features/training/TrainWind.jsx`, dokununca ortak hava tablosu RaceWx), ortada Sporcular (puanla; gelmeyenler soluk), startan sonra Bitiren kim? kareleri, sağda Sıralama (Bugün · Genel). Parkur, Video, Kamera üstte düğme, ortada pencere açar. Dik iPad'de Start ve Rüzgâr üstte yan yana. Telefon düzeni değişmedi.
- `/training` (Antrenman günlüğü) geniş ekranda üç sütun: ay sayıları + en çok çalışılanlar · günlük · yazılmayanlar.
- Stiller `src/features/training/trainLive.css` sonu (`.tw-*`); sayfanın panel işlevleri (startPanel, rankPanel, finishParts) telefonla ortak.
- Ekran testi `test:yaris-ekran` "Antrenman › iPad: üç sütun" (yatay, dik, Parkur penceresi, günlük).

## Sıradaki işler

- Seyhun iPad'de denesin; sonra telefon düzeni aynı dile uyarlanacak (Start, sporcular, sıralama alt alta).

## Tasarım

- Antrenman sayfası iPad: üç sütun, hepsi aynı anda görünür; panel açıp kapamak yok. Ana sayfa iPad "Zaman şeridi" ile aynı dil (lacivert, ince çizgili paneller, rakamlar Space Grotesk).
