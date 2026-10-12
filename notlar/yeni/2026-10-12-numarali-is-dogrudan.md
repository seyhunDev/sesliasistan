## Nerede kaldım

- Numaralı iş doğrudan yapılıyor, 3. adım (Seyhun: "uygulamada hızlıca yapılabilecek yapıda versin, uygulama hemen yerine getirsin"; telefonda ve gerçek yapay zekayla denenmedi): görev listesinde yapay zeka yoklamayı (iş 3) ya da yarışı (iş 1 oluştur, iş 2 sporcu ekle) numara ve alanlarla verdiyse uygulama artık o alanları cümleye çevirip yeniden yapay zekaya (/api/attendance, /api/race) sormuyor: adlar sporculara, yarış adı kayıtlı yarışlara telefonda eşlenir, hemen kaydedilir (`attendanceFromArgs`, `raceFromArgs`, `dayFrom`, src/lib/actRun.js; `actNow`, `takeAct`, beyin/gorevListesi.js). Yarış oluştururken tarih yapay zekadan YYYY-AA-GG gelir (katalogda `start`, `end`, `city`, `district`, `abroad`; yoklamada `others` "kalanlar gelmedi"). Emin olunamazsa (bulunamayan ya da iki sporcuya uyan ad, okunamayan gün, aynı adlı yarış, iki yarışa uyan ad) eski yol: cümle yapay zekaya gider. Böylece bu işlerde bir yapay zeka isteği ve ~1-3 sn azalır. Kural değişikliği yok. Testleri `test:asistan` › "Numaralı iş: doğrudan".

## Sıradaki işler

- Mac'te `npm run test:hepsi` (yapay zekalı) ile görev listesinin numara ve alanları doğru verip vermediğine bak; telefonda "Atatürk Kupası adında 7-8 Kasım'da yarış oluştur, bugün Ayşe ve Emre antrenmana geldi" de.
- 4. adım: kalan işler (aidat nakit, gelir, alışveriş, arama, fatura) de alanlardan doğrudan yapılır; şimdilik cümleleri kendi akışlarında yerelde (yapay zekasız) çözülüyor.

## Asistan

- Görev listesinde numaralı işin alanları uygulamanın akışına doğrudan verilir; akış yalnız emin olamazsa ikinci kez yapay zekaya sorar (2026-10-12).
