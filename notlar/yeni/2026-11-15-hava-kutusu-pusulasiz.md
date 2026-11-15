## Nerede kaldım

- Ortak Hava kutusu (HavaPanel + WindChart, `src/features/weather/WxPanel.jsx`; ana sayfa ve hava sayfası) yeni tasarım (Seyhun 2026-11-15, örnek ana-sayfa/sade-2026-11/hava-gomulu.html v2, "Yap"):
  - Pusula kaldırıldı. Üstte büyük rakamla rüzgâr (kn) + estiği yönü gösteren ok (`WindArrow`, derece geldiği yön), altında "320° Karayel · sağanak 18"; sağda sıcaklık, gök adı, en düşük/en yüksek. İstasyon ölçümü varsa kırmızı noktalı "ölçülen HH:00".
  - Bulutlu/yağışlı/sisli havada arkada yavaş kayan iki yumuşak gölge (`.iph-cl`).
  - Grafik kutunun bir ucundan öbürüne, eksensiz, yumuşak eğri; yağış bandı (#1420 `rainSpan`) korunuyor. Altında 3 saatlik bloklarda ok + rüzgâr aralığı, derece, gök, sıcaklık.
  - Yağış en altta tek satır (`.iph-rain`, sığmazsa "…"); bugün yağış saatleri geçtiyse satır yok. Hava sayfasında radar yakında yağış görürse "Burada yağmıyor · N km … yağış var".
- Tarayıcıda telefon, iPad dik/yatay ve hava sayfasında denendi; gerçek cihazda denenmedi.

## Sıradaki işler

- Takvim kısmı (Seyhun: hava bitince takvime geçilecek).
- Renk paleti seçimi bekliyor (renkler.html).
