## Nerede kaldım

- Tam testte kalan asistan hataları düzeltildi (telefonda denenmedi; `npm run test:hepsi` yapay zekasız: anlama 752/752, akış 245/245, birim 1725/1725): söylenen cümle işlenmeden önce temizlenir (`cleanSay`, normalize.js; AssistantSheet `run`): baştaki dolgu sözler ("şey ııı", "eee", "hmm", "yani"), kekemelik ("Tamam, tamam, kapat", "Yoklama yoklama al"), Türkçe harfsiz sık kelimeler ("foca yarisini ac", "tamam tesekkurler", "antrenman gunlugune yaz", "turkcel faturasi odendi"), "ararmısın" → "arar mısın", "yok lama" → "yoklama", bozuk fiiller (`fixVerbs`). "Yoklama al, Ali ve Ayşe geldi" ve "Mustafa geldi, yoklamaya ekle" artık tek yoklama (görev listesine gitmiyor); çok işli cümlede "Mehmet de geldi" yoklamaya gider (`attPart`, taskPlan.js). Noktasız "Yoklama al Mustafa geldi yarın 10'da toplantı ekle" iki işe ayrılır. "Gökhan Arslan'ı arar mısın?" aramadır; "mustafa geldi mi antrenmana" soru (yoklama değil); "kimler aidat vermedi" aidat sorusu. Testleri `test:asistan` › "Söylenenin temizlenmesi".

## Sıradaki işler

- Mac'te `npm install` sonra `npm run test:hepsi` (tarayıcı katmanı bulutta paket indirilemediği için çalışmadı).
