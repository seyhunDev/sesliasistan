## Nerede kaldım

- Tablet ve bilgisayar uyumu (Seyhun 2026-10-18, seçim "Sol menü"): telefonda hiçbir şey değişmedi. Dik tablette (≥48rem) sayfalar, alt çubuk, alttan açılan pencereler 40rem'e genişler. Bilgisayar ve yatay tablette (≥64rem, `SideNav.jsx` WIDE) alt sekme çubuğu yerine solda sabit menü: 4 sekme, ana sayfadaki sayfa listesi (homeActions, aynı izinler), Ayarlar, altta asistan küresi + "Yazarak sor". Sayfa 44rem, sabit alt düğmeler, pencereler (dört köşesi yuvarlak, ortada), tam ekranlar ve sohbet menünün sağında ortalanır; tam ekran asistan her yeri kaplar. Kurallar `globals.css` sonunda "Geniş ekran". Telefonda denenmedi.

## Sıradaki işler

- İstenirse sayfaların içini geniş ekranda iki sütuna bölmek (sayfa sayfa, sahibi olan sohbetlerde).

## Tasarım

- Geniş ekran: sayfa içleri değişmez; yalnız ortak düzen genişler, bilgisayarda sol menü.
