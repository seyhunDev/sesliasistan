## Nerede kaldım

- Sporcu programını devam ettirme ve başka sporcuya verme (Seyhun: "hazırlanan program devam ettirilebilir, seviye artıralım, bir seviye her hareketin tekrarını iki artırsın, 5 seviye; aynı antrenmanı başka sporcuya da atayabileyim"; telefonda denenmedi): Fitness › Sporcular › sporcu › üç nokta menüsünde iki yeni satır. (1) "Devam ettir": seviye +1…+5 (her seviye tekrarlı hareketlere +2 tekrar: 3 × 10 → +1'de 3 × 12, +5'te 3 × 20; süreli ve kardiyo hareketler aynı), başlangıç tarihi (eski program bitmediyse bitiş günü, yoksa bugün) ve hafta seçilir, "Hazırla" ile Hazır ekranı açılır, "Kaydet ve …'e gönder" yeni program olarak kaydeder (ad "Program · 2"), eski programın o tarihten sonraki yapılmamış antrenmanları silinir (çakışmasın), yapılanlar kalır. (2) "Başka sporcuya ver": başlangıç tarihi ve sporcu seçilir, aynı program o sporcunun (yaşı doğum tarihinden) yeni programı olur, kaydedince planları yazılır ve bildirim gider; sporcunun eski programı varsa yerine geçer. `levelUp`, `copyFor`, `progEnd`, `LEVEL_MAX` (model.js), `dropFrom` (fitnessData.js), `ContinueSheet`, `GiveSheet` (FitnessHome.jsx). Kural değişikliği yok. Testleri `test:elle` › Fitness › "devam ettir (seviye)", "başka sporcuya ver".

## Sıradaki işler

- Telefonda bir sporcunun programını +1 devam ettir, takvimde yeni antrenmanlar 12 tekrarla görünüyor mu bak; bir programı başka sporcuya ver, o sporcuya bildirim geliyor mu.
- Asistanla: "Ali'nin programını bir seviye artırıp devam ettir", "Ali'nin programını Ayşe'ye de ver" (henüz yok).
- Kendi programında (Benim) "Devam ettir" yok; istenirse eklenir.
