## Nerede kaldım

- Yarış havasında kaydırma yönü düzeldi (Seyhun 2026-10-31): sola çekince İLERİ, sağa çekince GERİ (`raceWeather.js` `SWIPE_BACK_LEFT = false`).
- Yükleme tek parça (RaceWx `Wait`): sıcaklık satırı, grafik (CockpitWind ile aynı 340/132 en-boy), saat saat derece/rüzgâr sırası, açıklama satırı ve bölge haritası düğmesinin yeri soluk kutular; üstlerinden ince ışık geçer (`globals.css` `.ck-shim`). Başka güne geçerken alan son açılan günün yüksekliğini korur (ResizeObserver, `data-ready`). Yağmur şeridi yalnız yağmur olan günde veri gelince eklenir.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda yüklemenin gerçek grafikle aynı boyda olduğuna bakmak.
