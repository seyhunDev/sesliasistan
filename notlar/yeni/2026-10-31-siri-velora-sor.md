## Nerede kaldım

- Arabada / CarPlay için Siri "Velora'ya sor" (Seyhun 2026-10-31 "Yap"): uygulama açılmadan Siri ne söyleneceğini sorar, asistanın cevabını okur; asistan soru sorarsa ("Gönderilsin mi?") cevabı da Siri alır, en çok 3 tur. `VeloraSorIntent` (App/VeloraShortcuts.swift, openAppWhenRun false), istek Apple Watch'unkiyle aynı yoldan sayfaya gider (`SaatKoprusu.sor`, web WatchBridge.jsx; web değişmedi). Eski "Velora'ya söyle / dinle" (uygulamayı açar) duruyor.
- Sınır: Velora telefonda arka planda açık değilse sayfa çalışmaz, 40 sn sonra Siri "Velora telefonda kapalı görünüyor" der. Gerçek CarPlay ekranı (Apple'ın "driving task" izni) yapılmadı.
- Xcode'da yeniden derleme gerekir; telefonda ve arabada denenmedi.

## Sıradaki işler

- Seyhun arabada denesin. Uygulama kapalıyken cevap gelmiyorsa çözüm: asistanı sunucu tarafında çalıştırmak (Siri doğrudan /api/assistant).
- CarPlay ekranı istenirse Apple'a CarPlay "driving task" izni başvurusu.
