## Nerede kaldım

- Ana yapay zekaya kulüp özeti gidiyor (inceleme adım 3; Seyhun: "önerdiğin sırayla yap, hepsini yap"; telefonda denenmedi): asistan açılınca planlar/görevler/notların yanına yarışlar (yaklaşan 12, geçmiş 6: tarih, ad, yer, sporcu sayısı), etkin sporcuların adı ve sınıfı, bu ayın aidatı (kaç kişi ödedi, ödemeyenler), açık faturalar ve envanter adetleri (kategori başına, sorunlu sayısı) özet olarak gider (`clubDigest`, src/lib/ai/clubDigest.js; AssistantSheet `club`). Böylece "Atatürk Kupası ne zaman", "bu ay kim aidat ödemedi", "kaç Optimist teknemiz var" her sayfada cevaplanır. Kişisel bilgi (T.C., telefon, veli) gitmez. Okuma 3 dakika bellekte; aidat, fatura, envanter yalnız ana hesapta. Kural değişikliği yok. Testleri `test:asistan` › "Kulüp özeti (ana yapay zeka)".

## Sıradaki işler

- Asistana "Atatürk Kupası ne zaman", "bu ay aidatını kim ödemedi", "kaç Optimist teknemiz var", "açık fatura var mı" diye sor; doğru cevaplıyor mu bak.

## Asistan

- Ana yapay zeka kulüp bilgisini (yarış, sporcu adı/sınıfı, aidat, açık fatura, envanter adetleri) yalnız sorulara cevap için alır; değişiklikler yine kendi akışlarında yapılır (2026-10-09).
