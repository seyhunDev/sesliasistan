## Nerede kaldım

- Kamerada (Fotoğraf/Video çekerken) sayaç yalnız görünür; Başlat/İptal/Bitir düğmeleri kaldırıldı (Seyhun 2026-10-21). Sayaç Süre ekranından yönetilir.
- Antrenman günü ve yarış multimedyada seçili sekme adreste (`?tab=`) tutulur (`src/hooks/useTabInUrl.js`): iPhone sayfayı kendiliğinden yenilerse aynı sekme açılır, başka sekmeye düşmez.
- "Sayfa kendi kendine yenileniyor" kesin nedeni bulunamadı. Olası nedenler: sık otomatik yayınlardan sonra eski kod parçası yüklenemeyince bir kez yenilenme (`src/lib/crash.js`), Firestore iç hatasında yenilenme (`healFirestore`), kamera/video sonrası iPhone'un belleği boşaltıp sayfayı yeniden açması. Telefonda denenmedi.

## Sıradaki işler

- Seyhun yine "Bu sayfa açılamadı" görürse "Ayrıntı" altındaki yazıyı istemek; neden oradan anlaşılır.
- Sayaç çalışırken ya da kamera açıkken otomatik yenilemeyi ertelemek gerekebilir (çevrimdışı konusunun sahibiyle).
