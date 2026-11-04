## Nerede kaldım

- Yayın sayfasında "Video" sekmesi artık "Ekran". En üstte önizleme. Altında "Sahneler": 6 sahne (01 Yarış öncesi … 06 Sıradaki), ekrandaki kırmızı çerçeveli ve "EKRANDA" etiketli.
- Sahneye dokununca sahnenin videosu seçilir: Ekrandaki (değiştirme), Bulanık foto, Grubun kamerası, canlı kaynaklar (Drone 1…), Tekneler; 04'te kayıtlar. Seçim hemen kaydedilir (`courseShow.vid`). "Şimdi ekrana al" o sahneyi elle açar (`courseShow.scene`), "Otomatiğe dön" kapatır.
- "Otomatik geçiş" anahtarı: açıkken sahne süreye göre değişir; kapatınca o anki sahne ekranda kalır.
- Canlı ekran ve Yayın aynı kuralla sahne seçer: `sceneOf` ve `sceneScreen` (lib/raceRounds.js). Sahnenin videosu varsa ekranda o oynar.
- Sahnenin videosu varken alttaki "Ekrana al" ve "Kaldır" o sahnenin videosunu da değiştirir.
- Eski "Ekranda göster" bölümü kalktı (Parkur, yarış öncesi akış, genel sıralama anahtarı). Bunların yerini sahneler aldı: Parkur = 05, akış = 01'in sekmeleri.
- Yayın sayfası ekranda denenmedi (giriş gerekiyor). Canlı ekranda sahne videosu örnekle denendi.

## Sıradaki işler

- Yayın'daki "EKRANDA" etiketi evreyi kabaca hesaplar. Canlı ekranla ayrışırsa canlı ekranın evresi yazılabilir.

## Tasarım

- Yayın › Ekran: 3 sütun sahne kutusu (numara, ad, videonun adı). Ekrandaki kırmızı çerçeve. Sahnenin videosu alt pencereden seçilir.
