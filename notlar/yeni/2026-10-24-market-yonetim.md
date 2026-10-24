## Nerede kaldım
- Velora Market 2. adım: Market yönetimi (Seyhun: "ürün eklemesi, stoğunu görebileyim, stok ekleme azaltma"; telefonda denenmedi). Giriş Alışveriş › Market › ⋯ › Market yönetimi (`/market/yonetim`, yalnız ana hesap). `src/market/ui/MarketAdmin.jsx`: Ürünler (arama, reyon reyon, stok − sayı +, alt satırda fiyat ve siparişte bekleyen, az kaldı/tükendi amber; satıra dokun → düzenle/sil; "Ürün ekle" alt çubuğun üstünde) ve Siparişler (açıklar üstte; Hazırla › Yola çıkar › Teslim edildi, İptal). Katalog yazmaları transaction ile tüm belge (`saveProduct`, `deleteProduct`, `addStock`). Siparişte bekleyen ürün silinmez, stok bekleyenin altına inmez. Testler `npm run test:market` (19).

## Sıradaki işler
0. Telefonda: Market yönetimi'nde ürün ekle, stok ±, siparişi teslim et → stok düşsün; iptal → bekleyen açılsın.
1. Market 3. adım: hazır menüler, "Bulunamadı", İstekler sekmesi. 4. adım: yapay zekayla menü + sesli komutlar.
