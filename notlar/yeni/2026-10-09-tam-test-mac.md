## Nerede kaldım

- Mac'teki tam testte kalanlar (Seyhun `npm run test:hepsi` sonucunu gönderdi; anlama hatalarının çoğu #261 ile düzelmişti): (1) birim testleri Node 24'te çöküyordu: geri düğmesinin gecikmeli adımı pencere kalktıktan sonra çalışıyordu (`window is not defined`, navTrail.js `goBack`), artık pencere yoksa bir şey yapmaz. (2) Uzun çok işli cümlede görev listesi 12 sn'de zaman aşımına düşüyordu (502): tek deneme artık en çok 8 sn, takılırsa kalan sürede bir kez yeniden denenir (toplam 16 sn; `attemptMs`, gemini.js `callGemini`; /api/tasks), yanıt kısaltıldı (`from` en çok 20 kelime, en çok 1000 token); telefon 18 sn bekler, cevap yoksa liste yerelde kurulur. (3) Yapay zeka "yarın 10'da antrenman planla"yı etkinlik (event) sanıyordu: takvim sözü olan etkinlik işi ana yapay zekaya gider (`cleanPlan`, taskPlan.js). (4) Giriş ekranında bilinmeyen hatada "Bir hata oluştu, işlem yapılamadı. Tekrar dene." yazar (lib/auth.js). Testleri `test:asistan` › "Görev listesi: yanlış tür düzeltmesi". Gerçek yapay zekayla denenmedi (bulutta anahtar yok).

## Sıradaki işler

- Mac'te `npm run test:hepsi` yeniden: görev listesi (gerçek yapay zeka) satırlarında 502 kalıyorsa sonucu yeni threade ver; Netlify › Functions günlüğünde "[gemini] … zaman aşımı" satırına bak.
