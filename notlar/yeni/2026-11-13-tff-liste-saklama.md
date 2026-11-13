## Nerede kaldım
- TFF yarış listesi (Seyhun 2026-11-13 "her defasında istek atmıyoruz değil mi?"): TFF sitesine her açılışta gidilmiyordu zaten; /api/race-site listeyi Firestore'dan verir (raceSiteSync.cachedList; saatlik tarama yeniler, en çok 3 saatte bir siteye bakar). Ama telefon her açılışta sunucuyu bekliyordu.
- Yeni: telefon son listeyi bu cihazda saklar (localStorage velora:site-list:<sezon>), liste anında görünür, arkada güncellenir (raceSite.siteListLive). "+ Yarış" penceresi ve /athletes/races/site aynı işlevi kullanır. Saklı liste varken sunucu hatası gösterilmez.

## Sıradaki işler
- İlk açılış için Velora yükleme kutusu örneği onay bekliyor (artifact 2ckBnmAkeXJVV6QjK8UytX en üst).
