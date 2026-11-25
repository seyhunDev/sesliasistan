## Nerede kaldım
- Afişten hareket fotoğrafları (Seyhun 2026-11-25: "hareketlerin hepsinin gösterildiği foto var, tek tek her hareket için yapmak istiyorum"; örnek afişler Yelken sonrası recovery, Günlük reset; telefonda denenmedi): Fitness › ⋯ › Hareketler › "Afişten". Afiş seçilir, `/api/fitness-poster` (yalnız ana hesap, Gemini görsel) her hareketin fotoğraf kutusunu (0–1000) ve kütüphanedeki aynı hareketi bulur; telefonda kesilir (`PosterImport.jsx`), her satırda hedef hareket seçilir ("Ekleme" = atla), "N fotoğrafı ekle" ile `useFitLib.setMedia` üstünden harekete eklenir (bütün programlara ve sporculara gider; hareket başına en çok 3, fazlası eskiyi iter). Afiş saklanmaz. Yapay zeka sayacı adı "fitness-poster".

## Sıradaki işler
0. Telefonda: iki afişle dene; kesimler doğru mu (yazı/numara girmiş mi), eşleşmeler doğru mu.
