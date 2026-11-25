## Nerede kaldım
- Rüzgâr grafiğinde yağış (Seyhun 2026-10-26, örnek "A · Altında renkli şerit"): günde yağış varsa grafiğin altında saat saat renkli kutu (hafif <1 mm açık mavi, orta 1–4 mavi, kuvvetli 4–8 koyu mavi, 8+ mor), 1 mm ve üstünde içinde sayı. Saatte 4 mm ve üstü beklenirse grafiğin üstünde kehribar satır: "Kuvvetli yağış 14:00–16:00 · günde 21 mm". Ana sayfa, Hava sayfası ve yarış sayfası (aynı CockpitWind) birlikte.
- Veri: Open-Meteo saatlik `precipitation` (weather.js hourly 9. alan → dayHours `mm`; raceWeather loadRaceDay `mm`). Eski önbellekte mm yok, şerit/uyarı çıkmaz. Yardımcılar `mmTone`, `heavyRain` (weather.js).
- Testler: elle "yağış mm", "yağış rengi", "kuvvetli yağış uyarısı"; ekran testi "Hava › yağış şeridi" (Open-Meteo taklidi). Telefonda denenmedi.

## Sıradaki işler
- Yağışlı bir günde telefonda bak.

## Tasarım
- Yağış rengi tek mavi ailesi; kehribar yalnız kuvvetli yağış (saatte 4 mm+) uyarısında.
