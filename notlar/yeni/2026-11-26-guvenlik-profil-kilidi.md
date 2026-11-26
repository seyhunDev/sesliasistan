## Nerede kaldım
- Sistem taraması madde 2: `firestore.rules` users/{uid} güncellemesinde kişi kendi profilinde `via` (Sailing kaydı), `restaurantOf`/`placeId` (Velora Food restoran hesabı) alanlarını değiştiremez, `coach`'u `true` yapamaz (ana hesabın antrenör bilgisi nesnesi serbest). Bu alanları yalnız sunucu yazar. Seyhun konsoldan yayınlayacak. Emülatörle denenmedi.

## Sıradaki işler
0. Kural yayınlandıktan sonra: profil adı/foto değişikliği, antrenör bilgisi kaydı (yarış sayfası) çalışıyor mu bak.
