## Nerede kaldım

- Antrenman sayfası sayacı = yarış multimedyanın sayacı (Seyhun 2026-10-20: "Yarış multimedyadaki sayacı daha iyi hazırladık, onu kullanalım"; telefonda denenmedi): aynı `Countdown` (compact, mode "start": sayaca dokununca başlar, 1/2/5 dk, start dizisi bipleri) ve aynı Start · Şamandıra · Finish kareleri (`Marks`, TimerTab.jsx'ten dışa açıldı, multimedya davranışı aynı). Akış `src/features/training/useTrainingFlow.js`: planı olan günde Başlat yeni antrenman yarışı açar (start = sayacın 0'ı), +30 sn/+1 dk kaydırır, geri sayımda İptal sonucu olmayan yarışı siler, Bitir süreyi yazar; her adımda 8 sn Geri al. Şamandıra listesi planın `buoys` alanında.
- Yarış düzenleme/silme: yarışa dokun → ad, bitiş sırası, kodlar; sporcuya dokununca "Sıra" seçimi ve ↑/↓; "Yarışı sil" onay penceresi açar. Sonucu girilmemiş yarış puan durumuna girmez. raceScore.js: `fin`, `marks`, `placeAt`. Testler `npm run test:yaris`.

## Sıradaki işler

0. Telefonda dene: antrenman sayfasında sayaca dokununca başlaması, kareler, Bitir, Geri al; yarış sil onayı; Sıra seçimi.
