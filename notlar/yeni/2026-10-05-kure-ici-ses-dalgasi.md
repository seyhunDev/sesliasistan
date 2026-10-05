## Nerede kaldım

- Ses dalgası kürenin içinde (Seyhun: "kürenin altındaki ses dalgasını güzel bir şekilde kürenin içine ekleyebilir miyiz"; telefonda denenmedi): dinlerken kürenin altındaki ayrı dalga satırı kalktı; kürenin içindeki 5 çubuk yerine sesle akan dalga kürenin içinde çizilir (beyaz çubuklar kırmızı diskin üstünde, sağdan girer sola akar, sol kenarda silikleşir; çubuklar dairenin içinde kalır, kenara yaklaştıkça kısalır). Bekliyor/çalışıyor/konuşuyor durumlarında eski 5 çubuk aynen duruyor. Dinlerken kubbe artık uzamıyor (alttaki satır ve üst boşluk kalktı). `ListenWave round` (ListenWave.jsx), `VoiceLight` (TabBar.jsx), `.vl-live` (globals.css). Küre boyutu ve durum renkleri değişmedi.

## Sıradaki işler

- Küre içindeki dalgayı telefonda dene: küreye dokun, konuş; dalga kürenin içinde sesinle yükselip alçalıyor mu. Çubuklar çok ince/sık ya da çok kısa gelirse yeni threade yaz (`bar`, `gap`, `0.62` oranı ListenWave.jsx'te).

## Tasarım

- Dinlerken ses dalgası kürenin içinde (ListenWave round), kürenin altında ayrı dalga yok (2026-10-05).
