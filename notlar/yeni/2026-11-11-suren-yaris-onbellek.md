## Nerede kaldım
- Ana sayfadaki "Süren yarış" kartı (RaceLive.jsx) açılışta son bilinen satırla hemen çizilir: yarış ve gün için cihazda `sa-rl:<yarış>` ({d, base, over}). Veri (yarış, sayaç, sporcular) gelince satır değiştiyse kısa kayma animasyonu (`.rl-upd`) ve küçük "Güncellendi" işareti (`.rl-chip`, 3 sn); değişmediyse hiçbir şey olmaz.
- Satır yeri hep ayrılır (min-h 1,25 rem), kart yükseklik değiştirmez. Önbellekte "bitti" varsa kart hiç çıkmaz (önce görünüp kaybolmaz).
- Sıradaki plan kartı zaten kopyadan (DataProvider warm) başlıyor, değişmedi.
## Sıradaki işler
- Gerçek cihazda denenmedi.
