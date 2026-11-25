## Nerede kaldım
- Ana sayfa hava kartı Windy gibi saat saat tablo oldu: `src/features/weather/HourTable.jsx` (ortak bileşen), Cockpit'te CockpitWind yerine. 3 saatte bir sütun, ertesi gün de var, sola kaydırılır; satırlar saat, gökyüzü, sıcaklık, hissedilen (veri yoksa yok), yağmur mm (3 saatin toplamı, mavi sayı + şiddet şeridi), rüzgâr, sağanak (colorOf kutusu), yön oku. Şimdiki saat kırmızı çerçeve. Dokununca /weather.
- Renkler `--ht-*` CSS değişkenleriyle; açık sayfada `tone="light"`.
- Yarış başka yerdeyse eskisi gibi iki ince şerit (WindStrip).
- Testler: elle "saat saat hava tablosu", ekran "saat saat hava tablosu".

## Sıradaki işler
- Hava sayfası (WeatherTop) aynı HourTable ile hava iş parçacığı tarafından yapılacak; CockpitWind orada ve RaceWx'te duruyor.
- Telefonda denenmedi.
- Kulüp kutuları (HomeSummary tiles) ana sayfada geri geldi (Seyhun: "ana sayfadaki kulüp kutuları kalsın"); Yemek · Market · Giyim, Deniz trafiği · Kameralar ve alt kartlar yine yok.
