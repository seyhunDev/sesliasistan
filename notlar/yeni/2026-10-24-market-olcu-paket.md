## Nerede kaldım
- Hazır menüde "Ölçülü set / Paketlerle" iki sekmesi kalktı (Seyhun 2026-10-24: "her üründe paket al ya da tam ölçü al… iki ayrı sekme yapmayalım", "marka ürün bazlı olsun"). Her malzemenin altında Ölçü · Paket · Marka; marka seçimi ürün başına, ölçüde de pakette de aynı. Telefonda denenmedi.
- Ölçü: tarifteki miktar paketin bir parçası (`menus.js partOf`: kaşık/bardak g-ml sayılır, sebzede adet ortalama ağırlıktan, "10'lu" pakette adetten, demet demetten). Paketin %90'ı ve üstüyse ya da hesaplanamıyorsa yalnız Paket. Fiyat paketin o kadarı, en az ₺2 (`partPrice`). Paket sayısı da artık miktardan (6 patlıcan = 2 kg paket).
- Sepette ölçü ayrı satır (`lineKey` = id~part, `part` alanı; boyut yerine "3 yemek kaşığı"); stokta paketin o kadarı bekler/düşer, stok kesirli olabilir (yönetimde 49,9 gibi görünür, `num`). Yönetimde siparişte "Ölçü · Söke · 3 yemek kaşığı".
- Hazır set ürünleri kalktı (katalog v3: bekleyeni olmayan `cat: "set"` ürünler okunurken silinir). Sesle menü eklemede de ölçü olabilenler ölçüyle gelir.
- Menü sayfasında altta boşluk büyüdü (Sepete ekle son malzemeyi kapatıyordu); yönetimde de.
- Testler `npm run test:market` 61/61.

## Sıradaki işler
0. Telefonda: Lazanya'da Un'da Ölçü/Paket değiştir, Marka › Sinangil (ölçü satırı da Sinangil olmalı), en alttaki malzeme düğmenin üstünde görünüyor mu; siparişi yönetimde teslim et, unun stoğu 49,955 olmalı.
1. Ölçü fiyatına hazırlama ücreti istenirse `partPrice`'a eklenir.
