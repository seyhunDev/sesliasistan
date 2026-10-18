## Nerede kaldım
- Yarış multimedya › "Kaydetmeden önce" sade: satırda küçük resim, yarış tek dokunuşla açılan seçici (iPhone çarkı), evre dört parçalı düğme (Öncesi · Son 1 dk · Sırasında · Sonrası), Sil.
- Kaydet'e basınca liste açık kalır, her çekimde yükleniyor / ! görünür, yüklenemezse kırmızı sebep üstte ve düğme "Tekrar dene"; hepsi yüklenince kapanır ("n çekim kaydedildi").
- Hata: yarış günleri dışında (ör. yarıştan önce denerken) çekilen kaydediliyordu ama o gün listede olmadığı için görünmüyordu. Artık çekim ya da start olan her gün gün listesine eklenir (`liveDays`, lib/raceLive.js).

## Sıradaki işler
- Telefonda dene: yarıştan önceki bir gün fotoğraf çek, Kaydet, bugünün günü seçili gelip fotoğraf görünmeli. Kırmızı yazı çıkarsa metnini Seyhun'dan iste (Storage kuralı yayınlandı mı?).
