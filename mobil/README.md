# Android uygulaması (Capacitor kabuğu)

Web uygulamasının kendisi değişmez; bu klasör yalnız Android kabuğudur. Uygulama açılınca
https://sesliasistan.netlify.app yüklenir, bu yüzden Netlify'a giden her değişiklik uygulamada da hemen görünür.
APK yalnız bu klasör (yerel kod, simge, izinler) değişince yeniden kurulur.

## APK nereden alınır

- main'e her birleşmede GitHub Actions ("Android APK") APK'yı derler ve "android" sürümüne koyar:
  https://github.com/seyhunDev/sesliasistan/releases/tag/android
- Telefonda bu sayfayı aç (GitHub'a giriş yap), `asistan.apk`'ya dokun, indir, aç, "Bu kaynaktan izin ver", Yükle.

## Mac'te derlemek (isteğe bağlı)

Android Studio kurulu olmalı. `mobil` klasöründe:

```
npm install
npx cap sync android
npx cap open android
```

Android Studio açılınca telefonu kabloyla bağla (Geliştirici seçenekleri › USB hata ayıklama) ve Run'a bas.

## Neler yerelde

- `android/app/src/main/java/.../DosyaPlugin.java` + `assets/asistan-shim.js`: WebView'da olmayan tarayıcı işleri
  (paylaşım menüsü, dosya indirme, PDF/fotoğraf açma, yazdırma, WhatsApp/harita bağlantıları) yerel karşılığına bağlanır.
- `MainActivity.java`: geri tuşu uygulamanın içinde bir önceki sayfaya döner.
- İzinler: mikrofon, kamera, ekranın kararmaması (AndroidManifest.xml).
- Simge ve açılış ekranı `public/logo.svg`'den üretildi (`res/mipmap-*`, `res/drawable*/splash.png`).

## Henüz yok

- Bildirimler (web push WebView'da çalışmıyor; sıradaki adım Firebase Cloud Messaging).
- Arama sesinin ahize/hoparlör seçimi (yerel ses eklentisi), gelen aramada tam ekran zil.
