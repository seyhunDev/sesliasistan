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

## Bildirimler

Firebase Cloud Messaging ile (`@capacitor/push-notifications`; açık uygulamada `@capacitor/local-notifications` gösterir).
Firebase konsolunda Android uygulaması (paket `com.seyhunyildiz.sesliasistan`) kayıtlı olmalı; indirilen
`google-services.json` depoya konmaz, GitHub gizlisi `GOOGLE_SERVICES_JSON`'dan derlemede yazılır (Mac'te elle
`android/app/google-services.json`). Dosya yoksa APK bildirimsiz derlenir, uygulama çökmez (`pushReady`).
Web tarafı: `src/lib/nativePush.js`, `src/lib/push.js`; sunucu: `src/lib/server/sendDevice.js` (kayıtta `fcm` varsa FCM).

## Aramalar

- Ses yönü: `AsistanDosya.audioRoute` (telefon görüşmesi kipi; ahize, kulaklık/Bluetooth ya da hoparlör; yakınlıkta
  ekran kararır). Web: `src/lib/nativeCall.js`, `src/features/call/route.js`.
- Gelen arama: sunucu (`/api/call-ring`, `src/lib/server/callPush.js`) yalnız veri taşıyan FCM mesajı gönderir;
  `AramaMesaj.java` (eklentinin MessagingService'ini genişletir) "arama" kanalında zil çalan, tam ekran bildirim
  gösterir. Aç: `MainActivity` → `DosyaPlugin.answer` → web `takeAnswer`/"answer". Reddet: `AramaReddet.java`.

## Henüz yok

- Arama sürerken uygulama arka plana geçince mikrofonun kesilmemesi (ön plan hizmeti).
- Atama bildiriminin "iletildi" onayı Android'de yazılmaz (bildirim kodu arka planda çalışmıyor).
