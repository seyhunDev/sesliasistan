## Nerede kaldım

- Antrenman sayfası telefonda yeni düzen (Seyhun 2026-11-12 "A · Alt düğme"; örnek /mnt/project-files/antrenman-ipad/telefon-ornekler.html): iPad ile aynı dil. Üstte geri, ad, ⋯ (Parkur, Video, Kamera; alttan pencere). Sabit boylu Start kutusu: sağ üstte Yoklama · Günlük, büyük süre, süre seçimi + Yarış olarak say; geri sayımda −1/+1; startan sonra Sesle söyle · DNF. Altında sekmeler Sporcular (startan sonra Bitiren kim?) · Sıralama · Rüzgâr (ortak hava tablosu). En altta sabit şerit: ana düğme hep aynı yerde (Start ver → İptal → Yarışı bitir) ve asistan küresi. Eski canlı ekran görünümü (arkada deniz/kamera, alt çubuk paneller) kalktı; kamera ve video pencerede oynar.
- Kod: `src/app/(app)/training/day/page.jsx` telefon dalı (`.tw.tp`, `.tp-*` trainLive.css sonu), sporcu kareleri `athTiles` iPad ile ortak. Ekran testi `test:yaris-ekran` "Antrenman › telefon" (kutu boyu ve ana düğmenin yeri durum değişince aynı).

## Sıradaki işler

- Seyhun telefonda denesin.

## Tasarım

- Antrenman telefon: ana düğme altta sabit şeritte, kutular durumdan duruma aynı boy; Parkur/Video/Kamera ⋯ içinde.
