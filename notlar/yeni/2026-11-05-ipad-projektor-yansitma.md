## Nerede kaldım

- iPad'i projektöre (Nebula Capsule 3) bağlayınca Velora sayfaları yansımıyordu. Sebep: `mobil/ios/App/App/AppDelegate.swift` harici ekran için de SceneDelegate sahnesi veriyordu, projektörde ikinci bir Velora penceresi açılıyor, iOS yansıtmayı bırakıyordu.
- Düzeltme: harici ekran sahnesine pencere verilmiyor, iOS düz yansıtır. Xcode ile yeniden kurulum gerekir. Cihazda denenmedi.

## Sıradaki işler

- Seyhun yeniden kurup projektörde dener.
- İstenirse: projektörde yalnız tam ekran /canli, iPad'de Yayın (ikinci ekran modu).
