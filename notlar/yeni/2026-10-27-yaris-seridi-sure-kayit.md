## Nerede kaldım

- Ana sayfadaki "YARIŞ SÜRÜYOR" şeridi büyüdü (Seyhun "Evet, böyle yap", örnek yaris-kontrol): büyük sayaç + Başlat/Durdur/Devam/Bitir · Kayıt · Multimedya.
- Sayaç telefonun tek sayacı (Countdown.jsx), yarışın multimedya sayfası adına çalışır: `raceStart`, `raceCancel`, `raceFinish` artık isteğe bağlı `own` alır. Başlat günün sıradaki yarışını aynı akışla açar (useRaceFlow), sayaç 0 olunca start saati yazılır (zeroRace). Multimedya'daki Süre aynı sayacı ve yarışı görür.
- Kayıt iPhone kamerasını açar (RecPick); çekilen dosya `raceMedia/handoff.js` ile yarışın Medya sayfasına geçer (RaceMedia `takeShot`), yükleme orada (MediaTab) sürer.
- Ana sayfada cihazlar arası canlı eşitleme (useLiveSync) yok; yarış kaydı açılışta bir kez okunur.
- Testler: elle "yarış şeridinde Süre ve Kayıt", ekran testi "Ana sayfa › yarış şeridinde Süre" (seed'e bugün süren "Canlı Kupa" eklendi). Telefonda denenmedi.

## Sıradaki işler

- Grafik: ölçülen dolu / tahmin çizgi seçimi bekleniyor (örnek olculen-dolu).
