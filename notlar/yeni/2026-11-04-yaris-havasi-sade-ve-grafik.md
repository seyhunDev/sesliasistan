## Nerede kaldım

- Seyhun 2026-11-04 (örnek hava-tasarim/yaris-hava-ornek.png onaylandı): yarış detay sayfasındaki havada kaydırmayla gün değişmesi kalktı (tablo yalnız yana kayar). "Bugün / gün seç" düğmesi, gün listesi (Sheet), yenile düğmesi ve yer/istasyon yazısı kalktı; yerine tek satır `DayNav`: ‹ Dün · Bugün · Sal 3 Kas · Yarın › (RaceWx.jsx; pinned yani Saha'da satır çizilmez, gün dışarıdan seçilir). `swipeStep` silindi.
- Ortak `HourTable` her sütunun üstünde rüzgâr grafiği (dolu alan rüzgâr, kesik sağanak, şimdi kırmızı çizgi; tabloyla birlikte kayar, `--ht-wind`/`--ht-gust`). Ana sayfa, hava sayfası, yarış havası ve canlı yayın aynı tabloyu kullandığı için hepsinde aynı.
- Gün gezintisi sayfaya göre kalıyor: ana sayfada gün şeridi (HomeDays), hava sayfasında 5 günlük şerit (DayStrip), yarışta DayNav.

## Sıradaki işler

- Seyhun "üç sayfa aynı tasarım" dedi: istenirse hava sayfası ve ana sayfa da DayNav satırına çevrilir (şu an kendi şeritleri duruyor).
- Telefonda denenmedi; ana sayfa "alçak grafik" ekran testi (150–270 px) grafik eklenince yeniden bakılmalı.
