## Nerede kaldım
- Yan çevirme (Seyhun: "döndürünce yatarı bulmasın"; telefonda denenmedi): sayfalar yatay için ayrı ayrı tasarlanmadı, uygulama dik kalır. `src/app/manifest.js` içine `orientation: "portrait"` eklendi (Android uyar). iPhone ana ekran uygulaması bunu yok sayar ve sayfanın yönü kilitlenemez; orada yan çevirince dik düzen ortada aynen kalsın diye `globals.css` html'e `-webkit-text-size-adjust: 100%` eklendi (iOS yatayda yazıları büyütmesin). Sayfa sütunları zaten en çok 30–34rem genişlikte ortalanıyor.

## Sıradaki işler
0. iPhone'da birkaç sayfayı yan çevirip yazıların büyümediğine, düzenin ortada dik kaldığına bak. Tamamen dönmesin istenirse tek yol Denetim Merkezi'ndeki dikey kilit.

## Tasarım
- Uygulama yalnız dik kullanılır; yatay için sayfa sayfa düzen yapılmaz (2026-10-17). Yatayda dik düzen ortada kalır, uyarı yazısı gösterilmez.
