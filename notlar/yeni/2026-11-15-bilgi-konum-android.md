## Nerede kaldım
- Bilgi ekranında Android'de harita/konum boş kaldı. Nedenler: (1) Android uygulamasının (mobil/android) AndroidManifest'inde konum izni yoktu; web sayfasının konum isteği bu yüzden sessizce reddediliyordu. ACCESS_FINE/COARSE_LOCATION eklendi; Android APK yeniden derlenmeli (GitHub Actions "Android APK"). (2) Konum hataları yutuluyordu; artık haritada kısa sebep: "Konum izni verilmedi", "Konum bulunamadı, telefonda konum açık mı?", "Konum bekleniyor…", "Bu tarayıcı konum vermiyor…". (3) Yüksek doğruluk 20 sn'de konum vermezse düşük doğrulukla da denenir; izin "Katıl ve başlat" dokunuşunda istenir.
- iOS uygulamasında NSLocationWhenInUseUsageDescription zaten var; Xcode değişikliği gerekmez.

## Sıradaki işler
- Android APK'yı yeniden derleyip kur, sonra dene. Tarayıcıda (Chrome) linkle açınca konum iznine "İzin ver".
