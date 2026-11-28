## Nerede kaldım
- firestore.rules'a Velora Sailing için iki blok eklendi (KURAL DEĞİŞİKLİĞİ VAR): `sailingEvents` (Sailing ziyaret kayıtları: herkes sınırlı ekler, yalnız Velora ana hesabı okur/siler) ve `sailingTrim` (yelken ayarı: `originals` herkes okur, ana hesap yazar; `u_<uid>` kullanıcının kendisi).
- Seyhun yayınlamalı: `pbcopy < firestore.rules`, Firebase konsolu › Firestore › Kurallar › Yayınla.

## Sıradaki işler
- Yayınlandıktan sonra velora-sailing.netlify.app/ziyaret.html'de "Tüm ziyaretçiler gösteriliyor" yazısı görünmeli.
