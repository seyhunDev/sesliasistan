# Canlı ekran üç sütun, bayraklı start dizisi, sınıf seçimi (2026-11-01)

## Nerede kaldım
- Herkese açık ekran (`/canli/<id>`, `src/features/liveScreen`): Bugün · Genel seçimi kalktı. Üç sütun: solda sayaç, rüzgâr + parkur yan yana, video; ortada "Şu an" şeridi ve günün yarışının sıralaması; sağda genel sıralama hep görünür, biraz küçük (sıra, yelken, ad · kulüp · doğum, toplam). Tablet iki sütun, telefon alt alta. Başlık "Optimist · Mavi grup · 3. yarış". Logo yok.
- Start dizisi bayraklı: Uyarı'da sınıf bayrağı (beyaz, harf: O / 4 / 6 / 7), Hazırlık'ta seçilen bayrak (P, I, Z, U, Kara). Son dakikada hazırlık bayrağı soluklaşır (indi), startla sınıf bayrağı soluklaşır (`Flag`, `.lv-flag.down`).
- Parkur kartı küçük, dokununca tam ekran büyük (`.lv-big`).
- Parkur kartı (`lib/courseCard.js`): hat özeti en altta ayrı şeritte (Komite / Eksen yazılarıyla çakışmıyor). Rüzgâr aralığında "Olmalı 290° · Pin 8° önde" ↔ "Olmalı 300° · Komite 2° önde" ve sağ üstteki büyük derece okla aynı 14 sn döngüde değişir (SMIL opacity).
- Yayın sayfası: Başlat'tan önce Grup / Sınıf (Optimist, ILCA 4, ILCA 6, ILCA 7) / Bayrak (P, I, Z, U, Kara bayrak) çipleri; Başlat'ta `rounds[start]` içine `grp`, `cls`, `prep` yazılır (`raceRounds.cleanEntry`). Başlat'tan sonra kilitli, yalnız yazar. Biten yarış Yarışlar listesinde seçilince üç çip satırıyla düzeltilir.

## Sıradaki işler
- Telefonda ve gerçek yarışta denenmedi.
- Genel sıralamada "Kulübüm" süzgeci (istenirse).
