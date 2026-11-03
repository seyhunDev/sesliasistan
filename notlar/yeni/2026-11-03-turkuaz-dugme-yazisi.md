## Nerede kaldım

- Gün penceresinde (ana sayfa › güne dokun, lacivert pencere) turkuaz düğmelerin beyaz yazısı okunmuyordu. Lacivertte ve koyu temada vurgu açık camgöbeği (#67e8f9 / #4fc8e0) olduğu için beyaz yazı kayboluyordu.
- Yeni renk değişkeni `--on-acc`: açık temada beyaz, koyu temada ve `.navy` içinde koyu lacivert (#06283a). `.btn-primary` ve `bg-acc text-white` birlikte kullanılan her yer bu rengi alır.
- Aynı sorun: `.navy` içindeki `btn-secondary` beyaz zeminli kalıyordu (açık yazı); artık koyu temadaki gibi koyu zemin.
- `#0ea5c4` dolu zeminli düğmeler (`.ck-sel`, `.ck-pill.act-main`, `.food-btn`, hava haritası oynat, Fitness koyu sekme/ekle) koyu lacivert yazı aldı. Yayın masası (`masa.css`) vurgu zeminleri de `--on-acc` kullanıyor.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda gün penceresi, Fitness (koyu), yayın masası ve hava haritasında düğme yazılarına bakmak.

## Tasarım

- Camgöbeği (vurgu) zemin üstündeki yazı her zaman `var(--on-acc)`; elle `#fff` yazılmaz. Sabit `#0ea5c4` / `#67e8f9` zeminde yazı `#06283a`.
