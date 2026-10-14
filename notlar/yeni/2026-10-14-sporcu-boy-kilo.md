## Nerede kaldım

- Sporcunun boy ve kilosu (Seyhun: "sporcunun boy ve kilosunu da takip edeceğiz, sporcu detay sayfasından"; telefonda denenmedi): sporcu sayfasında Kimlik kartının altında "Boy / Kilo" kartı: son boy ve kilo, + ile yeni ölçüm (tarih bugün, boy son değerle dolu gelir), geçmiş ölçümler (son 4, "Tümü"), × ile silinir. Aynı güne yazılan ölçüm o günün kaydıyla birleşir. Kayıt kulüp projesinde (dikili-c7cc8) sporcu belgesinde `body [{ d, h, kg }]`, en çok 60 ölçüm (`src/lib/athleteBody.js`, `saveBody` data.js). Fitness › Program hazırla'da sporcu seçilince boy ve kilo buradan gelir. Asistan (yalnız ana hesap, sporcu yetkisi): "Mete'nin kilosu 52", "Ali Kaya'nın boyu 1.52", "Zeynep'in boyu 148 kilosu 40,5", "Emre 45 kilo" hemen yazar; "Ali'nin kilosu kaç" son değeri söyler (`isler/boykilo.js`, route `athleteBody`). Sporcunun kendi ekranlarına dokunulmadı. Kural değişikliği yok (bizim projede). Testleri `test:elle` › "Sporcu boy ve kilo", `test:asistan` › "Yönlendirme: Sporcu boy ve kilo".

## Sıradaki işler

- Telefonda bir sporcunun sayfasında + ile ölçüm ekle, sil; asistana "Mete'nin kilosu 52" de. "Kulüp hesabının yazma izni yok" çıkarsa kulüp projesinin kurallarında `athletes` güncellemesine `body` alanı eklenmeli.
- İstenirse: boy/kilo grafiği, sporcular listesinde son ölçümün tarihi (ör. 3 aydır ölçülmedi).
