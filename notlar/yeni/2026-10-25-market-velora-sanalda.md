## Nerede kaldım
- Market tamamen Velora Sanal'a geçti (Seyhun 2026-10-25: "Velora asistan olarak kalsın, Market ve Giyim tamamen Sanal'da"). Sanal'da yönetim ve hazır menüler main'de (velora-sanal #8, #9). Velora'dan kaldırılanlar: market yönetimi (`/market/yonetim`), hazır menü sayfaları (`/market/menu/[id]`, MenuEdit), `/api/market-menu`, `src/market` içindeki sample, menus, voice, ai dosyaları, Alışveriş'teki ⋯ › Market yönetimi.
- Velora'da kalan: ana sayfadaki açık market siparişi kartı (ShopCards, ana sayfa başlığının) için `src/market/catalog.js` (durumlar, satır yazısı, stok açma/düşme), `store.js` (`useOrders`, `setStatus`: katalog belgesi yoksa stoğa dokunmaz) ve `ui/MarketOrder.jsx`. `npm run test:market` artık yalnız bunları sınıyor (9 test).
- Telefonda denenmedi.

## Sıradaki işler
0. Market yönetimi Velora Sanal'da: velora-sanal.netlify.app (ana hesap). Velora'da market koduna yeni özellik eklenmez; değişiklik Sanal deposunda.
