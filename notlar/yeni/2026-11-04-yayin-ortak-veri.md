## Nerede kaldım

- Yarış sistemi bölüşümü (/mnt/project-files/sistem-haritasi/yaris-sistemi-haritasi.md): bu sohbet D (Yayın, /canli, Multimedya) ve C (sonuçlar ve sıralama) sahibi.
- Yayın planı artık yalnız değişen alanlarıyla yazılır (`savePlanKeys`, raceLiveStore.js; `plan.<alan>` bütünüyle). Sunucunun siteden yazdığı daily/times/off/agenda, Yayın'da başka bir şey değişince ezilmez.
- Sonuç yükleme (`importResults`) yarışın sonuçlarını kayıttan taze okur ve onun üstüne ekler. Üç ekrandan (yarış sayfası, Multimedya › Sonuç, Yayın › Belgeler) yüklenen PDF'ler birbirini silmez.

## Sıradaki işler

- DocsTab ve SiteDocs aynı "new" belgeyi işleyebiliyor; B (Siteden sohbeti) tek ortak işleyici yazınca DocsTab onu çağıracak.
- Parkur kartı iki yerde (raceLive.cards + course/{gün}.cards); /canli okuma sayısı sınıra yakın.
