## Nerede kaldım
- Ana sayfada süren yarışın Multimedya kısayolu (Seyhun 2026-10-26, örnek "B · İnce şerit"): yarışın ilk gününden son gününe kadar kokpitte günlerin altında tek satır: kırmızı canlı nokta + "YARIŞ SÜRÜYOR", yarış adı (dokununca yarış sayfası), sağda camgöbeği Multimedya (`/athletes/races/<id>/media`) ve ⋯.
- ⋯: "Bu yarışta gösterme" (bu cihazda o yarış gizlenir, localStorage `sa-race-live-hide`; sonraki yarışta yine çıkar), "Hiç gösterme" (users.raceLive "off"). Ayarlar › "Ana sayfada yarış kısayolu" anahtarıyla geri açılır.
- Kod: `src/features/home/RaceLive.jsx`, `liveRace()` homeTiles, Cockpit `live` prop, OwnerHome (yalnız sporcu yetkisi olanlarda, useRaceHome().open), Groups.jsx `RaceLiveRow`, AuthProvider `raceLive`.
- Test: elle "süren yarış", "yarış kısayolu". Telefonda denenmedi.

## Sıradaki işler
- Yarış günü telefonda bak.

## Tasarım
- Süren yarış kısayolu: ince şerit, tek vurgu camgöbeği; kırmızı yalnız küçük "canlı" noktası.
