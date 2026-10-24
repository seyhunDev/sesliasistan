## Nerede kaldım

- Asistanın yazı kutusuna (Yaz'a basınca açılan kutu) × düğmesinin yanına yuvarlak "Fotoğraf" düğmesi eklendi (src/features/home/TabBar.jsx, Composer/TypeBox). Resim seçici açar (image/*), seçilen dosyayı motorun `act.current.photoIn(file)` işlevine verir ve yazı kutusunu kapatır.
- Motor `photoIn` yayınlamadıkça düğme görünmez. Seçici açıkken yazı kutusu kendiliğinden kapanmaz (kapansa seçilen dosya kaybolurdu).
- Test: `npm run test:elle` › "Asistan: fotoğraf düğmesi".

## Sıradaki işler

- Motor tarafı (photoIn) birleşince telefonda dene: Yaz › Fotoğraf › resim seç.
