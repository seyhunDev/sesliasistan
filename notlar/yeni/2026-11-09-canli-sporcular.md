## Nerede kaldım

- /canli kendi ekranı: Sıralama ve Gruplar düğmeleri tek "Sporcular" düğmesi oldu (Seyhun 2026-11-09 örnek onaylandı, "Yap").
  Panel: sınıf sekmeleri, arama, Hepsi / Bizimkiler / günün grupları süzgeci; satırda genel sıra, yelken no, ad + kulüp, bugünkü grup, puan.
  Sıralama yoksa kayıt listesi (sıra ve puan sütunu olmadan). Satıra dokununca sporcu: genel sıra, puan, bugünkü grup, grubunun sıradaki/süren yarışı, dereceler gün gün (yarış no → gün `starts`'tan).
- Dikey ekranda çubuğun üstünde "Bizimkiler" kartı (Dikili kulüplü sporcuların genel sırası, grubu, puanı); dokununca Sporcular açılır.
- iPad / geniş yatay ekranda Sporcular sağda yanda açılır, ilk açılışta kendiliğinden açık, boşluğa dokununca kapanmaz.
- Kod: LiveScreen.jsx `scAth`, `athDays`, `ScAthPanel`, `ScOurs`, `athDock`; CSS sahne.css sonu. Eski `ScGrpPanel` / `scGroups` kaldırıldı.

## Sıradaki işler

- Bizimkiler kartında sıra değişimi (↑2) yok; resmi sonuçta önceki sıra bilinmiyor. İstenirse eklenebilir.
- Telefonda denenmedi.

## Tasarım

- Canlı sayfada sporcu bilgisi tek yerde: "Sporcular" (sıralama + grup). iPad'de liste videonun yanında hep açık.
