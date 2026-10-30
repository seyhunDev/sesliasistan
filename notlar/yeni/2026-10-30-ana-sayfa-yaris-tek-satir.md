## Nerede kaldım

- Yarış yeni yapısı 1. adım (Seyhun 2026-10-30 "Yap"; yapı haritası https://claude.ai/artifact/HMPX2oH8k7XKeoCuPgbsvD): ana sayfadaki büyük yarış sayacı kalktı. Yerine tek satır: canlı nokta, yarış adı, altında günün evresine göre kısa durum (`raceLine`, src/lib/raceDay.js). Dokununca yarışın sayfası. Düğme yok.
- Satır görünmeden yine de sayaç 0 olunca yarışın start saatini yazar (eski şeritteki gibi).
- Satır açıkken Kulüp listesindeki yarış satırı tekrar yazılmaz.
- Yarış takvimi çökmesi düzeltildi: talimatta sınıf alanı dizi değilse (`classesOf`, src/lib/sharedRace.js).

## Sıradaki işler

- 2. adım: yarış sayfasında tek başlık, tek ⋯, tek gün seçimi; yarıştan önce alt çubuk yok.
- 3. adım: Saha (rüzgâr + Parkur + sesle söylenen rüzgâr). 4. adım: Start (Süre + Medya, Kayıt içinde). 5. adım: Sonuç.

## Tasarım

- Ana sayfada yarış için sayaç ve düğme yok; tek satır, dokununca yarış sayfası (Seyhun 2026-10-30: "sadece tıklama olsun").
