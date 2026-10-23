## Nerede kaldım

- Restoran sayfasındaki sepet çubuğu yenilendi (Seyhun "Yap", örnek A): alt çubuğa yapışık lacivert şerit, arkada sepetteki ürünlerin fotoğrafları (en çok 3) soldan koyulaşarak; "Sepet · 3 ürün", tutar, "Sepete git". Çubuk varken alt çubuk da aynı lacivert (globals.css `.cartbar`, `body:has(.cartbar) .atabbar`), arada boşluk yok.
- Kod: `src/yemek/ui/CartBar.jsx`, PlaceView. Asistan açıkken çubuk gizlenir.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda bak: çubuk alt çubuğa tam oturuyor mu, asistan küresi çubuğun altına doğru taşıyor mu.

## Tasarım

- Yemek sepet çubuğu: lacivert, alt çubukla tek yüzey, ürün fotoğrafları arkada (örnek A, 2026-10-23).
