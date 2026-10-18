## Nerede kaldım
- Start sayacı 0'dan sonra "Startan beri" en çok 59:59 sayar (`upSec`, `UP_MAX` lib/raceLive.js); 60. dakikada TimerSound sayacı kendiliğinden durdurur (start anı `zero` olarak kalır). Uygulama kapalıyken geçtiyse açılınca hemen durur. Süre sekmesi, sekmelerdeki küçük satır ve kamera aynı sınırı gösterir.
- Yarış akışında sayaç böyle durursa yarışa bitiş yazılmaz; yarış satırında süre boş kalır.

## Sıradaki işler
- Telefonda dene: geri sayımı başlat, 59:59'da durduğunu gör (beklemeden denemek için saat ileri alınabilir).
