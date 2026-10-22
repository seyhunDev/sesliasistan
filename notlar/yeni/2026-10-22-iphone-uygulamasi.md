## Nerede kaldım

- iPhone uygulaması (yalnız Seyhun'un kendi telefonunda deneme, App Store yok; Seyhun: "izinlerle uğraşmak istemiyorum, sadece kendi telefonumda testler yapacağım, uygulama gibi kullanmak istiyorum"; telefonda denenmedi): `mobil/ios` (Capacitor 8 iOS, Swift Package Manager, CocoaPods yok). Android kabuğu gibi canlı siteyi (sesliasistan.netlify.app) açar; web değişiklikleri Xcode'a gerek kalmadan gelir. Ana ekranda "Velora", simge `public/icons/icon-512.png`'den 1024 px, açılış koyu lacivert. Info.plist: mikrofon, kamera, fotoğraflar izin metinleri; arka planda ses (ekran kilitlenince arama/toplantı kaydı sürsün). Kurulum Mac'te Xcode ile: `cd mobil && npm install && npm run ios`, Team seç, iPhone'u bağla, Run (ücretli geliştirici hesabıyla imza 1 yıl geçerli; ücretsiz Apple kimliğiyle 7 gün). Henüz yok: bildirimler (APNs anahtarı + Firebase gerekir; PWA'yı silme), dosya indirme/yazdırma (paylaşım çalışır), kapalıyken arama zili (CallKit). Ayrıntı `mobil/README.md` › iPhone.

## Sıradaki işler

- Mac'te Xcode ile iPhone'a kur; giriş, sesli asistan (mikrofon), kamera (fiş, Kayıt), arama (ahize/hoparlör), paylaşım dene. Çalışmayanları yeni threade yaz.
- İstenirse: iPhone uygulamasına bildirimler (Apple Developer'da APNs anahtarı, Firebase'e yükleme), Excel/PDF indirme ve yazdırma, CallKit ile kapalıyken arama zili.
