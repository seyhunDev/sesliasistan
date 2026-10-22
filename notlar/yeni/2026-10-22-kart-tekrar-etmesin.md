## Nerede kaldım

- Kayıt kartı gösterildiğinde yapay zekanın aynı bilgiyi anlatan cümlesi ("Yarın saat 10'da antrenmanın var.") artık yazılmıyor ve okunmuyor; yalnız kartta olmayan bilgi (çakışma, rüzgâr, hava, uyarı) "Ekledim" cümlesinin önünde kalıyor (lib/steps.js extraNote, kaydedilen kayıtların başlığına bakar). Tasarım başlığının isteği; ekranda ayrıca gizleme yok.
- Telefonda denenmedi.

## Asistan

- Kart neyi gösteriyorsa söz onu tekrar etmez: extraNote(m, list) kaydın başlığını içeren ve yeni bilgi taşımayan cümleyi atar.
