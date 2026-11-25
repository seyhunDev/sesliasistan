## Nerede kaldım
- /canli Video sekmesi kopyasız (Seyhun 2026-11-08 "galerimde zaten var, iki defa kullanmaya gerek yok", karar kartında "Evet, kopyasız yap"; "daha önce eklenenleri de silmemiz lazım"):
  - iPhone: VeloraKamera.swift `galleryPick` (PHPicker, çoklu, yalnız video; { asset, dur, at, th }) ve `galleryOpen` (Fotoğraflar'dan geçici dosya; 250 MB üstü 1080p küçültülür; web cameraRead ile okur, son parçada silinir). VeloraPlugin.swift'e iki yöntem eklendi. Xcode ile yeniden kurulmalı.
  - Web: nativeIos.js `hasGallery`, `galleryPick`, `galleryBlob`. LiveVideos: yeni kurulumda "Galeriden ekle" Fotoğraflar seçicisini açar; pendingStore'a yalnız kimlik, süre, çekim anı, küçük resim yazılır. Velora kamerasıyla çekilip Fotoğraflar'a kaydedilenin kopyası da tutulmaz. Oynatırken ve YouTube'a yüklerken Fotoğraflar'dan geçici kopya (bellekte), karede "Açılıyor".
  - Eski kopyalar (ilk açılışta, yalnız yeni kurulumda): kimliği olanın kopyası silinir; kimliksiz galeri kopyası (dosya adı velora- değil) listeden kalkar (aslı Fotoğraflar'da, gerekirse yeniden eklenir); Velora kamerasının kimliksiz kaydı tek kopya olduğu için kalır.
  - Eski kurulumda hiçbir şey değişmez (web dosya seçicisi, kopya).
  - Medya sekmesi ve /media blob'suz kayıtları atlar.
- "Sınırlı erişim"de seçilen video okunamayabilir: mesaj Ayarlar › Velora › Fotoğraflar › Tüm Fotoğraflar.

## Sıradaki işler
- Mac: `cd ~/Projeler/sesliasistan && git pull && cd mobil && npx cap sync ios`, Xcode › Run. Dene: Galeriden ekle (çoklu), videoya dokun (Açılıyor, sonra ekranda oynar), uzun/iCloud'daki video, YouTube'a yükle, Sil. Telefonda denenmedi, Swift derlenmedi (bulutta Xcode yok).
