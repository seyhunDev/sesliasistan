## Nerede kaldım

- Video Apple tarzı (Seyhun 2026-11-12, örnek antrenman-ipad/video-ornekler.html, "Yap"; üst satırda A seçildi):
  - Antrenman Video penceresinde Kapat yuvarlak X (`btn btn-round btn-sm tw-x`), LiveVideos'ta "Düzenle" yerine "Seç" (canlı ekranda da).
  - Ortak `MediaViewer` (Medya sayfası, yarış Multimedya, antrenman): solda yuvarlak X (önce geri oku), sağ üstte ses, başlık altında "2 / 5". Telefonda ortada 10 sn geri · oynat/durdur · 10 sn ileri, altta ince süre çizgisi. iPad'de (md) düğmeler ve süre altta yüzen camsı şeritte.
  - Antrenmanda sağa sola kaydırınca önceki/sonraki video açılır: LiveVideos `onPlay` 3. bilgi `{ list, open }` (eskiden yeniye sıra; dosya o an okunur).
- Ekran testi "iPad: üç sütun" iki video ekler, → ile "2 / 2" olur mu bakar.

## Sıradaki işler

- Gerçek iPhone ve iPad'de denenmedi (kaydırma, 10 sn düğmeleri, ses).
