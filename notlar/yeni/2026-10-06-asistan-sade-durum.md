## Nerede kaldım
- Asistanda tek durum göstergesi (Seyhun: "kubbenin üst kenarında animasyon, kürenin etrafında dönen animasyon, iş yazısının başında loading; fazla değil mi"; telefonda denenmedi): durumu artık yalnız yazı kutusundaki küçük küre gösterir (rengi ve içindeki dalga). Kubbenin yayındaki akan ışık ve nefes alma, tepedeki parıltının kayması/atması kaldırıldı (yalnız renk değiştirir); kürenin çevresinde dönen halka kaldırıldı; iş yazısı ("Plan hazırlanıyor…") başında dönen halka ve üstünden akan ışık olmadan, sade yazı. Cevap gelene kadarki iskelet satırlar duruyor. Yalnız CSS ve TabBar.jsx (`work-ring` kaldırıldı); geri almak için globals.css'teki "SADE DURUM" bloğu silinir.

## Sıradaki işler
0. Asistana bir iş söyle: çalışırken yalnız küre kehribar olmalı, kubbenin kenarı ve kürenin çevresi hareketsiz, iş yazısı sade. Sade geldiyse ya da iskelet satırlar da fazla geliyorsa yeni threade yaz.

## Tasarım
- Asistanın durumu tek yerde: yazı kutusundaki küre (renk + dalga). Kubbe kenarı, küre çevresi ve iş yazısında ayrıca yükleniyor animasyonu yok (2026-10-06).
