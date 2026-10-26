## Nerede kaldım

- Yarış sayfasında hava, hava sayfasıyla aynı tasarım (Seyhun 2026-10-26: "hava durumu sayfamızda kullandığımız tasarımın aynısı"): yeni `src/features/athletes/RaceWx.jsx`.
  - Yarış günü: Multimedya'nın altında sıcaklık · gök · rüzgâr satırı ve CockpitWind grafiği (RaceDayWx).
  - Yeni "Hava" sekmesi (Özet/Bugün'den sonra, her zaman): lacivert kartta grafik, altında yarış günleri gün seçici, açık zeminde "Saat saat" listesi, yenile düğmesi (RaceWxTab). Tahmin 16 günden uzaksa "Tahmin … tarihinden sonra çıkar".
  - Yolculuk'taki eski "Yarış havası" (RaceWeather.jsx) kaldırıldı; veri loadRaceDay (Multimedya › Hava ile ortak).
- CockpitWind'e isteğe bağlı `place` eklendi (ölçülen rüzgâr yarış yerinden); verilmezse eskisi gibi hava yeri.
- Telefonda denenmedi.

## Sıradaki işler

- r.weather alanı ve loadRaceWeather artık kullanılmıyor; istenirse temizlenir.
