## Nerede kaldım

- Geçici sonuç PDF'inde gruplar karışık (Sarı, Mavi, Kırmızı satırları iç içe): satırdaki renk grubu okunurken atılıyordu (`grpOf` yalnız final grupları). Artık sonuç satırında `fl` (renk grubu; lib/resultSheet.js `flOf`), `grp` yine yalnız final grubu (sıralama bozulmaz).
- Resmî sonuç startın grubuna göre: `officialFor(fleets, n, manual, grp)` yalnız o grubun satırları (/canli Sıralama, Sonuçlar listesi, yarış satırı). Yarış sütun adları saklanıyor (`heads`: Q1…F2): final grubunun (Altın…) n. yarışı n. F sütunu, renk grubununki n. Q sütunu (`raceCol`).
- Eski kayıtlarda fl/heads yok: PDF'i Yayın › Belgeler'den bir kez daha "Oku" ile okutmak gerekir.
- Örnek: /mnt/project-files/coklu-grup/ornek-pdf/gecici-sonuc-altin-2025-11-03.pdf (yalnız Altın). Karışık gruplu gerçek PDF'le denenmedi; telefonda denenmedi.

## Sıradaki işler

- Eleme günlerinin karışık gruplu geçici sonuç PDF'iyle deneme.
