## Nerede kaldım
- Ana sayfa "C · Lacivert kokpit" (Seyhun: "futuristik, bütün özellikleri rahatlıkla tuşlayabileceği; rüzgâr grafiği benim için önemli"; telefonda denenmedi): üstte lacivert kokpit (`src/features/home/Cockpit.jsx`): tarih, zil, Ayarlar, hava satırı (sıcaklık, gökyüzü, en düşük/en yüksek, günün en sert sağanağı ve saati, sağda şimdiki rüzgâr–sağanak), büyük rüzgâr grafiği (`CockpitWind.jsx`: dolu alan rüzgâr, açık alan + kesik çizgi sağanak, 2 saatte bir yön oku, 3 saatte bir saat/gökyüzü/sıcaklık/kn, kırmızı şimdi noktası, ölçülen rüzgâr mavi gölge; açılışta 0,9 sn çizilir) ve sıradaki iş (`nextPlan` lib/homeTiles.js; antrenmansa "Süre"). Altında 8 adlı düğme (`HomeGrid.jsx`): Yoklama, Not, Plan, Fiş, Mesaj, Toplantı, Görev, Tümü (bütün sayfalar penceresi; eski alttaki küçük sayfa düğmeleri kalktı). Tekrar kaldırıldı: Notlar kartında "Not ekle", Sporcular kartında Yoklama/Mesaj (yalnız WhatsApp kaldı), Toplantı kartı, takvim listesinde kokpitteki plan.
- Asistan ekranı: zemin kokpitle aynı lacivert (#141938), halkanın ortasında boşta/çalışırken Velora logosu nefes alır (TabBar ProgressRing, `.aring-logo`).
- Ortak bileşenler (`src/components/ui`): `Gauge` (yarım daire yay) + `Segments`, `RowList`/`Row`/`ListHead` (liste satırı), `ActionGrid` (adlı düğme ızgarası). Hava sayfasındaki WindChart değişmedi.
- Örnekler: /mnt/project-files/ana-sayfa/futuristik/. Testler: elle.mjs "Ana sayfa kokpiti"; asistan ekran testi 95/95.

## Sıradaki işler
0. Telefonda: lacivert üst, grafik, düğmeler, asistan açılışı; iPhone durum çubuğu lacivert üstte okunuyor mu.
1. Kokpit altındaki kartları (Notlar, Sporcular, Fitness, Kulüp) ortak Row/Gauge ile "Durum" ve "Kulüp" listelerine çevirmek (örnek c2-kokpit-ruzgar.png), sonra diğer sayfalara uygulamak.

## Tasarım
- Ana sayfa ve yeni ortak tasarım dili: lacivert kokpit üst + açık zemin; düğmeler adıyla (ActionGrid), listeler Row, oranlar Gauge/Segments. Yeni sayfalar bu bileşenleri kullanır.
