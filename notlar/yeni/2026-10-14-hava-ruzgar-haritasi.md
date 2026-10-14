## Nerede kaldım

- Rüzgâr haritası hava durumu penceresinde (Seyhun: "ayrı açılmasın, orada olsun; ayrıca açmak için sağ üstte çapraz ok olsun"; telefonda denenmedi): ana sayfada havaya dokununca açılan pencerede gün seçicinin altında küçük rüzgâr haritası (renk, akan çizgiler, oynat). Seçilen gün değişince harita o güne geçer (bugünse şimdiki saat, değilse öğlen; harita 3 günü kapsar). Sağ üstteki ↗ tam sayfa `/wind`'i açar; alttaki "Rüzgâr haritası" düğmesi kalktı. Veri aynı önbellekten (`sa-wind-map`, 30 dk), ikinci istek yok (`WindMapView embed date`, WindMap.jsx; DaySheet.jsx `WeatherDetail`). Haritayı parmakla kaydırmak pencereyi kapatmaz.

## Sıradaki işler

- Telefonda havaya dokun: harita görünüyor mu, gün değiştirince harita da değişiyor mu, haritada kaydırınca pencere kapanmıyor mu, ↗ tam sayfayı açıyor mu.
