## Nerede kaldım

- Arka plandan dönünce ana sayfaya düşme (Seyhun 2026-11-08: "yarış detayında ya da canlı sayfadayım, açınca ana sayfaya gitmiş oluyor; yalnız tamamen çıkarsam ana sayfadan açılsın"). Neden: iPhone arkadaki uygulamanın web sürecini kapatınca (bellek), dönüşte uygulama siteyi baştan, kök adresten (`/`) açıyordu (`VeloraViewController` `oneGeldi` boş sayfada siteyi açar, Capacitor süreç ölünce yeniden yükler).
- `src/lib/place.js` + `src/components/ui/KeepPlace.jsx` (kök düzende): açık sayfa her geçişte `sessionStorage` `sa-place`'e yazılır. Aynı pencere yeniden yüklenince durur, uygulama tamamen kapanınca silinir. Kök düzendeki satır içi `PLACE_SCRIPT`: sayfa yalnız `/` (sorgu/# yok) ile yükleniyorsa ve kayıtlı yer başka bir sayfaysa ilk çizimden önce oraya geçer. Giriş sayfaları ve dış adres kaydedilmez; çıkışta silinir. Yeni sürüm tam yüklemesi (newVersion `onClick`) hedefi önceden yazar, ana sayfaya gidiş geri dönmez.
- Testler: `npm run test:elle` › "Kalınan sayfa" 4/4; `npm run test:cevrimdisi` › Anında açılış: ana sayfadan yüklenince kalınan sayfa, yeni pencerede ana sayfa (28/28). Aynı grupta açılış ekranı ölçüsü 2026-11-04 tasarımına (bootwarm, 0,45 sn sonra logo) göre güncellendi. Telefonda denenmedi; iPhone'da `sessionStorage`'ın web süreci kapanınca korunduğu varsayıldı.

## Sıradaki işler

- Telefonda dene: yarış sayfasındayken uygulamayı uzun süre arkada bırak, dön; aynı sayfa açılmalı. Olmazsa yer `localStorage` + yerel uygulamadan "soğuk açılış" işaretiyle tutulur (Xcode gerekir).
