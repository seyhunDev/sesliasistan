## Nerede kaldım
- Bilgi ekranı pusulası Android'de dik tutunca yanlış (Seyhun 2026-11-15, Hiking telefon; iPhone doğru). Hesap (tiltHeading, W3C ZXY matrisi) benzetimle doğrulandı: 20.000 rastgele duruşta dörtlük yoluyla aynı sonuç, dik/eğik örnekler doğru. Yani formül doğru, Android'in açı olayı (deviceorientationabsolute) dik duruşta bozuk veri veriyor olabilir.
- Android'de artık önce AbsoluteOrientationSensor (dörtlük, lib/bilgi quatHeading) kullanılıyor; yoksa, izin yoksa ya da 2 sn'de okuma gelmezse eski olaya dönülür. iPhone yolu aynı.

## Sıradaki işler
- Hiking telefonda Chrome'da ve uygulamada dene. Uygulamada (WebView) sensör yoksa eski yol sürer; o zaman yerli eklenti gerekebilir.
