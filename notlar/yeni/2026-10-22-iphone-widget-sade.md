## Nerede kaldım
- iPhone widget'ları yeni sade tasarım (Seyhun: "daha profesyonel, daha sade… rüzgâr grafiği, sayaç varsa sayaç, banka aidat, mesajı kaldır, antrenman… süreye basıp antrenmanın süresine"; onay "Yap", örnek `/mnt/project-files/iphone/widget-ornek-4.png`; telefonda denenmedi):
  - Velora (büyük, iOS 17+): rüzgâr grafiği, antrenman / canlı sayaç + "Süre" (doğrudan `/training/day?id=…` ya da çalışan sayacın sayfası), banka ve aidat; widget'a basılı tut › Edit Widget ile bölümler (rüzgâr, antrenman, banka, aidat, sıradaki planlar, kelime) açılıp kapanır.
  - Rüzgâr (orta + kilit), Antrenman (küçük + kilit; sayaç çalışırken mor ve canlı), Banka ve aidat (küçük + kilit; tutar kilitliyken gizli), Kelime, Sıradaki, Özet (saatin üstü "Antrenman 16:00 · 12 kn").
  - Mesaj ve Hesap widget'ları kaldırıldı. Veri: `widgetTraining` (src/lib/widgetData.js), WidgetFeed `training`.
  - Kilit ekranı widget'ları kendiliğinden çıkmaz: Lock Screen › Customize ile eklenir.

## Sıradaki işler
0. Xcode'da yeniden çalıştır; büyük Velora widget'ında Edit Widget ile bölüm seçimini, "Süre"nin antrenman sayacını açmasını dene.
