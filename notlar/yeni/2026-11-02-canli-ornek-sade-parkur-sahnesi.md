## Nerede kaldım

- Canlı ekran sadeleşti: bilgiler altta tek şeritte (ne oluyor, süre, sıra, rüzgâr, parkur, sıradaki start). Üstte soluk başlık, solda tek panel.
- Ortadaki büyük saat yalnız geri sayarken (start'a ya da ilk start'a) ve sayaç durunca görünür; ileri saymaya geçince şeride iner.
- Parkur sürekli ekranda değil: yarış öncesinde görünür, yarışta yeni ölçüm girilince 20 sn çıkar, şeritteki "Parkur"a dokununca açılır.
- Yarışta sol panel 12 sn'de bir günün yarışı ile genel sıralama arasında değişir.
- Örnek yarış `/canli/ornek` (src/features/liveScreen/demo.js): Sarı grup, 6 sporcu, 3 yarış (2'si dün). 13 adım oynar (yarış öncesi → parkur → start dizisi → start → dönüş → video → alt yazı → rüzgâr değişti → ara → finiş → gün sonu). Veritabanına dokunmaz.
- Parkur sahnesi tasarım örneği (src/lib/courseScene.js, henüz ekrana bağlı değil): rota kartının parkuru denizde eğik; komite/pin botu arasında START, sarı şamandıralar, finiş botu; seçilen rota (1 · 2 · 3 · F) ayak ayak sarı okla çizilir, sonra oklar akar; kapıda iki seçenek. Örnek: /mnt/project-files/samandira-donus/parkur-animasyon/ornek.html. Seyhun'un onayı bekleniyor.

## Sıradaki işler

- Parkur sahnesi onaylanınca: parkur kartları (gün içinde birden çok kart, biri varsayılan ve seçili; her kartın rotası), start başına kart seçimi (rounds[sid].card), canlı ekranda kart yerine sahne.
- Telefonda deneme yapılmadı.
