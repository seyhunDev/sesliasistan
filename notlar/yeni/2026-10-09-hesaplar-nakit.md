## Nerede kaldım

- Hesaplar'da nakit ödemeler gelir olarak (Seyhun: "nakit ödemeler de gelir olarak gösterilmeli, yanında nakit ödendi yazmalı"; telefonda denenmedi): Aidatlar'da sporcuya yazılan nakit ödemeler (`dues/{YYYY-MM}.paid[sporcu] via "cash"`) Hesaplar › Ödemeler'de gelen para olarak, sarı ₺ simgesi ve "Nakit ödendi" etiketiyle görünür (kim: sporcunun adı, `dues/settings.roster`'dan; not: "Ekim 2026 aidatı"). Özet'teki Gelen toplamına girer, altında "nakit N · +X" yazar; En çok ödeyenler'de ve eklenen adların sayfasında da sayılır. Banka defterine yazılmaz, aidat eşleştirmesine girmez (`cashMoves`, dues.js; `loadCashMoves`, duesData.js: aidat ay kayıtları tek sorgu). Bir banka hesabı seçiliyken nakitler görünmez. Kural değişikliği yok. Testi `test:elle` › "Hesaplar arama ve eklenen adlar" › "nakit aidat gelir".

## Sıradaki işler

- Aidatlar'da bir sporcuya nakit ödeme yaz, Hesaplar › Ödemeler'de "Nakit ödendi" etiketiyle ve Özet'in Gelen toplamında görünüyor mu bak. Sporcu adı "Sporcu" görünürse Aidatlar sayfasını bir kez açıp kapat (ad listesi yenilenir).
