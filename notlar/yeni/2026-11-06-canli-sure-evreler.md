## Nerede kaldım
- /canli süre kartı (ScClock) evreli oldu (Seyhun 2026-11-06 "her şeyi aynı anda göstermeyelim; açılır kapanır; animasyonlar güzel"; onaylı örnek /mnt/project-files/sure-gostergesi/evreler-ornek.html). Üstte evre etiketi (`ckEvre`): Yarış öncesi, Start öncesi (turuncu; turuncu bayrak ya da starta 10 dk), Start dizisi (mavi), Yarışta, Finiş (turuncu, pencere açıkken), Bitti, Tehir / Abandone / Genel geri (kırmızı; köşe gölgesi kırmızımsı `.sc-ck.red::after`), Gün bitti. Etiket değişince aşağıdan kayar, büyük süre bulanıktan netleşir.
- Start saati büyük sürenin sağında (`.sc-ckm`). 5 dakikalık dizide çizgi yerine 5 · 4 · 1 · 0 basamakları (`.sc-lad`, sınıf bayrağı, hazırlık bayrağı, indi, Start; o anki bayrak dalgalanır); son 10 sn her saniye nabız, startta mavi ışık (`.sc-go`).
- Açılıp kapanan satırlar `ScXp` (+ `useLast`, kapanırken son içerik kalır): finiş penceresi, turuncu bayrak, kural bayrağı, erken çıkan, işaret. Rüzgâr, son dönüş / ilk finiş, sıradaki ve alt yazı tek satırda 5 sn'de bir döner (`.sc-cks`, `SC_SLOT`); dizide bu satır yok.
- `scTime` dizi dönüşüne `pr` (hazırlık bayrağı) eklendi. Telefonda denenmedi.

## Sıradaki işler
- Dizi süresi 5 dk değilse basamak yerine çizgi; 3 dk dizi için ayrı basamak istenirse eklenir.
