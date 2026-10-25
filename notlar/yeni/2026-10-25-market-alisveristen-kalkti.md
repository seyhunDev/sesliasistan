## Nerede kaldım
- Alışveriş'te artık yalnız Liste ve Yemek var (Seyhun 2026-10-25: "marketi kaldıralım… market düğmesini şimdi ana sayfaya aldık"). Market, ana sayfadaki düğmeyle Velora Sanal'a açılıyor (#807, ana sayfa başlığı).
- Sesli market komutu kaldırıldı (assistRoute "market" yolu, isler/market.js, görev "Market sepeti"). "marketten süt al" artık alışveriş listesine ekliyor. Yemek siparişi sesle aynen duruyor.
- Market yönetimi Liste'nin ⋯ menüsünde (`/market/yonetim`); geri düğmesi Alışveriş'e dönüyor.
- Velora'daki market ekranlarına (MarketHome, sepet, hazır menü/tarif sayfası `/market/menu/[id]`, MenuEdit, `/api/market-menu`) artık bir girişten ulaşılamıyor; kod duruyor. Seyhun'a "Velora Sanal'a taşınsın mı, silinsin mi" diye soruldu.
- Telefonda denenmedi.

## Sıradaki işler
0. Tek kaynak: market kodu velora-sanal'da kopya (catalog.js, sample.js). Öneri: Market yönetimini de Velora Sanal'a taşıyıp src/market'i Velora'dan kaldırmak.
1. Hazır menüler/tarif/ölçü-paket Velora Sanal'a taşınacaksa Sanal başlığıyla yapılacak.
2. Market adresleri hâlâ `yemek/me` içinde.
