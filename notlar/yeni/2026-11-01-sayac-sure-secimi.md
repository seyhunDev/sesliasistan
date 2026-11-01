## Nerede kaldım

- Sayaç (antrenman günü Süre ve yarış multimedyası Start, ortak `src/features/training/Countdown.jsx`): sayacın altındaki start sırası şeridi (5 Uyarı · 4 Hazırlık · 1 Son dk · 0 Start) kalktı. Üstteki "5 dk ▾" seçimi ve Süre penceresi (Başka süre) kalktı; sayaç dururken büyük rakamların altında 5 · 4 · 2 · 1 dk düğmeleri var (Seyhun 2026-11-01).
- Seçilen süre telefonda `sa-sayac-dk` olarak saklanır; duran sayaç her yazılışta (Sıfırla, Bitir, asistanın ya da başka cihazın sayacı bitince) bu süreye döner. Asistan "7 dakikalık sayacı başlat" derse yine 7 dk başlar, bitince seçili süreye döner.
- Bipler ve Saat (watchTimer) start sırasını kullanmaya devam ediyor; yalnız telefondaki şerit gizlendi.
- Test: test:yaris-ekran "süre seçimi" (seçenekler, üstte seçim ve şerit yok, 2 dk seçilir, yenileyince 2 dk kalır).

## Sıradaki işler

- Başka süre (ör. 3 dk) isterse seçeneklere eklenir; şimdilik yalnız 5 · 4 · 2 · 1.
- Ana sayfadaki yarış şeridinin "5 dk ▾" seçimi ana sayfa ipliğinde, değişmedi.

## Tasarım

- Sayacın süre seçimi sayacın altında tek sıra düğmeler (seçili beyaz dolu); üstte seçim yok, aşama şeridi yok.
