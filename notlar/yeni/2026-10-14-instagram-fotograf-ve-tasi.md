## Nerede kaldım

- Storage taşıma 3. adım: Instagram gönderisinin fotoğrafı artık Firebase Storage'da (`orgs/{org}/postPhotos/{id}_{zaman}.jpg`, gönderide `photoPath`, `photoUrl`; posts.js `savePost`, `loadPhoto`, `deletePost`). Eski gönderilerin fotoğrafı Firestore'daki yerinden okunur, fotoğraf değişince Storage'a geçer. Yükleme olmazsa (internet yok) eski yere yazılır. Kural VAR: storage.rules'a `postPhotos` (yalnız ana hesap). Telefonda denenmedi.
- Ayarlar'ın en altında, Sürüm'ün altında "Telefondaki veriyi taşı" (Seyhun'un isteği): bekleyen kayıtları gönderir, yalnız bu telefonda duran yarış evrakını Storage'a taşır, özetlenmemiş toplantıları sayar. Hepsi gidince "Telefondaki kopyaları sil": hazırlanan evrak, talimat/fatura/envanter kopyaları ve uygulama dosyaları silinir (gerekince yeniden hazırlanır/indirilir). Toplantılar ve ayarlar silinmez (`MoveAll.jsx`). Telefonda denenmedi.

## Sıradaki işler

- Firebase › Storage › Kurallar'a güncel storage.rules'u yapıştırıp yayınla.
- Bir Instagram gönderisine yeni fotoğraf koy, kaydet, çıkıp yeniden aç; fotoğraf gelmeli.
- Ayarlar › Telefondaki veriyi taşı, sonra "Telefondaki kopyaları sil".
- Storage 4. adım: envanter, fatura, talimat ve sonuç dosyaları.
