## Nerede kaldım
- iPhone widget ailesi (Seyhun: "widget'ı geliştirelim… bugün yapılacaklar, mesaj, hesap… rüzgâr grafiğimiz olmalı… İngilizce kelime kilitli ekranda da olmalı"; örnek `/mnt/project-files/iphone/widget-ornek-3.png`; telefonda denenmedi):
  - Ana ekran: Bugün (büyük: rüzgâr grafiği, sayaç, sıradaki işler, Mesaj/Hesap/Aidat kutuları), Rüzgâr (orta), Sıradaki (küçük/orta), Kelime (orta), Mesaj, Hesap (küçük).
  - Kilit ekranı: Rüzgâr (tek renk mini grafik), Sıradaki (3 iş), Kelime, Özet (saatin üstü: "3 iş · 2 mesaj").
  - Rüzgâr grafiği ana sayfadakiyle aynı kural (`mobil/ios/App/VeloraWidget/Ruzgar.swift`, open-meteo, 25 dk saklanır). Hesap tutarı kilitliyken gizli.
  - Veri: `src/features/ios/WidgetFeed.jsx` (yalnız iPhone uygulamasında) → `src/lib/widgetData.js` (widgetMsgs, widgetMoney, widgetDues, dayWord). Ek Firestore okuması yok (useMoney ana sayfayla aynı sorgu, aidat bu cihazdaki özet).
  - Dokununca `velora://ac/<yol>` → uygulamada o sayfa ("go:/yol", IosBridge).
  - Kelime `widgetWord()` (src/lib/englishWords.js, #710): önce çalışılan kelimeler, yoksa günün kelimesi.
  - Test: elle › iPhone widget ve titreşim (5).

## Sıradaki işler
0. Xcode'da yeniden çalıştır (App ve VeloraWidget Team), ana ekrana ve kilit ekranına widget ekle, rüzgâr grafiği ve dokununca açılan sayfaları dene.
1. Kilit ekranı renkli "Bugün" şeridi (örnek 2) Seyhun'un seçimini bekliyor.
