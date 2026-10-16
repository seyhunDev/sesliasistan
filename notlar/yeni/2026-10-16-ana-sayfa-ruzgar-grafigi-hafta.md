## Nerede kaldım

- Ana sayfada bugünün rüzgâr grafiği ve hafta şeridi (Seyhun: "ana sayfadaki hava alanında o grafiği gösterelim, hangi saatteysek orada nokta olsun; takvimde günleri ve üstünde renkli küçük noktalarla gösteriyorduk, aynı şekilde devam etsin"; telefonda denenmedi):
  - Başlığın hemen altında "Rüzgâr · bugün, kn" kartı: bugünün saatlik rüzgârı ve sağanağı küçük grafikte, şu anki dakikada nokta. Dokununca hava penceresi açılır (`HomeWind`, HomeHero.jsx; `TodayWind`, `WindChart mini`, DaySheet.jsx). Hava gelmediyse kart çizilmez.
  - Takvim kartının üstüne hafta şeridi geri geldi: 7 gün dairesi, altında renkli noktalar (plan yeşil, fitness turuncu), güne dokununca o günün penceresi (`WeekStrip`, SiradaCard.jsx).
  - Firestore'a ek okuma yok, kural değişikliği yok.

## Sıradaki işler

- Telefonda ana sayfaya bak: rüzgâr grafiği okunuyor mu, nokta şu anki saatte mi; hafta şeridi eskisi gibi mi.

## Tasarım

- Ana sayfa: başlık › bugünün rüzgâr grafiği (şimdi noktası) › takvim kartı (üstte hafta şeridi, altında iki gün ve sırada bekleyenler) (2026-10-16).
