## Nerede kaldım
- Yayın paneli geniş ekranda (64rem ve üstü: MacBook, iPad yatay) iki parça: solda yönetim sütunu 32rem (aynı sekmeler, aynı düğmeler, alt çubuk solda), sağda `aside.masa-wide`: izleyicinin gördüğü canlı ekran (`/canli/<id>` çerçevesi, 16:9) + "Ayrı aç" + altında Ekranda · Sıradaki start · Durum kutuları. Alttan açılan pencereler sol sütunda açılır.
- Telefonda ve iPad dikte değişiklik yok; çerçeve yalnız geniş ekranda yüklenir (`useSyncExternalStore` + matchMedia).

## Sıradaki işler
- Mac/iPad'de denenmedi. Çerçeve /api/canli'yi ayrıca okur (okuma sayısı artar), ziyaret sayısına da bir ziyaret ekler.
