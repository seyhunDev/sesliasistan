## Nerede kaldım

- Simgedeki bildirim sayısı inmiyordu (Seyhun: "hepsine baktım, sayı duruyor"; telefonda denenmedi).
  - Sebep: iPhone uygulamasında (Capacitor, #800 FCM/APNs) sayıyı sunucu her bildirimle APNs'e koyuyor, ama indiren yol yoktu. Uygulama sayıyı `navigator.setAppBadge` ile yazıyordu; WKWebView'da bu yok, hiçbir şey olmuyordu. Sunucu da 0 göndermiyordu.
  - Düzeltme: `VeloraPlugin.badge` (Swift, setBadgeCount; 0 olunca bildirim merkezindeki Velora bildirimleri de kalkar) + src/lib/nativeIos.js `iosBadgeKind/setIosBadge`. Eski kurulu uygulamada (badge yöntemi yok) DataProvider sayı değişince `/api/badge` çağırır: sunucu sayıyı zilden hesaplar, iPhone FCM kayıtlarına yalnız sayı taşıyan APNs bildirimi gönderir (`badgeMessage`, fcmMessage.js). Web (ana ekran PWA) eskisi gibi navigator.setAppBadge.
  - Test: bildirim.mjs "Simgedeki sayı (iPhone uygulaması)".
  - Sayı, zil penceresi açılınca ya da bildirimin işi açılınca (kayıt, sohbet, sayfa) düşer; telefonun bildirim merkezinde bakmak sayılmaz.

## Sıradaki işler

0. Xcode'da uygulamayı yeniden derleyip yüklemek gerekir (badge yöntemi); o zamana kadar sunucu yolu çalışmalı. Telefonda: bildirim gelsin, zili aç, simgedeki sayı kalksın.
