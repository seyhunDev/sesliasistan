## Nerede kaldım

- Hareketin kendi videosu antrenman ekranında oynatılıyor (Seyhun: "sporcular eklediğim videoyu niye göremiyor, bizim bir video oynatma alanımız olmalı"; telefonda denenmedi): önceden yüklenen video yalnız küçük bir karede (80 px) duruyordu, dokununca tam ekran açılıyordu; YouTube ise "Videoyu izle" kartıyla görünüyordu. Artık adım adım antrenmanda ve antrenman listesinde hareketin kendi videosu da aynı kartla ("Videoyu izle", ilk kare + ▶) görünür, dokununca yerinde sesli ve oynatma düğmeleriyle oynar, "Küçült" ile kart olur (`MediaVideo`, ExerciseMedia.jsx; FitGuided `HowBody`, FitWorkout). Fotoğraflar ve diğer videolar küçük karelerde kalır. Firebase Storage yeni açıldığı için önceden denenen yüklemeler kaydedilmemiş olabilir; video yeniden eklenmeli.

## Sıradaki işler

- Fitness › Hareketler'den bir harekete video ekle, sporcu hesabıyla o hareketin antrenmanını aç: "Videoyu izle" kartı görünmeli, dokununca oynamalı.
