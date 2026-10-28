## Nerede kaldım
- Sonuçlar tablo düzeni (Seyhun onayı 2026-10-28, örnek yaris-tasarim/sonuclar-tablo.png): ResultsTab.jsx `Table`/`Row`, sütunlar Sıra · Sporcu · Doğ. · Net (Genel/Takip'te ☆). Sporcu hücresi: ad, altında işaret (Jun. kız / Junior / Kız) · yelken no · kulüp; kesilmez, alt satıra iner. Bizimkiler'de kulüp yok, Junior / Kızlar / Jun. Kızlar sıraları.
- Takip: Genel'de ☆ ile başka kulüplerin sporcusu bu yarış için takibe alınır; "Takip · n" sekmesinde genel sırasıyla görünür. Kayıt `race.follow` (RACE_FIELDS, `cleanFollow`, `saveRaceFollow`), anahtar `followKey` = sınıf + yelken no rakamları (yoksa ad). Test: yaris.mjs "sonuçlarda takip".

## Sıradaki işler
- Telefonda gerçek sonuçla bakılmadı.
