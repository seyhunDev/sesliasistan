## Nerede kaldım

- Asistan "kapat" deyince sessiz kapanıyor (Seyhun: "kapat, tamam kapat denince dinleme durmalı; görüşürüz dedi, sesli cevap istemiyorum"; telefonda denenmedi): "kapat", "tamam kapat", "teşekkürler", "bitir" ve "Başka bir isteğin var mı?" sorusuna "yok" artık "Görüşürüz" demeden kapatır; mikrofon ve okunan ses hemen durur (`finish()`, AssistantSheet `run`). Önceden yapay zeka yanıtı beklenirken söylenen "kapat" bekleyen istekle birleşip yeni istek gibi gidiyordu; artık doğrudan kapatır (`onFinal`). Chrome'un canlı yazı yolunda söz yalnız "kapat" ise ("kapat", "tamam kapat", "asistanı kapat", "kapatabilirsin", "kapat lütfen") konuşma bitişi beklenmeden dinleme durur (`isCloseNow`, assistantLocal.js); iPhone'da (kayıt yolu) konuşma bitişinden hemen sonra kapanır. Testleri `test:asistan` › "Sesle kapatma", "Hemen kapat (dinlerken)".

## Sıradaki işler

0. Sessiz kapatmayı dene: asistana bir şey söyle, sonra "tamam kapat" de; sesli cevap vermeden kapanmalı, mikrofon kapanmalı. "Başka bir isteğin var mı?" sorusuna "yok" de; yine sessiz kapanmalı.

## Asistan

- Kapatma sözleri ("kapat", "teşekkürler", "yok") sohbeti sesli cevap vermeden kapatır; "Görüşürüz" denmez (Seyhun'un isteği, 2026-10-05).
