## Nerede kaldım

- Rüzgâr yön aralığı (Seyhun 2026-10-30 "20 ile 30 arasında oynuyor deyince iki farklı rüzgâr, animasyonlu, 3 saniyede bir; aralık seçebilmeliyim"; örnek yaris-tasarim/ruzgar-aralik, "Böyle yap"):
  - Sesle: "rüzgar 20 ile 30 arasında oynuyor", "20-30 arası", "20 ve 30 derece arasında", "20'den 30'a dönüyor", "30'dan 10'a oynuyor" → wind ölçümünde `range: [ilk, ikinci]`, `deg` aradaki orta yön (hat avantajı, dönüş, kart ortadan). "12-15 knot" hız aralığı eskisi gibi ortalama.
  - Kart (courseCard.js): ok iki yön arasında 6 sn'lik döngüde (her yön 3 sn) gidip gelir, iki uç soluk kesik çizgi; olması gereken hat da birlikte döner; altta "olmalı 290–300°" ve "Önde: Pin 5° ↔ Komite 5°" (iki uç aynı taraftaysa "Pin tarafı 5–15° önde").
  - Elle: Yön ekle › Rüzgâr › "Aralık ekle" ile ikinci yön.
  - Yapay zekâ (/api/course-parse) `deg2` döndürür.
- Tarayıcıda emülatörle denendi; telefonda denenmedi.

## Sıradaki işler

- Yok.

## Tasarım

- Rüzgâr aralığı kartta animasyonla gösterilir (3 sn bir yön); değer "20–30°" biçiminde.
