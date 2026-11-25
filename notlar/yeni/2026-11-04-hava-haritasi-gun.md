## Nerede kaldım

- Hava sayfasında ve yarış havasında gün değiştirince alttaki bölge haritası da o güne geçiyor (Seyhun 2026-11-04: "gün değiştirirsem alttaki haritanın da günü değişmedi"). Önceden harita gün bilgisini hiç almıyordu, hep şimdiden −2 … +24 saat çiziyordu.
- `RegionMap` yeni `day` alanı alır. Bugün değilse Open-Meteo'dan o günün 24 saati (`start_date`/`end_date`) yüklenir, kaydırıcı 00 · 12 · 23 olur, açılışta 12:00 seçilidir, radar ve istasyon ölçümü gösterilmez; altta "Yarın 14:00", "Dün 09:00" ya da "6 Kas Per 15:00" yazar. Bugün seçiliyken eski davranış (Şimdi, radar) aynen.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: Hava › Yarın, haritada saat çubuğu 00–23 ve etiket "Yarın …" olmalı.
