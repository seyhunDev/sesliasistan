## Nerede kaldım

- Açılışta ana sayfanın bir an kaybolup gelmesi düzeltildi (Seyhun: "yeniledim, logo geldi, sonra ekran geldi, gitti, geldi"; telefonda denenmedi). Neden veri değildi, sayfa geçiş animasyonuydu: ilk sayfa da 0,2 sn'lik solma animasyonu alıyordu, açılış ekranı sürerken bu animasyon durduruluyordu (`html[data-boot] .page-in { animation: none }`). Açılış ekranı çekildikten ~0,5 sn sonra `data-boot` kalkınca tarayıcı animasyonu baştan başlatıyor, sayfa görünmezden tekrar beliriyordu. Artık ilk sayfada solma yok (açılış ekranı zaten soldurur), yalnız alt sekmeler arası geçişte; durdurma kuralı kaldırıldı (globals.css › SAYFA GEÇİŞİ). Firestore'a ek okuma yok.

## Sıradaki işler

- Uygulamayı yenile: logo, sonra ana sayfa bir kez gelmeli ve kalmalı. Hâlâ kıpırdıyorsa hangi anda (kartlar mı, bütün sayfa mı) yeni threade yaz.
