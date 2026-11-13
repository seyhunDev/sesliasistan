## Nerede kaldım

- Daha hızlı açılış (Seyhun 2026-11-13, "1 + 4: asistan sonra, süre göster"):
  - Asistan ekranı (`AssistantSheet`, yani useAssistant, beyin/, isler/, ses) `AssistantProvider` içinde `next/dynamic` ile yükleniyor. Sayfa çizildikten sonra boşta yüklenir (en geç 2,5 sn). Asistan daha önce açılırsa hemen yüklenir.
  - Açılış süresi `src/lib/openTime.js` + `components/ui/OpenTimer.jsx` ile ölçülüyor. Veriler hazır olup ekran ilk çizildiğinde yazılır, localStorage `sa-open-ms`, son 10 açılış tutulur. Ayarlar › Hesap › "Açılış süresi" satırı son açılışı ve ortalamayı gösterir.
- Ölçüm (prod derleme + emülatör, 4x yavaş işlemci, 7 açılış, ortanca):
  - Açılışta inen JS 3.169 KB'tan 2.628 KB'a düştü.
  - Betik süresi 1.381 ms'den 1.319 ms'ye indi.
  - Ekranın görünme süresi farkı ölçüm gürültüsü içinde kaldı (2.280 ve 2.298 ms).
  - Kazanç en çok yavaş ağda ve önbelleksiz açılışta beklenir.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda Ayarlar › Açılış süresi değerine bak. Hâlâ yavaşsa sıradaki adaylar şunlar:
  - AddSheet'i sonra yüklemek.
  - iPhone uygulamasında App-Bound Domains ile service worker (Xcode gerekir).
