## Nerede kaldım

- Asistan yeniden açılış (Seyhun 2026-10-22): asistandan çıkıp 30 sn içinde açınca konuşma ekranda kalır, kaldığı yerden sürer. 30 sn sonra açınca ekran temiz başlar.
- Önceki sohbetler (PastSessions, "Önceki sohbetler" listesi) asistan ekranında artık hiç gösterilmez. Ayarlar › Geçmiş sohbetler'deki "Asistan ekranında göster" anahtarı kalktı; yalnız "Geçmişi sil" var.
- Yapay zekanın hafızası aynen: kapanan konuşma 15 dk geçmiş olarak (PAST_MS), son oturumlar özet olarak (sessionsNow) gider. 30 sn içinde açılırsa aynı turlar iki kez yazılmaz (useAssistant `shut`, `sess`).
- Testler: test:asistan › "Yeniden açılış (30 sn)", test:asistan-ekran › "Yeniden açılış" (3 adım). Telefonda denenmedi.

## Sıradaki işler

- Tasarım ipliği AssistantSheet'teki `<PastSessions>` satırını ve PastSessions.jsx'i kaldırabilir (liste hep boş geliyor).

## Asistan

- REOPEN_MS = 30 sn (lib/convoContext.js): ekranda konuşmanın kalma süresi. Hafıza süresi (PAST_MS 15 dk) ayrı.
