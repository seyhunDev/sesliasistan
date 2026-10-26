## Nerede kaldım

- #825'ten sonra da iPhone'da "Kayıt uygulamaya alınamadı" çıktı (Seyhun 2026-10-26). Sayfa canlı siteden (https) açık; capacitor:// adresindeki dosyayı `fetch` ile okumak WebView'de düşüyor (CORS dışında da engel var).
- Düzeltme: VeloraKamera.swift `cameraRead` (file, offset, length → base64, son parçada geçici dosya silinir; yalnız tmp içindeki velora- dosyaları). nativeIos.js `readNative` 2 MB'lık parçalarla Blob kurar; eski kurulumda fetch'e düşer. Uyarı artık hatanın kendisini de yazar.
- Xcode'dan yeniden kurulum gerekir. Telefonda denenmedi.

## Sıradaki işler

- Seyhun yeniden kurup kısa ve 80 sn video denesin; hâlâ uyarı çıkarsa uyarıdaki yazıyı göndersin.
