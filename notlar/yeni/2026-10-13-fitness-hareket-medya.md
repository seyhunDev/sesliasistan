## Nerede kaldım

- Fitness hareketine fotoğraf ve kısa video (Seyhun: "hareketlere fotoğraf, kısa video ekleyebilmeliyim; yapay zekanın çıkardığı antrenmanda yanında fotoğraf ekle, video ekle olsun"; telefonda denenmedi): program düzenlemede harekete dokununca "Fotoğraf ekle" / "Video ekle" (galeri ya da kamera, en çok 3). Küçük karelere dokununca tam ekran açılır, × ile çıkarılır. Program kaydedilince fotoğraf ve video sporcunun planlarına da gider; sporcu adım adım antrenman ekranında hareketin altında, "Tüm hareketleri gör" listesinde de görür. Fotoğraf 1280 px'e küçültülür; video en çok 60 sn, 6 MB'tan büyükse telefonda 640 px'e küçültülüp yeniden kaydedilir (video süresi kadar sürer, sessiz), küçültülemezse en çok 20 MB. Dosyalar Firestore'da parça parça `orgs/{org}/fitMedia/{id}/parts` (Storage yok), harekette künye `media [{id, kind photo|video, type, size, parts}]`; bir kez okunur, sonra cihazda kalır (`fitMedia.js`, `ExerciseMedia.jsx`, `cleanMedia` model.js). Kayıtlı programdan çıkarılan dosya silinmez (eski planlar kullanıyor olabilir). KURAL DEĞİŞİKLİĞİ VAR: `fitMedia` çalışan/sporcuya okumaya açık. Testi `test:elle` › "Fitness: sporcu programı" › "hareket fotoğraf/video".

## Sıradaki işler

- Firestore kurallarını yayınla, sonra bir sporcunun programında bir harekete video ekle, kaydet; sporcunun telefonunda antrenmanı aç, video oynuyor mu bak.
- İstenirse: aynı hareketin videosu bir kez eklenince her programda kendiliğinden görünsün (hareket kütüphanesi).
