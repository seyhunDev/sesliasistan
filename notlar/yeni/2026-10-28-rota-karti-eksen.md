## Nerede kaldım

- Seyhun 2026-10-28: rota kartı rüzgâra göre değil, komitenin SABİT parkur eksenine göre çizilir. Komite 1'i eksene (ör. 140°) atar; komiteden bakınca pin eksen − 90°'de (50°) olmalı. Hakem genelde 40° ya da 60°'ye atar, rüzgâr da 110–160 arası döner.
- Kart artık eksen yukarıda (`src/lib/courseCard.js`): 1 eksende; olması gereken hat soluk noktalı, atılan hat gerçek açısında sarı kesik; pin de tekne, yanında "Pin 40°". Üstte "Eksen 140°" ve rüzgâr oku eksene göre dönmüş ("10° sağa"). Altta "Pin 40° · olmalı 50° · 10° hata" ve "Rüzgâr 150°: Komite tarafı 20° önde".
- Eksen ölçümü yoksa ilk rüzgâr ölçümü sabit sayılır (son rüzgâr değişir). Onaylı örnekler: /mnt/project-files/yaris-tasarim/parkur/eksen-kart-*.png.
- Test: yaris.mjs "rota kartı eksen".

## Sıradaki işler

- Telefonda dene: eksen 140, "komiteden pin 40", rüzgâr 150 gir; kart ve alt satırlar doğru mu?

## Tasarım

- Rota kartı = sabit eksen yukarıda; rüzgâr değişken ok. Hat hatası eksene göre, önde olan uç şimdiki rüzgâra göre.
