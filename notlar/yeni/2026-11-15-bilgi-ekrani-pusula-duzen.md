## Nerede kaldım

- Bilgi ekranı yeni düzen (Seyhun 2026-11-15 örnek 4 "Yap"): üstte ortada en büyük pusula derecesi (`.bz-hd`, min(34vw,20vh)) + yön harfi + kayan şerit, ortada parkur, start sürerken altta mavi süre (`--bz-tm`, pusula sayısıyla karışmasın), start yokken süre gizli ve parkur uzar; saat sağ altta küçük ve soluk (`.bz-clk`). Yatayda solda pusula + süre, sağda parkur + mesaj (grid alanları cmp/crs/tm/msg).
- Pusula eğim düzeltmeli (Seyhun: "öne arkaya yatırınca değişmemeli, yalnız sağa sola"): `lib/bilgi.js` tiltHeading(alpha, beta, gamma, ekran açısı) dönme matrisinden ekranın yukarı ekseni + arka yüz yatay izdüşümlerinin toplamı. Öne/arkaya yatırmada değişmez (beta 0..100 aynı derece, node ile denendi). Android deviceorientationabsolute; iPhone alpha keyfi olduğu için telefon düze yakınken webkitCompassHeading ile ofset bulunur. Yön birim vektörle yumuşatılır. Kayıttaki yatış (gamma) ve baş-kıç (beta) aynı.
- Telefonda denenmedi.

## Sıradaki işler

- Android'de dene: telefonu öne/arkaya yatır, derece sabit kalmalı; sağa sola çevir, değişmeli.
