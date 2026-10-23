## Nerede kaldım

- Ana sayfa yemek kartı (src/features/home/FoodCard.jsx; ana sayfa sahibi iş parçası izin verdi): açık sipariş varsa "Siparişin · Durum", restoran ve kalan dakika; dokununca takip sayfası (/yemek/siparis/id: durum, harita, kurye). Yoksa eski hali ("Ne yiyelim?"). Veri: `useActiveOrder` (src/yemek/store.js), son 3 saatin siparişleri canlı (birkaç okuma).
- Teslim edilmeyen siparişte kalan süre en az 1 dk (`minutesLeft`, src/yemek/order.js); kurye "Teslim" deyince biter.
- Harita görünümü örneği: /yemek/harita-ornek (yalnız ana hesap). Açık / Sokak / Lacivert (Esri, ücretsiz, anahtarsız) ve Şimdiki (OpenStreetMap). Kaynak yazısı köşedeki küçük "i" içinde. Görünümler src/yemek/mapStyles.js; `MAP_STYLE` şimdilik "osm".
- Konumlar zaten gerçek: her restoranın `pos`'u var, adres haritadan seçiliyor, gerçek siparişte kurye telefonunun GPS'i (Kurye ekranı) haritada; deneme modunda kurye yolda kendiliğinden ilerler.

## Sıradaki işler

- Seyhun görünümü seçince `MAP_STYLE` değişecek, AddressForm haritası da aynı görünüme geçecek, /yemek/harita-ornek silinecek.
