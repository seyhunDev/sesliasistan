## Nerede kaldım

- Seyhun 2026-10-28: "Videoyu çektim, Kullan dedim, galeriye gittim, bomboş." Sebebi: iPhone "Videoyu Kullan"dan sonra önce aslını Fotoğraflar'a kaydediyor, sonra buluta gidecek 1080p kopyayı hazırlıyor, ardından dosya uygulamaya parça parça geçiyor. Bu sürede Medya'da hiçbir şey görünmüyordu.
- Artık çekim bitince Medya sekmesi açılıyor ve en üstte "Yeni çekim" başlığı altında dönen "Kaydediliyor" karesi görünüyor. Altta da "Video Fotoğraflar'a kaydediliyor" yazısı çıkıyor. Kayıt listeye girince kare gerçek videoya dönüşüyor (yükleme halkasıyla).
- Parçalar: `src/features/raceMedia/shooting.js` (durum), `RecPick` (`onTaken`), `nativeCamera(t, onTaken)` (lib/nativeIos.js), VeloraKamera.swift `cameraTaken` olayı.
- Eski iPhone kurulumunda kare, dosya uygulamaya geçerken çıkıyor; kopya hazırlanırken çıkmıyor. Tam hali Xcode ile yeniden kurulunca gelir.
- Kalite: iPhone kamerası `videoQuality = .typeHigh` (1080p) ile çekiyor, aslı Fotoğraflar'a o kalitede kaydediliyor, buluta 1080p kopya gidiyor (60 MB sınırı değişmedi). 4K / 60 fps için kendi kamera ekranımızı yazmamız gerekir. Bunu Seyhun'a sordum.

## Sıradaki işler

- Telefonda dene: çekim → Kullan → Medya'da "Kaydediliyor" karesi hemen görünüyor mu?
- Seyhun 4K isterse kendi kamera ekranı (AVCapture) ayrı bir iş olacak.
