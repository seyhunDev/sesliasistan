## Nerede kaldım
- Envanter düzeltmeleri (Seyhun: "boom diye bir şey yok, bumba var; ürün ekranı açılınca telefonda sağa sola kayıyor"; telefonda denenmedi): kategori adı "Bom" → "Bumba" (hazır listede ve takımda; kayıtlı envanterlerde kategori ve "Optimist bom" gibi adlar bir kez çevrilir, `v: 3`, cleanInv; yapay zeka "bom/boom"u Bumba sayar). Alttan açılan pencerelerin içeriği yana kaymaz (`overflow-x-hidden`, Sheet.jsx); ürün formunda iPhone tarih kutuları formu yana taşırmasın diye `appearance-none`, alanlarda `min-w-0` (ItemForm.jsx). Testi `test:elle` › "Envanter" › "bom → bumba".

## Sıradaki işler
0. Envanterde bir ürünü aç ve yeni ürün ekranını aç; parmakla sağa sola kaydırınca içerik kımıldamamalı. Hâlâ kayıyorsa hangi alanın taştığını ekran görüntüsüyle yaz. Kategorilerde "Bumba" görünmeli.
