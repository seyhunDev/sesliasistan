## Nerede kaldım
- Ana sayfa yeni tasarıma geçti (Seyhun 2026-11-04 "A · Hava manzarası", örnek yeni-ana-tam): üstte havanın kendisi (`.ck-hero`, gökyüzü rengi `data-sky`: açık, parçalı, bulutlu, yağmur, fırtına, kar, gece; yağmurda çizgiler akar), büyük sıcaklık, hissedilen, günün yağışı, rüzgâr; altında Grafik / Tablo sekmesi (seçim `localStorage sa-home-wx`; Grafik = CockpitWind, Tablo = HourTable). Yarış başka yerdeyse iki tablo (PlaceTable) hero'nun içinde.
- Hero'nun altı açık zeminde: günler (her günün havası: simge + en yüksek derece; bugün lacivert), canlı yarış şeridi, Sıradaki plan (lacivert kart), bugünün/seçilen günün saat çizelgesi (`DayTimeline.jsx`: saatin havası, renkli plan kartları, şimdi çizgisi, Yoklama / Yapıldı / Yarış sayfası düğmeleri; eski DayPlans kalktı, "Takvim ›" /plans'a gider), iş düğmeleri (kabarık `.hb`, Yoklama bugün antrenman varsa mavi ana), Kulüp kutuları (açık `hb-card`), Notlar. Alttaki lacivert alan (`home-navy`) kalktı.
- Kalkanlar: useFit (ilk ekranı ekrana sığdırma), eski lacivert kokpit (.ck-top) ana sayfada.
- Geniş ekran: `.home-ck` ızgarası ve ck-a/b/c/d aynı; yalnız ≥48rem'de hero kenarlara yaslanmaz (yuvarlak köşe, globals.css .ck-hero satırı).

## Sıradaki işler
- Telefonda denenmedi; hero yüksekliği ve ilk ekranın sığması denenmeli.
- Yarış başlangıç çizgisi (Start 12:40) rüzgâr grafiğinde yok (örnekte vardı); yarış verisi ana sayfa grafiğine bağlanmadı.
- Hava sayfası hava ekibinde.
