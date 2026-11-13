## Nerede kaldım

- Ortak Hava kutusu (HavaPanel, `src/features/weather/WxPanel.jsx`; ana sayfa ve hava sayfası) yağışı gösterir (Seyhun 2026-11-13 "son bulutlara göre… bulunduğumuz alanda yağmur beklentisi varsa grafikte de göster, beklenen miktarla"):
  - Grafikte saat saat mavi yağış çubukları (mm), en çok olan saatin üstünde miktar; lejantta "yağış".
  - Bugün radar (son 2 saat) burada yağış görmediyse o saatlerin tahmin yağışı düşer (`radarRows`, HavaPanel kendi `useRainRadar` çağırır, 10 dk önbellek).
  - Grafiğin altında "Yağış" satırı: önce beklenen (`rainLine`: "18:00'da orta, 2 mm bekleniyor"), sonra radar (`hereLine`: "Burada yağmıyor · 12 km batısında orta · 17:14"). Yağış yoksa satır yok.
- Hava sayfasındaki ayrı "Şu an" satırı (NowRain) kaldırıldı, aynı bilgi Hava kutusunda. NowRain yarış havasında (RaceWx) duruyor.
- Yayın #1419 Google Fonts indirme hatasıyla düşmüştü (koddan değil); yeniden çalıştırıldı.

## Sıradaki işler

- Hava sayfası alt kısmı örneği "yap" bekliyor.
