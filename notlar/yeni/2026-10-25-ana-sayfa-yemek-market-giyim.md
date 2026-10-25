## Nerede kaldım

- Ana sayfada (yalnız ana hesap) Kulüp kutularının altında yan yana üç kart: Yemek · Market · Giyim (Seyhun 2026-10-25, örnek "A · Yan yana"). Aynı görünüm: arkada soluk fotoğraf, altta başlık ve cyan alt satır. `src/features/home/ShopCards.jsx`.
- Yemek → Alışveriş › Yemek; Market → Velora Sanal (`openSanal()`, şifresiz giriş, `src/lib/sanal.js`); Giyim hazırlanıyor, şimdilik bir yere gitmez ("Yakında").
- Açık yemek siparişi kartı (FoodCard.jsx `FoodOrder`) ve açık market siparişi kartı (orgs/{org}/marketSiparisler, `isOpenOrder`; durum, ürün · tutar · ödeme, 4 adım, Takip = sipariş penceresi, Yeni sipariş = Velora Sanal) kartların üstünde çıkar.
- #807'deki tek satırlık Market düğmesi (MarketButton.jsx) kaldırıldı. Telefonda denenmedi.

## Sıradaki işler

- Giyim hazır olunca Giyim kartını bağla (ShopCards.jsx `off` kaldır, adres ver).
- Kurye bağlanınca market sipariş kartına yemekteki gibi küçük harita ve tahmini saat.

## Tasarım

- Alışveriş işleri ana sayfada eşit, yan yana kartlar (üç sütun); fotoğraflar Unsplash kimlikleri (yemek/photo.js `photoUrl`), açılmazsa düz kart.
