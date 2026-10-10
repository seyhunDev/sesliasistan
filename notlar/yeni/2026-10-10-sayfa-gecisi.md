## Nerede kaldım

- Sayfa açılışı ve geçiş (Seyhun: "sayfalar neden çok kötü açılıyor, örneğin Fitness; animasyonu güzel açılmalı tüm sayfalar"; telefonda denenmedi): (1) Ortak sayfa geçişi (`src/app/(app)/template.jsx`, globals.css › SAYFA GEÇİŞİ): ileri giderken yeni sayfa sağdan 24 px kayarak ve solarak belirir (0,3 sn), geri dönünce soldan; alt sekmeler (Ana sayfa, Takvim, Mesajlar, Görevler) arasında yalnız solma; içinde sabit çubuk olan sayfalarda (yarış, Sporcular…) yalnız solma; açılış ekranından sonra ilk sayfada geçiş yok; "Hareketi azalt" açıksa yalnız solma. Yön `pageDir` (navProgress.js). Önceden her sayfa yalnız 0,2 sn soluyordu. (2) Fitness zıplaması: program listesi okunurken sayfa önce boş program ekranını, liste gelince tanıtımı ya da programı çiziyordu (ekran baştan değişiyordu). Artık liste bu cihazda da saklanır, sayfa hemen son bilinenle açılır (`peekPrograms`, `sa-fit-progs:<org>`, fitnessData.js); hiç bilgi yoksa aynı yerde sakin iskelet. Ek Firestore okuması yok. Örnek video: `/mnt/project-files/sayfa-gecisi/gecis-ornek.mp4` (yavaşı `gecis-yavas.mp4`).

## Sıradaki işler

- Telefonda dene: ana sayfadan Fitness, Planlar, Notlar aç, geri dön; alt sekmeler arasında gez. Geçiş takılıyor ya da başka bir sayfa zıplayarak açılıyorsa sayfanın adını yaz (o sayfaya da Fitness'taki gibi saklama/iskelet eklenir).
