## Nerede kaldım
- Yarış multimedya sayfası (Seyhun onayı "1, 2, 3, 4"):
  1. Sekme sırası Süre · Medya · Hava · Sonuçlar; yarış günü (ya da o gün start varsa) Süre'yle, başka gün Hava'yla açılır.
  2. Süre'de sayacın altında Rüzgâr · Fotoğraf · Video. Kamera (CameraSheet) üst şeridinde yarış düğmeleri: "Başlat · 4. yarış", geri sayımda "İptal", startan sonra "İptal" + "Bitir"; iptal sebebi kameranın üstünde sorulur. Süre'den açılan kamera kapanınca Süre'ye dönülür. Akış tek yerde: `useRaceFlow.jsx` (RaceMedia), düğme işleri Countdown.jsx `raceStart/raceCancel/raceFinish/raceVoid`.
  3. Süre'de "Rüzgâr" kutusu son elle kaydı gösterir, dokununca Hava'daki rüzgâr penceresi (WindSheet) açılır; start bu rüzgârı alır.
  4. "Kaydetmeden önce" kalktı: çekilen hemen kaydedilir (fotoğrafa an basılır). Yanlışsa büyük açıp "Düzelt" (yarış seçici + an; `MomentPicker.jsx`, `fixMedia`). Fotoğrafa basılı yazı düzeltmeyle değişmez.
- Bildirimler (Geri al) artık kameranın ve tam ekranın da üstünde (z-90); kamera açıkken üst şeridi örtmesin diye biraz aşağıda.

## Sıradaki işler
- Telefonda dene: suda tek ekran akışı (kamera içinden Başlat → foto/video → İptal ya da Bitir).
- Önerilen 5. madde (günleri başlıktaki tarihe dokununca seçmek) yapılmadı.
