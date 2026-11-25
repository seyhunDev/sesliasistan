## Nerede kaldım
- Ortak hava bileşeni `src/features/weather/WindRibbon.jsx` ("rüzgâr şeridi"): rüzgâr dalgası colorOf renginde, noktalı hamle, 17 kn üstü amber bölge, zirve balonu, şimdi çizgisi, yön oku + saat + sıcaklık satırı. Yağmur: tahminde burada (≥%50 ve ≥0,3 mm) dolu damla, radar yakında yağış gösterip burada yoksa içi boş halka (çevreden geçecek; #1210 kuralı). Konum dışarıdan `rows` ile gelir.
- Kullanıldığı yerler: ana sayfa hava üst alanı (HeroStrip kaldırıldı), hava sayfası (üstte şerit, altta HourTable), yarış havası (RaceWx, tone="light", win ile yarış saatleri). Canlı ekran henüz bağlanmadı (Ekran thread'i `WindRibbon rows nowH h legend={false}` ile bağlayabilir).
- Ana sayfa iPad: takvim hücresinde en çok 3 plan + "+N daha" (renkli sol çizgi, saat görünür), satır en az 6,25 rem (yatayda 5,25 rem), dikeyde takvim 40 rem'den başlar sayfa kayar; düğmeler iPad'de daha büyük, dikeyde 8 düğme tek satır; dikeyde Kulüp ve Notlar yan yana, süren yarış ve plan yan yana.
- Süren yarış kartı lacivert (SÜREN YARIŞ, Aç ›), Sıradaki plan beyaz kart (tarih bloğu, kalan süre mavi, Yoklama ikincil / Süre birincil düğme).
## Sıradaki işler
- Telefon düzeni gerçek cihazda denenmedi; iPad ve telefon gerçek cihazda bakılmalı.
- Canlı ekran şeridi (Ekran thread'i).
