## Nerede kaldım
- Ana ekran ikonu kareyi tam doldurmuyordu (Seyhun: "çok kötü bir tasarım var, karenin içine oturmalı, pikseli yüksek olmalı"; iPhone'da ikonun altında ve sağında siyah bant vardı): yeni logonun PNG'leri yanlış boyutta çizilmişti (görsel kenara kaymış, kalan yer saydam; iPhone saydamı siyah gösteriyor). İkonlar 1024 px'ten yeniden üretildi: `src/app/apple-icon.png` (180), `public/icons/icon-192.png`, `icon-512.png` köşeden köşeye dolu, saydamlık yok; manifeste `maskable` ikon eklendi; `public/logo.png` ve favicon (16/32/48) da yeniden. Service worker `sa-v12`. Yeni ikon tasarımı için öneriler ayrı hazırlanıyor.

## Sıradaki işler
0. iPhone'da ikonu ana ekrandan sil, Safari'de sesliasistan.netlify.app'i aç, Paylaş › Ana Ekrana Ekle; ikon kareyi kenardan kenara doldurmalı.
