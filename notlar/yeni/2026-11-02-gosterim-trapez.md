## Nerede kaldım

- Canlı ekran: abandone / genel geri sonrası şeritte eski start saati yazmıyor; abandone saati ve "Uyarı işareti · Yeni start bekleniyor". Programdaki tahmini saat geçti ve geri sayım yoksa "Uyarı işareti · Bekleniyor · Program 14:00" (`waitTurn` LiveScreen.jsx).
- Yayın › Parkur › Ekranda gösterim: Parkur / Rüzgâr / Program ayrı düğmeler; elle açılan kaldırılana kadar her evrede (yarış öncesi, sırasında, sonrasında, gün sonu) ekranda (`courseShow.one`, lib/raceRounds.js showSlide). "Starttan önce otomatik" açık/kapalı.
- Rota kartı tipleri (lib/raceCourse.js CARD_TYPES): "Standart rota" (şimdiki) ve "Trapez rota" (Optimist: pupadaki 3s/3p kapısı dönülür, orsayla yukarıdaki finişe; 4 kapısı yok). Yayın › Parkur kartları'nda kart başına tip seçilir. Şekil courseCard.js geom (`up`).

## Sıradaki işler

- Seyhun gerçek rota kartlarını (Optimist trapez, ILCA) gönderince şekiller ona göre düzeltilecek; ILCA'da ilk starttan sonra parkur farklı.
- Telefonda denenmedi.

## Asistan

- Yeni rota kartı geldikçe CARD_TYPES'a tip eklenir (şekil kodda, kartlar değişmez).
