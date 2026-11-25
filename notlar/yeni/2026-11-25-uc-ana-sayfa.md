## Nerede kaldım

- 2026-11-25 Velora sadeleştirme, adım 1b (Seyhun "3 farklı ana sayfa tasarımı ve uygulama yönetimimiz olmalı", onay 07:37):
  - Kim neyi görür tek dosyada: `src/lib/hesapGorunum.js` (`viewOf` → "ana" | "normal" | "sporcu", `TABS` alt çubuk ve sol menünün sekmeleri, `homeActions` Tümü/sol menü sayfaları; `homeTiles` yeniden dışa verir).
  - Hangi görünümdeyiz: `src/features/auth/useHesap.js` (`useHesap`, `setGibiGor`). Ana sayfa, alt çubuk (TabBar), sol menü (SideNav), Tümü (`features/home/usePages.js`) ve Ayarlar bunu kullanır.
  - Üç ana sayfa: `OwnerHome` (ana hesap; ortak çerçeve `HomeFrame` de burada), `NormalHome`, `SporcuHome`; `app/(app)/page.jsx` görünüme göre seçer. Hava ve Takvim ortak (IpadHome; Yoklama/Yönet düğmesi `can` ile).
  - Normal kullanıcıda ana sayfadaki İngilizce satırı ve Velora Sailing kutusu kalktı (alt çubukta var). Kalan asistan/fiş satırı yalnız sporcu tarafında (eskisi gibi).
  - Ayarlar › Görünüm: "Normal kullanıcı gibi gör", "Sporcu gibi gör" (yalnız ana hesap, bu cihazda). O hesabın ana sayfası, alt çubuğu, menüsü ve Ayarlar'ı görünür; veri ve sayfaların içi ana hesabın. Altta "… gibi görüyorsun · Geri dön" şeridi (`GibiGorBar`).
  - Sporcunun alt çubuğu (Mesajlar, Görevler) aynı kaldı.

## Sıradaki işler

- Seyhun telefonda üç görünüme baksın; sonra her ana sayfanın tasarımı ayrı ayrı.
- Adım 2: alt çubuk, sol menü, + Ekle, zil, Ayarlar.

## Tasarım

- Ana sayfa üç ayrı dosya, kim neyi görür tek dosya (`lib/hesapGorunum.js`). Yeni bir sayfa ya da kutu hangi hesapta görünecekse orada ve o hesabın ana sayfa dosyasında eklenir; dağınık `role === "owner"` koşulu eklenmez.
