## Nerede kaldım
- Hareketlerim listesinde her hareketin ilk fotoğrafı küçük resim olarak görünüyor; altında "2 fotoğraf · 1 video" ya da "Fotoğraf yok". Süzgeç: Hepsi · Fotoğraflı · Fotoğrafsız.
- Küçük önizleme (240 px) yalnız telefonda (IndexedDB `fitt:<id>`): yüklerken yapılır; eski fotoğraf için bir kez indirilip yapılır (Storage CORS izin vermezse fotoğrafın kendisi gösterilir). Dosya silinince (dropMedia, Fitness'ı sıfırla) önizleme de silinir.
- Hareket sayfasında "Adı değiştir" (numara, fotoğraf aynı; eski ve yeni ad aynı harekete gider, programlara ve sporcu antrenmanlarına da yazılır; aynı ad başka harekette varsa birleştir denir), "Birleştir", "Hareketi sil" (programda geçiyorsa silinmez; fotoğraf dosyaları silinmez, Hareketsiz kalan dosyalar'da durur).

## Sıradaki işler
- Telefonda deneme.
