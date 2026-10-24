## Nerede kaldım
- Velora Market hazır menüye tarif, ölçülü set ve markalı paket eklendi (Seyhun 2026-10-24: "arka planı lazanya fotoğrafı… açıktan koyuluğa", "tarif de olması gerekiyor", "minimum ne kadar satılıyorsa o paketi yazmamız lazım", "markasını değiştirebilir olması lazım"; karar kartında "Set + paketler (ikisi)"; örnek /mnt/project-files/market/tarif/ornek.png). Telefonda denenmedi, gerçek Gemini ile denenmedi.
- `MenuView`: üstte yemeğin fotoğrafı laciverte solar; ad, "4 kişilik · 1 sa 10 dk · 9 malzeme", kişi 2/4/6, Malzemeler / Tarif (tarif varsa). Malzemeler: Ölçülü set (market tam ölçüyü hazırlar; liste kişi sayısına göre ölçekli, `scaleAmount`) ya da Paketlerle (en küçük paket, "Söke · 1 kg"; başka markası varsa "Marka" düğmesi → markalar ucuzdan pahalıya). ⋯ içinde "Set fiyatı ve stoğu" (set yoksa açar, öneri paketlerin %75'i).
- Veri: ürünlerde `brand`; aynı adın başka markası ayrı ürün (`alt: true`, 23 tane: un, pirinç, süt, kaşar, tereyağı, salça, makarna, yağlar, yoğurt, mercimek, tavuk). Set = katalogda `cat: "set"` ürün (`set-<menü>-<kişi>`, `menu`, `people`), stok/bekleme diğer ürünler gibi; örnek 6 menü × 2/4/6 kişi = 18 set (stok 5). Reyon "Hazır setler".
- Katalog belgesi artık `v: 2` ile yazılır; eski belge (v yok) okunurken yeni örnekler (markalar, setler) eklenir, var olan fiyat/stok korunur (`upgradeKatalog`). Kayıtlı eski örnek menülere tarif örnekten gelir (`withRecipe`).
- Tarif: menüde `steps: [{ text, min }]`, `minutes`. 6 örnek menünün tarifi yazıldı. MenuEdit'te "Süre dk" ve "Tarif" (her satır bir adım, sonunda "(10 dk)"); yapay zeka (`/api/market-menu`) artık adımları ve süreyi de döndürür.
- Yönetim: ürün formunda Marka; ürün satırında "Marka · boyut"; siparişte setin içi (tartılacaklar) satırın altında. Sepet ve siparişte marka görünür. Aramada marka da aranır ("söke un"), ad tutanlar önde.
- Testler `npm run test:market` 60/60 (16 yeni).

## Sıradaki işler
0. Telefonda: Lazanya'yı aç (fotoğraf + solma), 2 kişi seç, Ölçülü set → Seti sepete ekle; Paketlerle → Un › Marka › Sinangil; Tarif sekmesi. Yönetim › Siparişler'de set siparişinin altında ölçüler görünüyor mu.
1. Sesle "lazanya seti al" şimdilik paketleri ekler (menü yolu); set istenirse voice.js'e eklenir.
2. Yeni menüye fotoğraf seçme yok (kart fotoğrafı yalnız örneklerde).

## Asistan
- Market menüsü sesle hâlâ paketlerle sepete eklenir; ölçülü set yalnız ekranda.
