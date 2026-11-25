## Nerede kaldım

- Sporcu tarafı hesap (sporcu, öğrenci, veli) alanın türü "Antrenman" olan planlarını doğrudan okur, people'da olmasa da (Seyhun 2026-11-25 "eklediğim antrenmanı bütün sporcularım görebilmeli", "Yapalım"). firestore.rules: staff `match /{col}/{id}` altında yeni `allow read` (col plans, myKind sporcu tarafı, resource.data.cat == "Antrenman"); sporcu tarafı "Antrenman" türünde plan oluşturamaz (kendi planı herkese açılmasın).
- DataProvider: sporcu tarafında planlar iki dinleyici (`people` array-contains uid + `cat == "Antrenman"`, fitness hariç), birleşir; kural yayınlanmadıysa ikinci dinleyici sessiz.
- Kayıt: adında antrenman geçen "Genel" plan "Antrenman" türünde kaydedilir (sporcu tarafı hariç). Ana hesap açıkken eski planların türü de düzelir ve people eşitlemesi yedek olarak sürer (lib/sporcuPaylas.js); sporcu tarafının kendi eklediği plan paylaşılmaz.
- Kural Seyhun'un konsoldan yayınlamasıyla devreye girer. Emülatörde denenmedi; sporcuPaylas çıktısı elle denendi.

## Sıradaki işler

- Seyhun kuralı yayınlayınca: uygulama kapalıyken eklenen antrenman sporcuda görünüyor mu, bak.
