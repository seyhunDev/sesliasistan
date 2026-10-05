## Nerede kaldım
- Geri tuşu döngüsü düzeltildi (Seyhun: "Aidata gittim, geri dedim sporculara gitti, geri dedim aidata gitti, geri dedim sporculara gitti"; telefonda denenmedi): uygulama bir sayfada açıldığında (önceki sayfa yokken; ilk açılış, yenileme, bildirim) geri düğmesi üst sayfayı geçmişe EKLİYORDU (push). Üst sayfada geri basınca önceki sayfaya dönülüyor, oradan yine üst sayfaya gidiliyordu: iki sayfa arasında döngü. Artık üst sayfa geçmişte bu sayfanın yerine geçer (replace; `BackLink`, `goBack`, navTrail.js), üst sayfada geri ana sayfaya gider. Aidatlar'ın üst sayfası Sporcular yerine ana sayfa (Aidatlar ana sayfadan açılıyor). Testi `test:elle` › "Geri düğmesi" › "Aidatlar'da açıldı".

## Sıradaki işler
0. Döngüyü dene: Aidatlar'dayken uygulamayı yenile (ya da kapatıp aç), geri bas: ana sayfa açılmalı, bir daha geri basınca Aidatlar'a dönmemeli. Ana sayfa › Aidatlar › geri › ana sayfa.
