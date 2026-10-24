## Nerede kaldım
- iPhone uygulamasına bildirimler (Seyhun: "iOS app olarak bildirim sistemini kuracaktık, çalışıyor mu?"; cevap: çalışmıyordu, hiç kurulmamıştı; telefonda denenmedi):
  - Android'deki gibi Firebase Cloud Messaging, sunucu aynı. `mobil/ios/App/App/AppDelegate.swift`: Firebase (FirebaseCore + FirebaseMessaging, Swift paketi firebase-ios-sdk 12) yalnız `GoogleService-Info.plist` varsa başlar; Apple'ın anahtarı Firebase'e verilir, Capacitor PushNotifications'a FCM anahtarı gider. Eklentide `pushReady`. `App.entitlements` aps-environment development. Xcode'da "Firebase ayarı (bildirimler)" adımı plist'i Mac'teki `ios/App/App/` klasöründen uygulamaya kopyalar (depoda yok, gitignore).
  - Web: `nativePush.js` iPhone'da Velora.pushReady'ye bakar, açık uygulamada bildirimi iOS kendisi gösterir (capacitor.config.json PushNotifications.presentationOptions), yerel kopya yalnız Android'de. Kayıt `app: "ios"`. `fcmMessage.js` iPhone için ses, aynı etiketli bildirim öncekinin yerine geçer (apns-collapse-id), rozet.
  - Test: `test:elle` › "iPhone (APNs)".
- Seyhun'un bir kerelik işi: Firebase'de iOS uygulaması ekleyip GoogleService-Info.plist'i `~/Projeler/sesliasistan/mobil/ios/App/App/` içine koymak; Apple Developer › Keys'te APNs anahtarı (.p8) oluşturup Firebase › Cloud Messaging'e yüklemek; Xcode'dan yeniden kurup Ayarlar'da bildirimleri açmak.

## Sıradaki işler
0. Telefonda dene: Ayarlar › Bildirimler aç, kendine mesaj ya da hatırlatma gönder; uygulama kapalıyken ve açıkken bildirim geliyor mu, dokununca doğru sayfa açılıyor mu. Gelince ana ekrandaki PWA silinebilir.
