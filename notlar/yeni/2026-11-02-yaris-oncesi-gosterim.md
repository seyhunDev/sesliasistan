## Nerede kaldım

- Canlı ekranda yarış öncesi gösterim artık sırayla: parkur → rüzgâr (şimdiki ölçüm + start saatinde beklenen + gün boyu grafik) → bugünün programı, 12'şer sn (Seyhun 2026-11-02). Otomatik açıkken dakikada bir tur; Yayın › Parkur › "Ekranda gösterim" › "Göster" bir tur gösterir.
- Yarış başlayınca (süren yarış varken) hiçbiri gösterilmez; elle "Göster" ve yeni rüzgâr ölçümü de parkuru açmaz (önceki hata). İzleyici şeritteki Parkur'a dokunursa parkur açılır.
- Kod: src/lib/raceRounds.js showSlide (SHOW_ON 12 sn, SHOW_CYCLE 60 sn), LiveScreen.jsx slideOn / WindFloat / ProgFloat, liveScreen.css "Yarış öncesi gösterim". Test yaris.mjs "yarış öncesi gösterim".

## Sıradaki işler

- TV'de ve telefonda gerçek yarış günüyle dene; gerekirse süreleri ayarla.
