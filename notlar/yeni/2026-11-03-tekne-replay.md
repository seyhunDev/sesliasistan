## Nerede kaldım

- Tekne replay'i yayında (Seyhun 2026-11-03 "gerçek yarışta video yerine bunu da seçebilmeliyim; gruplara göre otomatik; döngü; şimdilik replay yazalım"): Yayın › Video › Kayıtlar'da "Tekneler" kutusu. Seçince önizlemede ekrandaki yarışın grubunun replay'i, Ekrana al ile canlı ekranın arkasında video yerine döngüde oynar (screen.kind `boats`).
- `src/features/tracking/BoatReplay.jsx` örnek veriyi (public/veri/ornek-start.json) bir kez yükler; grup `replayGroup` (lib/boatPlay.js): ekrandaki yarışın grubu veri setinde yoksa ilk grup.
- `BoatRace` `bare`: kendi rüzgâr/sayaç şeridi yerine üstte (telefonda altta) pembe "REPLAY" + "Start'a 00:03 / Start +00:08".
- Telefonda ve gerçek yarışta denenmedi.

## Sıradaki işler

- Gerçek konum akışı (takip/{yarış}/tekne) gelince replay o yarışın kendi start anını oynasın; şimdilik örnek yelken numaraları.
- İstenirse sesle "ekranda tekneleri göster".
