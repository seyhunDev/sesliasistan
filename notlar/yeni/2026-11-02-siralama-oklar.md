## Nerede kaldım

- Canlı ekran sıralama panelinde her sporcunun yanında ok var: bir önceki yazılan şamandıraya göre ▲ yükseldi (yeşil) ya da ▼ düştü (kırmızı). Sağda kendi dönüş sıraları "4 · 2 · 1" diye yazıyor, atlanan şamandıra "–" (Seyhun 2026-11-02).
- Şamandıra atlanabiliyor: 3 atlanabilir, 1'den sonra doğrudan finiş yazılabilir (applyRound bunu zaten destekliyordu). Ok, son iki yazılan noktaya göre hesaplanıyor (raceRounds.rankMove).
- Sıralama her dönüşte kendiliğinden oluşuyor (standings: en ileri nokta, sonra o noktadaki sıra).
- Test: yaris.mjs "sıralama: atlanan şamandıra, yükseldi/düştü oku".

## Sıradaki işler

- Gerçek yarışta dene; tam sıralama tablosuna (dokununca açılan) da ok eklenebilir.
