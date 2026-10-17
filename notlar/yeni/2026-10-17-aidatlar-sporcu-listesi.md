## Nerede kaldım

- Aidatlar sporcu listesi oldu (Seyhun: "kimin neyi ödediği anlaşılmıyor, önceki ödemeleri girmek istiyorum"; öneri `/mnt/project-files/aidatlar/duzen-onerisi.md` onaylandı; telefonda denenmedi): ay seçimi ve 6 aylık tablo kalktı. Üstte "Toplam borç X ₺ · N sporcu", eşleşmeyi bekleyen banka ödemeleri ve "bu ay ödemeyenler" satırları. Liste üç grup: Borcu var (borca göre), Borcu yok, Aidat sayılmayanlar. Sporcuya dokununca son 12 ay şeridi, ödeme geçmişi (birden çok aya yazılan ödeme tek satır, çöp ile silinir), "Ödeme ekle" (tutar, geçmiş tarih, Nakit/Banka, aylar en eski borçtan kendiliğinden seçilir, değiştirilebilir) ve kapalı ayarlar (sporcuya özel aidat, ay sayılmasın, başlangıç ayı, sporcu sayfası). Ay ay ödemeler listesi ve Excel ayar penceresinde.
- Bankadan gelen aidat artık geldiği aya değil sporcunun en eski borçlu ayına (son 12 ay) yazılır; fazlası son aya. Hem sunucu (`autoDues`) hem Eşleştir onayı (`takeBank`) aynı kuralla (`allocate`, dues.js). Başka aya yazılan hareket geldiği ayda `used` ile işaretlenir, bir daha önerilmez. Birden çok aya bölünen ödeme `grp` ile bağlı (`historyOf`, `dropGroup`); Hesaplar'da nakit tek satır. Kural değişikliği yok. Testleri `test:elle` › "Aidat tablosu", "Aidat otomatik".

## Sıradaki işler

- Telefonda Aidatlar'ı aç: borçlu sporcuya dokun, geçmiş tarihli nakit ödeme ekle (2 aylık tutar), iki ay ödendi görünmeli; geçmişte tek satır olmalı, silince ikisi de gitmeli.
