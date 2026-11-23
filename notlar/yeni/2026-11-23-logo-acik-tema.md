## Nerede kaldım
- Logo ve giriş ekranı açık temaya uyduruldu (Seyhun 2026-11-23 "Yap", örnek https://claude.ai/artifact/UcXQ6X7NDR4UTBVNqQ9XZf, seçenek A).
- Uygulama ikonu: beyaz kare, koyu gri (#1d1d1f) daire, içinden oyulmuş V. Çizim aynı (MARK_DISC, MARK_V), yalnız renkler değişti: web simgeleri (src/app/icon.png, apple-icon.png, favicon.ico, public/icons, public/favicon.ico, public/brand/velora-mark.svg), iPhone AppIcon, saat AppIcon, Android simge ve açılış resimleri (#f5f5f7 zemin, koyu daire), Android simge zemini beyaz, Capacitor android backgroundColor #f5f5f7, mobil/www hata sayfası açık.
- Giriş ekranı ((auth)/layout.jsx, login): lacivert kokpit yerine `.acik.auth-acik` açık zemin, koyu logo (VeloraGlyph #1d1d1f), beyaz yazı kutusu (.auth-acik .auth-in), mavi düğme. Açılış ekranı (#1486) ile aynı; açılış logosu giriş logosunun yerine uçar.
- iPhone ve saat ikonu, iPhone/Android açılış resmi ancak Xcode ile yeniden kurulunca (Android APK yeniden derlenince) görünür. Telefonda denenmedi.

## Sıradaki işler
- Değişmeyenler (koyu zeminli kendi tasarımları): iPhone widget'ları (lacivert zemin, beyaz işaret), saat içindeki LogoKure (lacivert küre), paylaşım eklentisi zemini (lacivert), "Hangi spor?" ekranı (SportPick, lacivert deniz; yalnız kayıtta). İstenirse bunlar da açığa çekilir.
- public/logo.png eski ses dalgası logosu, hiçbir yerde kullanılmıyor.

## Tasarım
- Logo açık temada: beyaz zemin + koyu gri #1d1d1f daire + oyuk V. Açık zeminde işaret koyu, koyu zeminde beyaz. Lacivert kareli simge artık yok.
