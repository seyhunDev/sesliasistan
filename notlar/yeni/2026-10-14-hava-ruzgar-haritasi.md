## Nerede kaldım

- Rüzgâr haritası hava durumu penceresinde (Seyhun: "ayrı açılmasın, orada olsun; ayrıca açmak için sağ üstte çapraz ok olsun"; telefonda denenmedi): ana sayfada havaya dokununca açılan pencerede gün seçicinin altında küçük rüzgâr haritası (renk, akan çizgiler, oynat). Seçilen gün değişince harita o güne geçer (bugünse şimdiki saat, değilse öğlen; harita 3 günü kapsar). Sağ üstteki ↗ tam sayfa `/wind`'i açar; alttaki "Rüzgâr haritası" düğmesi kalktı. Veri aynı önbellekten (`sa-wind-map`, 30 dk), ikinci istek yok (`WindMapView embed date`, WindMap.jsx; DaySheet.jsx `WeatherDetail`). Haritayı parmakla kaydırmak pencereyi kapatmaz.

## Sıradaki işler

- Telefonda havaya dokun: harita görünüyor mu, gün değiştirince harita da değişiyor mu, haritada kaydırınca pencere kapanmıyor mu, ↗ tam sayfayı açıyor mu.
- Hava penceresinin altındaki kaynak kutusu tek satır (Seyhun: "bilgilendirme info ikonuyla, karşılaştır düğmeleri başta gizli"): yer · ne zaman alındı, sağda "Karşılaştır" (açınca MGM / Windy), "i" (açınca kaynak ve model noktası) ve Yenile (DaySheet.jsx `cmp`, `about`). Örnek: `/mnt/project-files/hava/kaynak-satiri.png`.

## Nerede kaldım

- Hava penceresinin gün detayındaki "En sert / Yelkene uygun" kutusu kaldırıldı (Seyhun: "o bilgi alanını kaldıralım"; telefonda denenmedi). Neden yanlış görünüyordu: "En sert" günün 24 saatinin (gece ve geçmiş saatler dahil) en yükseğiydi ve tek nokta tahmininden geliyordu; harita ise ızgaradaki noktalardan, seçili saate göre. Yarış sayfasındaki "Yelkene uygun" (Çevre › yarış havası) yalnız gündüz saatlerine bakıyor, ona dokunulmadı.
