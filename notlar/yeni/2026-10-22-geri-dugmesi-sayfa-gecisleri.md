## Nerede kaldım

- Mesajlar (alt sekme) sohbet listesine ortak yuvarlak geri düğmesi eklendi (`ChatList.jsx`, `BackButton href="/"`); Takvim ve Görevler'deki gibi.
- Sayfa geçişleri incelendi. Zaten iyi olanlar: veriler (planlar, görevler, sohbetler, sporcular, envanter) uygulama katmanında ya da bellekte tutuluyor, sekme geçişinde yeniden okunmuyor; ileri giderken sayfa en üstten açılıyor, geri dönünce kaydırma yeri korunuyor; geçiş animasyonu kısa.
- Düzeltilen: Yarışlar, Etkinlikler ve Gönderiler listesi her açılışta boş "yükleniyor" gösterip bütün listeyi yeniden okuyordu. Bir kayda girip geri dönünce liste kayboluyor, kaydırma yeri de kayboluyordu. Artık son okunan liste bellekte (`racesNow`, `eventsNow`, `postsNow`): geri dönünce liste hemen çizilir, arkada tazelenir. Listeden 1 dk içinde açılan yarış/etkinlik yeniden okunmadan açılır (Firestore okuması azalır). Kayıt, silme, sonuç ve yer yazımı belleği eskimiş sayar.
- Test: `npm run test:elle` › "Sayfa geçişleri".

## Sıradaki işler

- Telefonda dene: Mesajlar'da geri düğmesi; Yarışlar › bir yarış › geri: liste ve kaydırma yeri yerinde mi.
