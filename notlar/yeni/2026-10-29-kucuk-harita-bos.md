## Nerede kaldım
- Yarış günü küçük harita (RegionMap mini) boş görünüyordu, dokununca tam ekran açılıyordu. Neden: maplibre kabına `.maplibregl-map { position: relative }` verir, sonra yüklendiği için Tailwind `absolute inset-0`'ı ezer, kap yüksekliği 0 kalır. Düzeltme: sabit boyutlu `absolute inset-0` sarmal + içinde `h-full w-full` kap.
- Bulut ortamında harita karoları kapalı, telefonda denenmedi.

## Sıradaki işler
- Seyhun yarış sayfasında küçük haritanın göründüğüne baksın.
