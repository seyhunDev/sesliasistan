## Nerede kaldım
- Hata (Seyhun 2026-10-17): bir sporcunun programı kaydedilince bellekteki listede BAŞKA sporcuların programları da "etkin değil" işaretleniyordu (fitnessData.js saveProgram, önbellek güncellemesi). Sunucuda doğruydu ama sayfa 3 dakika ve telefondaki kopyada yanlış gösteriyordu: kopya programı olan sporcuda "Program hazırla" çıkıyor, Programı düzenle / Değerlendirme ve ⋯ menüsündeki program işleri görünmüyordu. Artık yalnız aynı kişinin önceki programı etkinlikten çıkar.
- Ek güvenlik: athleteRows (model.js) etkin program yoksa sporcunun en son programını kullanır. Test elle.mjs "kopya program". Telefonda denenmedi.

## Sıradaki işler
0. Telefonda dene: Fitness › Sporcular › kopya programı olan sporcu: Programı düzenle, Değerlendirme ve ⋯ menüsü (Liste olarak al, Planlara ekle, Devam ettir…) görünmeli.
