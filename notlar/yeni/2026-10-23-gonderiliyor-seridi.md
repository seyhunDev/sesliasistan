## Nerede kaldım
- "Kayıtların gönderiliyor" şeridi ana sayfada takılı kalıyordu (Seyhun 2026-10-23: "hiçbir şey yapmadım, bir kere gösterip kapatalım"; telefonda denenmedi). Arkadaki küçük yazmalar ("son görülme", okundu bilgisi) da kayıt sayılıyor; iPhone'da uygulama arkadan dönünce Firestore bağlantısı asılı kalınca bu yazma gitmiyor, şerit de gidene kadar açık kalıyordu.
- Şimdi internet varken: kayıt ~15 sn gitmezse bağlantı bir kez kapatılıp açılır (disableNetwork/enableNetwork, okuma yapmaz) ve şerit en çok 4 sn görünüp kapanır, 10 dakikada en çok bir kez; gönderim arkada sürer, "gönderildi" denmez. İnternet yokken şerit eskisi gibi (gelince "gönderildi"). `src/features/pwa/netWatch.js`, `src/lib/netSync.js`.
- Test: `npm run test:cevrimdisi` 21/21 (yeni "Takılan bağlantı": yazma isteği asılı kalır, bağlantı yenilenir, kayıt gider, şerit kısa).

## Sıradaki işler
0. Telefonda: uygulamayı uzun süre arkada bırakıp dön; şerit ya hiç çıkmamalı ya birkaç saniyede kapanmalı.
