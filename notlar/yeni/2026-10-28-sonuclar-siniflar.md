## Nerede kaldım
- Sonuçlar birden çok sınıf (Seyhun onayı 2026-10-28, örnek yaris-tasarim/sonuclar-siniflar.png): ResultsTab artık bütün yüklenen listeleri kullanıyor (`sharedRace.fleetsOf`: sınıf başına son liste); önceden yalnız son PDF okunuyordu, ikinci sınıf yüklenince ilki görünmüyordu.
- Üstte lacivert sınıf seçici (Optimist · ILCA 4 · …, kişi sayısı; bizimkilerin sınıfı noktalı ve açılışta seçili). O sınıfta bizimkiler yoksa Bizimkiler düğmesi çıkmaz, Genel açılır. Altta sınıf başına yükleme günü + "Sonuç PDF'i ekle" (eski "Değiştir" kalktı). Test: yaris.mjs "sonuçlar birden çok sınıf".

## Sıradaki işler
- Telefonda gerçek sonuçla bakılmadı. Ortak yarış sayfası (/races/[id], SharedRaceView) sınıfları hâlâ süzgeç çipleriyle gösteriyor; aynı seçici istenirse o konuşma yapar.
