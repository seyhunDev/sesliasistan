## Nerede kaldım

- Veli izin belgesinde (EK-3/D) telefon boş kalmıyor (Seyhun: "irtibat telefon numarası boş olmamalı, sporcu bilgilerinde yoksa girilmesini isteyelim"; telefonda denenmedi): sporcu bölümündeki İrtibat Telefonu sporcunun kendi telefonu yoksa veli telefonu olur (`athleteInfo`, raceDocs.js). Veli izni seçiliyken veli telefonu olmayan sporcu varsa "Belgeleri hazırla" belgeyi hazırlamaz, o sporcunun bilgi penceresini açar ("… veli telefonunu yaz"); yazılan telefon sporcu kartına kaydedilir, bir daha sorulmaz (`phoneMissing`, raceDocs.js; RaceEditor `make`). Kural değişikliği yok. Testi `test:yaris` › "Yarış evrakı" › "veli izni telefon".

## Sıradaki işler

- Telefonu olmayan bir sporcuyla yarışta "Belgeleri hazırla"ya bas: pencere açılmalı, telefonu yazınca veli izninde iki telefon kutusu da dolu olmalı.
