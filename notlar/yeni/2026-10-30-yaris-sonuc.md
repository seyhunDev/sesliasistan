## Nerede kaldım

- Yarış yeni yapısı 5. adım (son): yarış günlerinde alt çubuk Saha · Start · Sonuç + asistan; Yarış sekmesi yok (yarıştan sonra yine var). Yarış sayfası açılınca multimedyaya geçer (`?sec=` ile ⋯ bölümü açılıyorsa kalır, bölüm kapanınca multimedyaya döner).
- Açılış sekmesi evreye göre (`firstTab`): yarış sürerken Start; sonuç gelince, gün bitince ya da yarış bitince Sonuç.
- Sonuç: üstte gün bittiyse Yarın kartı / son gün Dönüş (`NextCard`, RaceDayTop.jsx) ve "Özeti paylaş" (Gün özeti ⋯'den kalktı); Bizimkiler satırında dünden fark (↑2 / ↓1).
- Yapının beş adımı birleşti: #907 ana sayfa satırı, #908 tek ⋯, #909 Saha, #910 Start, bu PR Sonuç.

## Sıradaki işler

- Telefonda dolaşım denemesi (hiçbiri telefonda denenmedi).
- Kalan ipucu yazıları (Medya "Videolar nerede saklanır?", Bütçe, Yolculuk, Evrak) ve Sonuçlar'da sınıf adının tekrarı ("Optimist" 3 kez) sonra sadeleşebilir.
- RaceDayTop artık yalnız ⋯ bölümünün arkasında görünüyor; ileride sadeleştirilebilir.

## Tasarım

- Yarış günü sayfası multimedyadır (Saha · Start · Sonuç); hazırlık bölümleri yalnız ⋯ içinden (Seyhun 2026-10-30, yapı haritası https://claude.ai/artifact/HMPX2oH8k7XKeoCuPgbsvD).
