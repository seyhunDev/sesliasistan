## Nerede kaldım

- Yönet pencereleri koyu (Seyhun 2026-11-25 "araçlar beyaz, ön açık gri, yazılar okunmuyor"): `Sheet` içine `SheetTone` bağlamı eklendi;
  `/bilgi/yonet` sayfası `<SheetTone.Provider value="sahne">` ile sarılı, içindeki bütün pencereler `navy sahne` sınıfıyla açılır
  (zemin #17171a, kutular #1f1f22, beyaz yazı, limon vurgu; `globals.css` sonu "SAHNE PENCERESİ"). Araç kutuları koyu, simgeler limon.
- Yönet › Hava artık Sahne ana sayfasının Hava kutusu görünümünde (`src/features/bilgi/YonetWx.jsx`, sporcu.css `.sh-wxp`, `.sh-days`):
  yarış günü yarışın yeri, değilse seçili konum; 7 günlük şerit, güne dokununca o günün eğrisi.
- Sporcu ana sayfası (SporcuHome): Yönet'te gün başlatılınca (bilgi/ekran.kanal.open) Tekne ekranı her gün görünür. Antrenman kartında düğme
  "Katıl" (yeşil nokta); antrenman planı olmayan günde en üstte ayrı "ŞİMDİ · TEKNE EKRANI · Katıl" kartı. Kanal kapanınca kaybolur.
- Telefonda denenmedi.

## Sıradaki işler

- Yönet'teki diğer pencerelerin (Parkur, Ekran, Mesajlar, Kayıtlar, Sonuçlar) koyu görünümünü telefonda kontrol et; açık renk kalan yer varsa düzelt.
