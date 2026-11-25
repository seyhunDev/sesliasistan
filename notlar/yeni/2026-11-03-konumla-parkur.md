## Nerede kaldım

- Konumla parkur (Seyhun 2026-11-03): Yayın › Parkur › Konumlar'da Komite, Pin, 1, 2, 3 ve Finiş için "Buradayım" düğmesi var. Basınca telefonun konumu course.pts'e yazılır (`saveCoursePt`; yeni ad `fin` = finiş teknesi). Satırda "Sil" de var.
- Girilen nokta çizimde gerçek yerinde durur (`lib/courseCard.js` withReal). Girilmeyen noktalar rota kartına göre yerleşir. Eksen ölçülmemişse eksen, start ortasından girilen 1'e doğru alınır.
- Girilen nokta rüzgâra göre olması gereken yerden 5° (GHOST_DEG) ya da daha fazla kaymışsa, olması gereken yer aynı mesafede bulanık çizilir; girilen yere ince kesik çizgiyle bağlanır. Pin için ölçü komiteden, diğerleri için start ortasından alınır. Satırda "Rüzgâra göre N° sağda/solda" yazar.
- Tekne takibi ve canlı tekne ekranı için tek saf işlev: `coursePoints(c)` (lib/courseCard.js). Dönen noktalar: komite, pin, m1, m2, m3s, m3p, fin1, fin2; trapez değilse m1a, m4s, m4p da var. Her noktada {lat, lon, manual} bulunur. Ayrıca ghost ve off döner. Komite ya da pin girilmemişse null döner.

## Sıradaki işler

- Telefonda denenmedi. Konum izni ve doğruluk (±m) suda denenecek.
- İstenirse sesle "burası komite" eklenebilir.
