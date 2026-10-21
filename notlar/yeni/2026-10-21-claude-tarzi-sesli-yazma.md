## Nerede kaldım

- Asistan kutusu Claude uygulamasındaki gibi oldu (Seyhun örneği onayladı, örnek: /mnt/project-files/asistan/sesli-yazma/ornek.png).
- Konuşurken söylenen yazı kutuya akıyor. Telefonun kendi tanımasında henüz kesinleşmemiş son kısım soluk görünüyor. Kayıt yolunda (iPhone, sesli yanıt açık) yazı yaklaşık 2 saniyelik parçalarla geliyor.
- Altta mikrofon noktası, süre (0:07) ve mor ses dalgası var. Sağda ■ Dur ve ↑ Gönder düğmeleri duruyor.
- Dur'a basınca dinleme bitiyor, söz kutuda kalıyor ve gönderilmiyor. O sırada kutuda 🎤 (Konuşmaya devam) ve ↑ Gönder var. Kutuya dokunursan yazıyla düzeltebilirsin.
- × sözü siliyor.
- Dinlerken kutunun kenarı kırmızı yerine mor.
- Dosyalar: AssistBox ve ListenClock (src/features/home/TabBar.jsx); useAssistant onLive'a `heardFix` ve `tail` eklendi.
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun telefonda dener. Yazının akışı yavaş gelirse kayıt yolundaki parça süresi (LIVE_EVERY) kısaltılabilir.

## Asistan

- 2026-10-18'deki "dinlerken canlı yazı yok" kararı kaldırıldı. Artık canlı yazı var, Seyhun'un isteğiyle (2026-10-21).
