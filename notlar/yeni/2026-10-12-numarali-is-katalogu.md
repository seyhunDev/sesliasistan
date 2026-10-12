## Nerede kaldım

- Numaralı iş kataloğu, 1. ve 2. adım (Seyhun: "yapılabilirler listemiz var, numaralandıralım; yapay zeka '1, 3, 4'ü yap, içeriği bunlar olsun' desin"; telefonda ve gerçek yapay zekayla denenmedi): uygulamanın sık yaptığı 15 iş numaralı ve alanlı (`src/lib/actCatalog.js`): 1 yarış oluştur, 2 yarışa sporcu ekle, 3 yoklama, 4 aidat nakit, 5 nakit gelir/bağış, 6 Instagram gönderisi, 7 alışveriş, 8 arama, 9 sayfa aç, 10 fatura ödendi, 11 sporcu ekle, 12 antrenman günlüğü, 13 fitness, 14 aidat hatırlatması, 15 kim aidat ödemedi. Görev listesinde yapay zeka (`/api/tasks`) artık her iş için numara (`act`) ve alanları (`args`) da verir; uygulama komutu kendi kalıbından yazar (`actSay`, `cleanPlan`), yapay zekanın serbest cümlesi yeniden yorumlanmaz. Listede olmayan iş 0: eskisi gibi tür + cümle. Gerekli alan eksikse de eski yol. Her numaranın yazdığı komutun doğru akışa gittiği sınanır (`test:asistan` › "Numaralı iş kataloğu", 19/19). Kural değişikliği yok.

## Sıradaki işler

- Mac'te `npm run test:hepsi` ile gerçek yapay zekayı dene; sonuç GitHub'a gider, görev listesi satırları geçmeli.
- 3. adım: tam testteki insan davranışı cümlelerinde eski ve yeni yolu karşılaştırıp sonucu GitHub'a koymak.
- 4. adım: kalan işleri (mesaj, plan, görev, not, envanter, beslenme…) kataloğa taşımak; alanlar yeterliyse alt akışların ayrı yapay zeka isteğini atlamak.

## Asistan

- Görev listesinde bilinen işler numarayla gider (`src/lib/actCatalog.js`). Yeni bir iş kataloğa eklenince örnek alanıyla `yonlendirme.mjs` › "Numaralı iş kataloğu"na da eklenir.
