## Nerede kaldım
- Ana sayfa yarış şeridi (RaceLive.jsx), Seyhun 2026-10-29:
  - Yarışın adının yanında "N. yarış" artık yazmıyor. Başka bir sayfanın sayacı çalışıyorsa o sayfanın adı yine görünüyor.
  - Süre seçimi ("5 dk ▾") sağ üste, ⋯ düğmesinin yanına taşındı. Yalnız beklerken görünüyor.
- Sayaç geç yükleniyordu, grafik önce uzayıp sonra kısalıyordu. Düzeltme: raceHome.js son yarış özetini bu cihazda saklıyor (localStorage "sa-race-home"). `useRaceHome` açılışta bu kopyayla başlıyor, okuma bitince güncelliyor. Okuma hata verirse saklanan kopya kalıyor.

## Sıradaki işler
- Telefonda denenmedi.
