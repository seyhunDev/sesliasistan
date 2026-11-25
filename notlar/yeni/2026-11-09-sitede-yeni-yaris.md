## Nerede kaldım
- Siteden yarış listesi tek seferlik değil: zamanlayıcı (race-site, 10 dk'da bir) saatte bir siteyi tarar (raceSiteSync.scanNew), kayıtlı listeyi (raceSite/_list-…) yeniler; liste 3 saatten eskiyse açılırken de siteden okunur. Yeni sınıf görülünce ana hesaba "Sitede yeni yarış" bildirimi gider (Siteden ekranını açmış ya da yarış izleyen hesaplar).
- Yeni: tarama ilk gördüğü yarışları raceSite/_known.news'e { act, cls, leg, at } yazar; /api/race-site liste yanıtında `fresh: { act: ilk görülme }` (son 14 gün, siteDocs.freshActs). + Yarış penceresi (RaceAddSheet, Yarışlar çalışması) bununla "Yeni" gösterebilir.

## Sıradaki işler
- + Yarış penceresine "Yeni" işareti ve "Talimatla ekle" satırı (Yarışlar çalışmasına iletildi). Bildirim şimdilik /athletes/races/site'ı açıyor; pencere açan adres olursa url değişecek.
