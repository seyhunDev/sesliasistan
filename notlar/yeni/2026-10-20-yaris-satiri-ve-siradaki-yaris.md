## Nerede kaldım
- Ana sayfa Kulüp kartındaki "Sıradaki yarış" kaldırıldı (Seyhun: artık gerek yok). Yarışlar listede; Yarışlar sayfa düğmesi altta.
- Listede yarış satırlarının farklı açılma sebebi: planlar yarışa kimlikle değil ADLA bağlı. Plan adı yarış kaydının adıyla birebir aynı değilse (ör. "Ege Kupası" ↔ "Ege Kupası 2026", fazladan boşluk) yarış bulunamıyor, plan penceresi (Yapıldı / Planı aç) açılıyordu. Ayrıca yarışın işleri ("Ad: iş") bilerek Yapıldı / Yarışın sayfası / Planı aç penceresini açar.
- Düzeltme: `findRace` (lib/homeTiles.js) adı gevşek eşler (tam ad, yoksa adı ötekini içeren tek yarış). Yarış satırı ve yarış grubunun başlığı yarışın sayfasını açar; iş satırının penceresinde "Yarışın sayfası" ad tam tutmasa da çıkar.
- Bitmiş yarışlar (useRaceHome().open dışında) ve yarış kaydı olmayan "Yarış" türündeki planlar hâlâ plan penceresini açar.
- Telefonda denenmedi.

## Sıradaki işler
- İleride: yarıştan yazılan planlara raceId eklenirse eşleşme ada bağlı kalmaz.
