## Nerede kaldım
- Canlı ekrandaki parkur animasyonu (src/lib/courseScene.js) rota kartı oranına getirildi (Seyhun 2026-11-02 "start çok büyük, verdiğim parkur gibi olsun"; örnek kart uploads af55499b): en ve boy aynı ölçek, eğim hafif (D = 2.6 × boy), start hattı orsanın 0.38'i (`geom(card, { lineK: 0.38 })`; kartta 0.5 kaldı), tekneler küçük. Görüntü project-files/samandira-donus/parkur-animasyon/yeni-oran-a.png, yeni-oran-b.png.

## Sıradaki işler
- Büyük ekranda gerçek parkur ölçümüyle bak; 2 numaranın yeri karttan farklı görünürse geom'da reach/0.6 oranını ayarla.
