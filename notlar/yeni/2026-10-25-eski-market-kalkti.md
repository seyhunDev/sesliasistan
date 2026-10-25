## Nerede kaldım
- Velora'daki eski market alışveriş ekranı kaldırıldı (Seyhun 2026-10-25: "Velora asistan olarak kalsın, Market ve Giyim tamamen Sanal'da… eski market sayfasını kaldır"). `MarketHome.jsx` ve `MarketCart.jsx` silindi. Market alışverişi ana sayfadaki Market kartından Velora Sanal'da yapılıyor.
- Hazır menüler Market yönetimine taşındı: yeni "Menüler" sekmesi (liste ve "Yeni menü ›"). Menü sayfasında (`/market/menu/[id]`) sepete ekleme yok; Ölçü/Paket/Marka seçimleri yalnız fiyatı göstermek için. Geri düğmesi yönetime dönüyor.
- `store.js`'teki sepet işlevleri (`readCart`, `writeCart`, `useCart`), `voice.js` ve `ai.js` duruyor (Sanal'a taşınana kadar dokunulmuyor). `MarketOrder` ana sayfadaki sipariş kartında kullanılıyor.
- Telefonda denenmedi.

## Sıradaki işler
0. Market yönetimi, menüler ve market adresleri Velora Sanal'a taşınacak (Sanal başlığı yapıyor; sıra: yönetim, menüler, en son src/market'in Velora'dan kaldırılması).
