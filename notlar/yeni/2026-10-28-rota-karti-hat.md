## Nerede kaldım

- Seyhun 2026-10-28: kartta komite altta, pin üstte (dik) çiziliyordu. Start hattı artık her zaman rüzgâra dik, yatay: pin solda, komite sağda. Ölçülen hat yalnız avantaj kadar eğer. Ters yön (komiteden pin) aynı hat sayılır, 35°'den büyük sapma ölçüm hatası sayılıp düz çizilir (`src/lib/courseCard.js` geom).
- Parkur sekmesinden harita kaldırıldı ("Kart gayet iyi, kart üstüne çalışalım"). Haritaya dokunarak ölçüm ekleme yerine şeritte "Elle ekle" düğmesi var.
- Test: yaris.mjs "rota kartı start hattı".

## Sıradaki işler

- Kart üstüne çalışmaya devam (Seyhun'un isteğine göre).

## Tasarım

- Parkur = yalnız rota kartı, harita yok. Start hattı kartta hep yatay (rüzgâra 90°).
