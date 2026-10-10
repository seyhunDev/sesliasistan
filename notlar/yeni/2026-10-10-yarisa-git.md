## Nerede kaldım

- Ana sayfadan yarışın sayfasına (Seyhun: "şu an yarış ise o yarışın sayfasına gidilmeli, kulüpte sıradaki yarışa tıklayınca sıradaki yarışa gidilmeli"; telefonda denenmedi): Şu an kartındaki plan Yarış kategorisindeyse dokununca plan ekranı yerine yarışın sayfası açılır (adı yarışın adıyla aynı olan, yoksa bugün süren tek yarış; `raceForPlan`, homeTiles.js). Kulüp'teki "Sıradaki yarış" kartı artık Yarışlar listesini değil o yarışın sayfasını açar (`nextInfo` `id`). Ek okuma yok (yarış listesi ana sayfanın zaten okuduğu `useRaceHome().open`).
