## Nerede kaldım
- Velora Yemek 1. adım (Seyhun: "kendi yemek sepetimi kurmaya çalışıyorum… ayrı klasörde, sonra ayrı projeye taşıyacağız"; ekran yok, telefonda denenecek bir şey yok): `src/yemek/` klasörü açıldı. `sample.js` Dikili'de 10 hayali restoran (2 ev yemeği, 2 pizza, 2 burger, sushi, döner, balık, tatlı-kahvaltı; restoran › kategori › ürün › seçenek grubu › seçenek), `photo.js` Unsplash fotoğraf bağlantıları (indirilmez; Seyhun sonra kendi fotoğraflarını yükleyecek), `order.js` sepet/fiyat/seçenek denetimi/açık mı/tahmini varış, `address.js` konuma 300 m içindeki adresi seçer yoksa sorar, `suggest.js` cümleden istek ("dünkünden", "daha uygun", "hafif", "iki kişilik", "acısız", "farklı bir şey") + kural kural puanlama + sesli cevap metni. Testler `scripts/asistan-test/yerel/yemek.mjs` (`npm run test:yemek`, 48 test). Harita ve örnek ekranlar: proje dosyaları `siparis/` (harita.md, ornek-gorselli.png, ornek-takip.png).

## Sıradaki işler
0. Velora Yemek 2. adım: Alışveriş › Yemek müşteri ekranları (Seyhun "Ne yiyelim" örneğini beğendi), Firestore koleksiyonları yemekKatalog/yemekRestoranlar/yemekSiparisler/yemekKullanicilar + firestore.rules (konsoldan yayınlanacak). Sonra takip + deneme modu, Yönetim/Restoran/Kurye ekranları, yapay zeka önerisi, asistan işi `isler/yemek.js` ("pizza yedim" Fitness'ta kalır).

## Asistan
- Yemek önerisi önce yerel kurallarla (src/yemek/suggest.js RULES) puanlanır; yapay zeka yalnız ilk ~20 adaydan seçer. Yeni davranış = RULES'a yeni kural.
