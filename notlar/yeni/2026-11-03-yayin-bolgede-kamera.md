## Nerede kaldım

- Yayın › Video › + (Canlı kaynak ekle) penceresine "Bölgede canlı yayınlar" eklendi (`src/features/broadcast/NearCams.jsx`). Pencere açılınca yarışın yeri (`racePlace`: harita noktası, Çevre'deki yarış alanı ya da ilçe) ile `/api/cams?geo=1` çağrılır: YouTube'da konumu eklenmiş canlı yayınlar (30 km, `GEO_KM`) + "<ilçe> canlı" araması. Otel, marina adı yazılıp "Ara" ile de aranır. Satırdaki "Ekle" yayını kamera kaynağı yapar, adı kanal adı olur.
- `/api/cams` `geo=1` iken Windy'ye sorulmaz (Windy canlı video değil, fotoğraf). Konum araması 30 dk bellekte. YouTube arama birimi: her arama 100 birim, günde 10.000.
- Telefonda ve gerçek YouTube verisiyle denenmedi.

## Sıradaki işler

- Konumlu YouTube araması yalnız yayıncı konum eklemişse bulur; Türk kıyısında az çıkabilir. Az çıkarsa yakındaki ilçe adlarıyla da otomatik aramak düşünülebilir.
- Yalnız kendi sitesinde yayın yapan otel/marina kameraları otomatik bulunamaz; izin alıp YouTube bağlantısı istemek gerekir.

## Asistan

- SkylineWebcams gibi kamera sitelerinin açık API'si yok, izinsiz gömülmez. Şifresiz açık kalmış güvenlik kameralarını listeleyen siteler hiç kullanılmaz.
