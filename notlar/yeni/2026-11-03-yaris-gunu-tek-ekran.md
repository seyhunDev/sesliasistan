## Nerede kaldım

- Yarış günü sayfası (RaceDayTop) tek ekran oldu (Seyhun 2026-11-03): "Yayına git" en altta; hava bölümündeki "Harita" düğmesi yerine açık bölge haritası (`RaceWx fill` → ortak `RegionMap mini`, ortak bileşene dokunulmadı) kalan yeri doldurur, dokununca tam ekran.
- Altta siyah boşluk ve kaydırma: sayfanın `main` alt boşluğu (pb 7rem, dock varken daha fazla) lacivert alanın `min-h-dvh`'sine ekleniyordu. Lacivert alan `data-fit` taşır, `globals.css` `main:has(> [data-fit])` alt boşluğu sıfırlar. 390×844'te sayfa yüksekliği tam ekran (844).
- Hava alanının ayrılmış yüksekliği yeni tabloya göre küçüldü (18.5rem → 16.25rem; yükleme kutusu da), tablo ile harita arasındaki boş şerit kalktı. Yarıştan önceki sayfada da geçerli.
- Telefonda denenmedi.

## Sıradaki işler

- Yarıştan önceki sayfada "Yayına git" hâlâ sağ üstte (o sayfa sekmeler ve özetle zaten kayıyor); Seyhun isterse oraya da uygulanır.
