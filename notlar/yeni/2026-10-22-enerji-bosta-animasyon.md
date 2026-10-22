## Nerede kaldım

- Enerji: alt çubuktaki asistan düğmesinin boştaki dalgası ve görünmeyen ama sürekli dönen halkası durduruldu (halka yalnız çalışırken döner). Ana sayfa boştayken saniyede ~21 stil hesabı yapılıyordu, artık 0.
- Asistan ekranı boştayken zemindeki renk bulutları, ışık ve ortadaki logonun nefesi durur; dinlerken, çalışırken ve konuşurken oynar (globals.css, "Enerji" bloğu).
- Ekran testine "Enerji (boşta)" eklendi: ana sayfa ve açık asistan boştayken saniyede en çok 3 stil/yerleşim hesabı (Chrome Performance ölçüsü).
- Ekran testinde "Yarış multimedya: sayaç" main'de de düşüyor (Başlat düğmesi bulunamıyor), bu değişiklikten değil; multimedya thread'ine bildirildi.
- Telefonda ölçülmedi: Ayarlar › Veri ve cihaz › Enerji kullanımı › "2 dakika ölç".

## Sıradaki işler

- Telefonda enerji ölçümünü önce/sonra karşılaştır.
