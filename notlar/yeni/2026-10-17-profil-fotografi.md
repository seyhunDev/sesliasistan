## Nerede kaldım
- Profil fotoğrafı (Seyhun: "herkes profil fotosu ekleyebilsin, ana hesaptan da herkes için"; telefonda denenmedi): herkes Ayarlar'daki yuvarlağa dokunup kendi fotoğrafını seçer; ana hesap kişi sayfasındaki yuvarlaktan herkesinkini ekler/değiştirir/kaldırır (`src/features/people/ProfilePhoto.jsx`). Fotoğraf 400 px'e küçültülüp Storage'a `orgs/{org}/avatars/{uid}/…jpg` yüklenir; adresi `/api/photo` (sunucu) users, members ve directory belgelerine yazar (firestore.rules değişmedi), eskisi silinir. Görünür: kişi sayfası, Kişiler listesi, ana sayfa yuvarlakları (`storyPeople` photo), Mesajlar (Avatar `photo`: liste, sohbet başlığı, grup mesajları, yeni sohbet, sohbet bilgisi). Testler: elle.mjs "Profil fotoğrafı".
- storage.rules'a `avatars` eklendi: Seyhun Firebase konsolu › Storage › Kurallar'da yayınlamalı, yoksa yükleme izin hatası verir.

## Sıradaki işler
0. storage.rules'ı yayınla; Ayarlar'da kendi fotoğrafını, kişi sayfasından bir çalışanın fotoğrafını ekle; Mesajlar ve ana sayfada görünüyor mu bak; çalışan hesabıyla kendi fotoğrafını ekle.
