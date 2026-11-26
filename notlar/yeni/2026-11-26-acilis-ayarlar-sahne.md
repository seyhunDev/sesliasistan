## Nerede kaldım
- Açılış ekranı koyu Sahne (Seyhun 2026-11-26 "eski Velora kalmasın"): web BootSplash #0b0b0c + limon daire içinde oyulmuş V; manifest, capacitor ios/android backgroundColor, VeloraViewController zemini #0b0b0c; iOS Splash ve Android splash PNG'leri koyu zemin + limon daireye boyandı (iPhone Xcode ile yeniden kurulmalı, APK yeniden derlenmeli).
- Ortak "Sahne sayfa" sınıfı: globals.css `main.sahne-pg` (renk değişkenleri koyu + limon, body'de de; eski .ck şeridi zemine karışır; başlık .sahne-t). Eski sayfaları Sahne'ye geçirmenin ilk adımı.
- Ayarlar ve alt sayfaları Sahne: settings/page.jsx (koyu üst, dar büyük AYARLAR), Yayın (BroadcastStats), Testler, Bildirim testi, Ses testi, Asistan raporu, Mail ayarları. Telefonda denenmedi.

## Sıradaki işler
- Eski tasarımda kalan sayfaları sahne-pg ile sırayla geçir (liste: thread mesajı 2026-11-26).
