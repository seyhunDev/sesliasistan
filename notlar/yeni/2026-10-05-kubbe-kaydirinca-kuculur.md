## Nerede kaldım

- Asistan kubbesi kaydırınca küçülüyor (Seyhun: "asistan kullanılmadığında çok mu büyük duruyor?"; telefonda denenmedi): boştaki kubbe ~160 px yer kaplıyordu (iPhone mini'de ekranın %20'si). Artık sekmeli sayfalarda sayfa aşağı kaydırılınca kubbe ince çubuğa iner (küre 78 → 48 px, sekmeler gizlenir, ~76 px); yukarı kaydırınca, sayfanın başına dönünce ya da kubbenin boş yerine dokununca eski hâline döner. Küçükken de küre (konuş), klavye (yaz) ve + (Oluştur) çalışır. Sayfanın alt boşluğu (`--stage-h`) büyük boyda kalır, içerik zıplamaz; sayfanın alt düğme çubuğu (yarış evrakı) kubbenin gerçek yüksekliğini (`--dome-h`) izler. Asistan çalışırken, yazarken ve kayıt ekranında küçülmez (`mini`, `small`, Dome, TabBar.jsx).

## Sıradaki işler

- Kubbeyi telefonda dene: ana sayfada aşağı kaydır, kubbe küçülmeli; yukarı kaydır ya da kubbeye dokun, sekmeler geri gelmeli. Küçükken küreye dokununca dinleme başlamalı. Çok erken ya da geç küçülüyorsa yeni threade yaz (eşikler 24/16 px).

## Tasarım

- Boştaki kubbe aşağı kaydırınca ince çubuğa iner, yukarı kaydırınca büyür (Seyhun'un seçimi, 2026-10-05).
