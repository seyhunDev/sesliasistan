## Nerede kaldım

- Mac tam testindeki (12 Ekim 16:13, 1237/1239) iki görev listesi hatası düzeltildi (telefonda ve gerçek yapay zekayla bulutta denenmedi): (1) "Atatürk Kupası yarışı oluru afişini hazirla…" cümlesinde yapay zeka yarışı atlıyordu; telefon cümleyi zaten düzeltip gönderiyordu, ama `/api/tasks` ham sözü olduğu gibi alıyordu. Artık sunucu da aynı temizlikten geçirir (`cleanSay`, tasks/route.js). (2) "1500 yok yok 1000 verdi" gibi sayıyı söylerken düzeltme yapay zekayı yavaşlatıp 502'ye düşürüyordu; artık söz temizlenirken yalnız son sayı kalır ("1500 yok yok 1000" → "1000", "2 pardon 3." → "3."; `NUM_FIX`, normalize.js). Testleri `test:asistan` › "Söylenenin temizlenmesi".

## Sıradaki işler

- Mac'te `npm run test:hepsi` yeniden: görev listesi (gerçek yapay zeka) 4/4 olmalı; sonuç GitHub'daki test-sonuclari dalına gider.
