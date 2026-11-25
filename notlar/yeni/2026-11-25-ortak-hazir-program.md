## Nerede kaldım

- Fitness › yeni program › Hazır program › "Yelken ev kuvveti" artık ORTAK program (İlay'a özel PDF'ten): gitar/okul saati, 14 yaş, 17.45 notları çıktı; gün ve saatler düzenleme ekranında değişir. "Masa altı row" → "Band row" (afişteki fotoğraf; masa altı alternatifte).
- Hareket fotoğrafları uygulamayla geliyor: `public/fitness/hazir/*.jpg` (PDF afişlerinden kesildi, 40 hareket). "Örnek programı ekle"ye basınca (yalnız ana hesap) fotoğrafı/videosu olmayan hareketlerin kütüphanesine yüklenir ("Fotoğraflar 5 / 40"), sonra düzenleme ekranı açılır. Kod: `templates.js` PHOTOS/templatePhotos, `features/fitness/templateSeed.js`, `useFitLib.addMany` (tek kayıt + spreadLib).
- Fotoğrafsız 6 hareket: 90 90 nefes, Kedi deve, Ayak bileği knee to wall, Adductor rock back, Bodyweight split squat, Ana harekete prova. PDF'teki Kuvvet A "8 dk hazırlık" afişi yanlışlıkla ana çalışmayı gösteriyor (Seyhun'un "bir gün karışmış" dediği).
- Aynı hareket yazım farkıyla ikinci kez eklenmez: `library.js nameKey` (Türkçe harfsiz, + - / & işaretsiz, "ve/ile" atılır, sözcük sırası önemsiz). libKey, libDupes (Kopyalar), libRename, libAliases, ExercisePicker (yeni ekle düğmesi), ExerciseLibrary bunu kullanır.

## Sıradaki işler

- Telefonda dene: Hazır program › Örnek programı ekle → fotoğraflar yüklensin, program kaydedilince hareketlerde görünsün.
- Bir programı birden çok sporcuya tek seferde vermek (şimdi sporcu sporcu: Hazır program'da sporcu seç ya da ⋯ › Başka sporcuya ver).
