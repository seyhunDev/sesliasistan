## Nerede kaldım

- Canlı ekran sadeleşti: bilgiler altta tek şeritte (ne oluyor, süre, sıra, rüzgâr, parkur, sıradaki start). Üstte soluk başlık, solda tek panel.
- Ortadaki büyük saat yalnız geri sayarken (start'a ya da ilk start'a) ve sayaç durunca görünür; ileri saymaya geçince şeride iner.
- Parkur sürekli ekranda değil: yarış öncesinde görünür, yarışta yeni ölçüm girilince 20 sn çıkar, şeritteki "Parkur"a dokununca açılır.
- Yarışta sol panel 12 sn'de bir günün yarışı ile genel sıralama arasında değişir.
- Örnek yarış `/canli/ornek` (src/features/liveScreen/demo.js): Sarı grup, 6 sporcu, 3 yarış (2'si dün). 13 adım oynar (yarış öncesi → parkur → start dizisi → start → dönüş → video → alt yazı → rüzgâr değişti → ara → finiş → gün sonu). Veritabanına dokunmaz.
- Parkur sahnesi (src/lib/courseScene.js, canlı ekrana bağlandı): rota kartının parkuru denizde eğik; komite/pin botu arasında START, sarı şamandıralar, finiş botu; seçilen rota (1 · 2 · 3 · F) ayak ayak sarı okla çizilir, sonra oklar akar; kapıda iki seçenek. Örnek: /mnt/project-files/samandira-donus/parkur-animasyon/ornek.html.

## Sıradaki işler

- Telefonda deneme yapılmadı.

## Asistan

- Parkur kartları (Seyhun onayladı 2026-11-02): günün parkur belgesinde `cards [{id, route}]`, `sel`, `cardAt` (lib/raceCourse.js cleanCards, selCard; raceLiveStore saveCards). Varsayılan Kart A (1 · 2 · 3 · Finiş) seçili. Yayın › Parkur › "Parkur kartları": kart seç, Yeni kart (seçilinin rotasıyla), Kartı sil, rota yaz + Kaydet. Başlat seçili kartı ve rotasını yarışa yazar (rounds[sid].card, route; önceden söylenmiş rota kalır).
- Canlı ekran parkuru animasyonlu sahne olarak gösterir (lib/courseScene.js): süren yarışın rotası, yoksa seçili kart. Kart değişince 20 sn çıkar.
- Örnek yarış düğmeleri: /canli sayfasında "Örnek yarışı izle", Yayın ⋯ menüsünde "Örnek yarışı aç".
- Dikey telefon videosu canlı ekranda kırpılmadan, iki yanı bulanık gösterilir (#955'te kaybolmuştu).
