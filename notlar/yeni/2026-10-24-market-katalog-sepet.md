## Nerede kaldım
- Velora Market 1. adım (Seyhun: "bizim bir marketimiz de olacak… kullanıcı ürün arayıp sepete ekleyebilir"; telefonda denenmedi): Alışveriş'e üçüncü sekme Market (`/shopping?tab=market`, yalnız ana hesap). `src/market`: sample (8 reyon, 140 ürün), catalog (arama, sepet, stok hesabı), store (katalog tek belge `market/katalog`, siparişler `marketSiparisler`, sipariş ve durum transaction ile), ui (MarketHome, MarketCart, MarketOrder). Stok: sipariş → bekleyen (held), teslim → stoktan düşer, iptal → açılır. Adresler yemekle ortak (`yemek/me`). Testler `npm run test:market`. Kural değişikliği yok (ana hesap kendi işletmesine yazar). Plan ve örnekler `/mnt/project-files/market/`.

## Sıradaki işler
0. Telefonda Alışveriş › Market: ara, sepete ekle, sipariş ver, iptal et.
1. Market 2. adım: Market yönetimi (ürün ekle/düzenle, stok − / +, siparişlerin durumu: hazırlanıyor, yolda, teslim).
2. Market 3. adım: hazır menüler (Lazanya…), "Bulunamadı", İstekler listesi. 4. adım: yapay zekayla menü (fotoğraf/tarif) + sesli komutlar (isler/).
3. Yemek koddan kaldırılırken market adres parçalarını (`@/yemek/address`, `useFood`, `AddressForm`) markete taşı.
