## Nerede kaldım

- Yarış yeni yapısı 3. adım: Parkur sekmesi "Saha" oldu (rüzgâr simgesi, Yarış'ın hemen yanında). En üstte seçili günün yarış havası (RaceWx `pinned`, gün üstteki Bugün ▾'dan), altında rota kartı, Yön ekle · Pusula, Özet, Ölçümler.
- Sesle ya da Hava'dan yazılan rüzgâr (raceLive.wind) artık görünüyor: o günün ölçümlerine ve karta katılır (`withLiveWind`, src/lib/raceCourse.js); dokununca silinir (raceLive'dan).
- Yarış sekmesindeki hava şimdilik duruyor; Sonuç adımında Yarış sekmesi kalkınca tek yer Saha olacak.

## Sıradaki işler

- 4. adım: Start (Süre + Medya, Kayıt içinde). 5. adım: Sonuç (Yarış sekmesi kalkar; sayfa evreye göre açılır).
