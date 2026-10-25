## Nerede kaldım

- Sporcu hesabının sayfaları yeni tasarımda (Seyhun onayı 2026-10-25, örnek /mnt/project-files/sporcu-sayfalari/ornek.png):
  - Fitness (`AthleteFitness`): ana hesabın Sporcular sekmesi gibi baştan sona koyu, üstte salon fotoğrafı; bugünkü antrenman büyük, bu hafta çubuğu + Pzt–Paz kutuları, "Antrenmana başla"; bugünkü hareketler, Sıradaki, kapalı "Gelişim ve geçmiş".
  - Yoklamam (`/my-attendance`): lacivert; bu ayın devam yayı (izinli sayılmaz, ana sayfa kartıyla aynı `monthOf`) ve geldi / gelmedi / izinli; altında ay ay günler.
  - Ana sayfa: Fitness ve Yoklamam kartları ortak liste satırı (`Row`), başlıkta "Tümü ›"; Fitness üstte.
- Koyu fitness parçaları ortak: `src/features/fitness/FitDark.jsx` (`FitPhoto`, `WeekBoxes`), FitnessHome da bunları kullanır.
- Telefonda denenmedi.

## Sıradaki işler

- Fitness › Benim ve Beslenme sekmeleri hâlâ eski tasarım.

## Tasarım

- Sporcunun Fitness sayfası ana hesabın Sporcular sekmesiyle aynı koyu görünümdedir; koyu fitness parçaları `FitDark.jsx`'ten alınır.
