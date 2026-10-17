## Nerede kaldım
- Ana sayfa gruplu tasarım (Seyhun: "2'ye yakınım, Bugün yazısına gerek yok, bugün kısmı 3'teki gibi, Kulüp şimdiki hâliyle kalsın"; örnek ana-sayfa/yeniden/4-birlesik.png onaylandı; telefonda denenmedi): iPhone ayarlar düzeni (`main.calm.grouped`, globals.css: açık gri zemin, çerçevesiz beyaz kartlar, `--red`). Üstte "Cmt 17 Ekim", hava satırı + rüzgâr grafiği tek kartta; gün şeridi kendi kartında, bugün kırmızı daire; bugünün planları saat çizgisinde (süren plan kırmızı nokta, "yer · 12:00'ye kadar · şimdi", `untilText` homeTiles.js); "YARIN" ve "SIRADA" grupları (türün renginde saat karesi); "Seni bekleyenler" satırı (kırmızı sayı). Bölüm başlıkları küçük büyük harf (SectionHead). Kulüp kartı içte `.calm` ile eski görünümde. Dosyalar: OwnerHome, SiradaCard, HomeSummary (WeekStrip), HomeHero, PeopleStrip, BirthdayStrip, ui.jsx (GROUP). Test: elle.mjs "Bitiş saati".

## Sıradaki işler
0. Telefonda ana sayfa: gün şeridi kaydırma, saat çizgisi, koyu görünüm, Kulüp kartı.

## Tasarım
- Ana sayfa gruplu düzen (2026-10-17): zemin #f2f2f7, kartlar `GROUP` (ui.jsx), bölüm başlığı küçük büyük harf gri; bugün kırmızı. Kulüp kartı sakin (.calm) kalır.
