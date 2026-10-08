## Nerede kaldım
- Ana ekran ikonu yeniden (Seyhun: "çok kötü bir tasarım var, başka bir şey yapalım"; dört öneriden 1 "Sesten onay çizgisi" seçildi; telefonda denenmedi): yeşil zeminde (#2f8f76 → #174d40, çapraz) tek beyaz çizgi önce ses dalgası gibi kıvrılıp onay işaretine dönüşür. Önceki küre + sarı halka logosunun yerine geçti. Dosyalar: `public/logo.svg`, `src/app/icon.svg`, `public/logo.png`, `src/app/apple-icon.png` (180), `public/icons/icon-192/512.png` (köşeden köşeye dolu, 1024 px'ten), favicon. Açılış ekranı (`BootSplash.jsx`, globals.css `.boot-logo`, `.boot-line`): çizgi soldan sağa çizilerek gelir, yükleme sürerken logo hafifçe nefes alır, bitince büyüyüp solar. Service worker `sa-v13`. Öneriler ve örnek: `/mnt/project-files/logo/`.

## Sıradaki işler
0. iPhone'da ikonu ana ekrandan sil, Safari'de sesliasistan.netlify.app'i açıp Paylaş › Ana Ekrana Ekle; yeni ikon ve açılıştaki çizgi çizimi.
