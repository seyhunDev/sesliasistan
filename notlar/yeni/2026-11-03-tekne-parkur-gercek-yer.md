## Nerede kaldım

- Canlı tekne ekranı (BoatLive) artık yarışın parkurunu okuyor: Yayın › Parkur'da komite ve pin girildiyse (courseCard coursePoints, #1110) şamandıralar gerçek yerinde; örnek tekneler `placeSet` (lib/boatPlay.js) ile o start hattına taşınır (hattın ortası, eksen orta → 1, hat boyu ölçekli), rüzgâr yönü eksen. Girilmediyse eski örnek parkur.
- Canlı ekran `data.course`, Yayın önizlemesi `course` verir. Telefonda denenmedi.

## Sıradaki işler

- Olması gereken yerden kayan noktaların (coursePoints ghost/off) tekne ekranında bulanık gösterimi istenirse eklenir.
- Canlı konum akışı (takip/{yarış}/tekne) bu ekrana.
