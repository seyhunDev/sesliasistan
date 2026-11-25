## Nerede kaldım

- Canlı ekran (Seyhun 2026-11-03 19:12, örneğe "yap" 19:15):
  - Start kartı sağ üstte; sağ kart varsa (dizi, tehir, erken start) onun altında duruyor (.gr-tl / .gr-tlr).
  - Geri tuşu kaldırıldı (.gr-back yok).
- Rüzgâr · Parkur · Program artık sol alttan yukarı açılan tek panelde (GDrawer). Panel opak lacivert, bulanık değil. Sekmeler altta; açık bölümün rengi üstte ince çizgi olarak görünüyor.
- Beklenen rüzgâr çizgi grafikle gösteriliyor (WindChart):
  - Rüzgâr dolu alan, sağanak kesik çizgi.
  - Start anı pembe çizgi ve o saatteki kn ile işaretli.
  - Saat saat yön okları var.
  - 12 saat gösteriliyor; gece yarısından sonrası "YARIN" bölümü oluyor.
- Saatler `lib/raceRounds.js` windAhead ile seçiliyor. /api/canli tahmini ertesi günle birlikte alıyor (forecast.next).

## Sıradaki işler

- Telefonda denenmedi.
- Parkur bölümünde sahne küçük görünüyor; istenirse parkur çizimi panelde büyütülür.
