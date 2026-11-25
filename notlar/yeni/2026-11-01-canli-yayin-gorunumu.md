# Herkese açık canlı ekran: yayın görünümü (2026-11-01)

## Nerede kaldım
- `/canli/<yarış>` sayfası yat yarışı yayını görünümüne çevrildi (Seyhun'un isteği: tam ekran PC, yukarıdan deniz zemini, parkur ortada, süre güzel yerde; sonra "renk cümbüşü olmasın, parkur arkada gömük, sonuçlar önde").
- Koyu lacivert deniz zemini (dalga dokusu), yarı saydam cam kartlar, beyaz yazı, tek vurgu pembe (logo rengi); grup renkleri yalnız noktada.
- Geniş ekran: solda sayaç + start dizisi, rüzgâr (ok), ekrandaki yayın/tekrar; ortada gerçek parkur kartı (`lib/courseCard.js`, günün ölçümlerinden, Parkur sekmesiyle aynı çizim; yeni parkur girilince yenisi) arkada soluk tek renk, üstünde parkur sırası, altında "Şu an 2. şamandıra · Son geçen 305 Ece Kara"; sağda sıralama ve genel sıralama.
- Tablet: iki sütun, parkur kartı solda normal kart. Telefon: tek sütun, parkur kartı en altta.
- Örnekler: project-files/samandira-donus/yayin/pc.png, tablet.png, telefon.png. Telefonda denenmedi.

## Sıradaki işler
- Genel sıralamada "Kulübüm" süzgeci yapılmadı.
- Kamerayla şamandıra okuma (Apple Vision, Xcode) Seyhun isterse.

## Tasarım
- Herkese açık canlı ekran: yayın görünümü (koyu deniz, cam kartlar, tek vurgu); uygulamanın temasından bağımsız. Parkur bilgi kaynağı yalnız parkur kartı; sıralama başlığında parkur sırası tekrarlanmaz.
