## Nerede kaldım

- Seyhun'un raporu (2026-10-21, iOS 18.7 ana ekran uygulaması, sesli yanıt açık): 19 istek, 10 dinleme hatası. Hepsi "Ses duyulmadı" ve iPhone'un kendi ses tanıması yolundan (yazıya çevirme 1-30 ms, canlı yazı yok). Sesli cevaptan sonra art arda geliyor (19:49-19:50 arası 6 kez).
- Düzeltme (`useSpeech` `preferServer`/`onWebFail`, `useAssistant`):
  - Sesli yanıt açıkken asistan kayıt + sunucu yolunu kullanıyor (aynı mikrofon tutuluyor, #626).
  - Sesli yanıt kapalıyken telefonun tanıması sürüyor; elle başlatılan dinlemede bir kez yazı vermezse o açılış boyunca kayıt yoluna geçiyor.
  - Kayıt yolunda çeviri boş gelirse aynı anda toplanan ham sesle (PCM WAV) bir kez daha deneniyor. Kaydın ölçümü (süre, KB, ham ses tepe/ortalama, yeniden deneme sonucu) rapora giriyor; hata yazısında ayrıntı yalnız raporda.
- Geçmiş sohbetler (Ayarlar › Asistan › Geçmiş sohbetler):
  - "Asistan ekranında göster" düğmesi, bu cihazda saklanıyor, varsayılan açık. Kapalıyken asistan açılınca eski sohbetler görünmüyor, hafıza sürüyor.
  - "Geçmişi sil": bu cihazdaki tüm oturumları ve az önceki konuşmayı (hafıza) siliyor.
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun sesli yanıt açıkken yine dener, "rapor oluştur" ile paylaşır. Kayıt yolunda yazıya çevirme ~4 sn sürüyor (raporda #8); yavaş gelirse hızlandırma bakılacak.
- Rapordan diğer gözlemler:
  - Kayıt sonrası "Kaydetme" 3,3-3,8 sn.
  - Yapay zeka cevabından sonra ayrıca söz yapay zekası çalışıyor (+1,2-1,5 sn).
  - "Sanver'i ara": Sanver uygulamada sohbet kişisi değilse yapay zekaya gidiyor ve "arayamıyorum" diyor (telefon numarasıyla arama yok).

## Asistan

- Sesli yanıt açıkken mikrofon her zaman kayıt + sunucu yolu; iPhone'un kendi tanıması sesli cevaptan sonra güvenilir değil.
