## Nerede kaldım
- Velora Market 4. adım (Seyhun: "fotoğrafla yapay zekaya gönderip… malzeme listesini bana liste olarak geri gönderecek"; telefonda ve gerçek yapay zekayla denenmedi): Yeni menü / düzenle ekranında "Fotoğraf" (yemeğin ya da tarifin fotoğrafı) ve "Yapay zekayla doldur" (yazılan ad ya da tarif) → `/api/market-menu` (Gemini, marketteki ürün adları da gider ki aynı adla gelsin; kaydetmez) → ad, kişi, malzeme satırları forma dolar (`cleanMenu`, `itemLine`; `src/market/ai.js`). Menü kaydedilince bulunamayan malzemeler İstekler'e yazılır. Kullanım sayacı "market-menu".
- Sesle market (`src/market/voice.js` marketAsk + findSpoken, `src/features/assistant/isler/market.js`, yol `market`, görev "Market sepeti"): "Lazanya malzemelerini sepete ekle", "karnıyarık yapacağım malzemeleri al", "marketten 2 süt ve ekmek al" → market sepetine eklenir, Alışveriş › Market sepeti açık gelir (`?sepet=1`). Sipariş sesle verilmez (para). Olmayanlar söylenir ve İstekler'e gider. Yönlendirmede yemek siparişinden ve alışveriş listesinden önce; çalışan hesabında yok. Yapay zeka istemi sınırı testi 3100'e çıktı (+market sepeti).

## Sıradaki işler
0. Telefonda: Yeni menü › Fotoğraf (yemek fotoğrafı) ve "Karnıyarık" yazıp Yapay zekayla doldur; sesle "Lazanya malzemelerini sepete ekle".
1. Sesle yalnız örnek menü adları tanınıyor (yönlendirme sırasında kullanıcının kendi menüleri bilinmiyor); gerekirse menü adları yönlendirmeye verilir.
2. Market sayfası açıkken sepet kapatıldıysa sesli ekleme sepeti yeniden açmaz (eklenir, çubukta görünür).
