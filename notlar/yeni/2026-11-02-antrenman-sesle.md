## Nerede kaldım

- Antrenman yarışı tamamen sesle yönetiliyor: "2 dakika başlat" → ekranda 3 · 2 · 1 (bipli), sonra geri sayım ve bugünün antrenmanına yarış açılır (plan yoksa açılır), antrenman günü sayfası açılır. "Yarışı bitir" → süre yazılır, sayaç durur (geri sayım bitmeden denirse iptal). "Yarışı bitir, birinci Ali ikinci Ayşe" süre ve sonuç tek seferde; yalnız sonuç eskisi gibi.
- Dosyalar: `src/lib/trainVoice.js` (cümleler), `src/features/assistant/isler/antrenmanSes.js` (iş), `Countdown.jsx` `leadIn`/`LeadIn` (3·2·1), `assistRoute` "trainVoice" (Antrenman sayfasında günlükten önce).
- Testler: `test:yaris` (cümleler), `test:asistan` yönlendirme, `test:asistan-ekran` "Antrenman yarışı sesle" (yalnız bu bölüm: `ASISTAN_TEK=antrenman npm run test:asistan-ekran`). Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: 3·2·1 bipleri iPhone'da sessiz modda çalıyor mu, asistan konuşurken bip karışıyor mu.

## Asistan

- Yarış günü (bugün yarış varsa) "2 dakika başlat / yarışı bitir" Antrenman sayfaları dışında Yayın'ın (yarisMedya timerCmd); antrenmanınki yalnız yarışsız günde ya da /training sayfalarında.
