## Nerede kaldım

- Sayfa geçişi (Seyhun 2026-11-04 "geçiş animasyonları daha güzel olsun"; örnek https://claude.ai/artifact/5KnDcQMFvZi4HzbtC8Hhkm "Yeni"): `src/app/(app)/template.jsx` React `ViewTransition` (key = yol). Tarayıcı eski sayfanın görüntüsünü tutar, yeni sayfa sağdan tam kayar, eski sayfa %28 sola çekilir; geri tersi; alt sekmeler arası ve geniş ekranda (≥64rem) 0,18–0,2 sn yumuşak geçiş. Tür `<html data-nav>` (`navProgress.js` setNavKind: navStart fwd/tab, popstate/router.back back; kenardan kaydırarak geride `SwipeBack` "none", animasyon yok). CSS globals.css SAYFA GEÇİŞİ; görünüm geçişi olmayan tarayıcıda eski page-in kayması kalır.
- Boş arka plan (açılış): anında açılışta (html[data-warm]) açılış ekranı hiç görünmüyordu, sayfa ise kod yüklenene kadar çizilemiyordu; arada yalnız boş zemin kalıyordu. Artık açılış ekranı 0,45 sn saydam bekler (globals.css bootwarm); kod geç gelirse logo belirir, gelince solarak çekilir (`BootSplash` WARM_SHOW).
- Mac'te masaüstleri arasında yana kayıp dönünce beyaz ekran (Seyhun aynı gün): gün içinde sık yayın olduğu için uygulama arkaya gidince 0,4 sn sonra yeni sürüme yenileniyordu; dönüşte sayfa baştan yükleniyordu. Artık arkada yenileme ancak 3 dk arkada kalınca (`newVersion.js` HIDE_RELOAD). Kısa gidiş-dönüşte sayfa olduğu gibi kalır.
- Sesli yanıt düğmesi "B · Dolu daire": `src/features/speech/SpeakerGlyph.jsx` (dolu hoparlör, açıkken iki dalga, kapalıyken dalgalar söner ve çizgi çizilir); asistan üst çubuğu `TabBar.jsx` ReadToggle (açık #3d7bff dolu daire beyaz simge, kapalı soluk daire) ve ekleme penceresi `SpeakToggle`.
- Telefonda ve Mac'te denenmedi.

## Sıradaki işler

- Mac'te beyaz ekran hâlâ görülürse: Safari sekmesi mi, Dock uygulaması mı, Xcode Mac uygulaması mı, ve kaç saniye arkada kalındığı öğrenilecek.
- Geçiş Safari 18 öncesinde (görünüm geçişi yok) eski hafif kaymayla çalışır.

## Tasarım

- Sayfa geçişi iPhone gibi itme (sağdan tam kayma, eski sayfa altta kalır); sekmeler ve geniş ekran yalnız yumuşak geçiş. Sesli yanıt düğmesi dolu daire (açık mavi, kapalı soluk + çizgi).
