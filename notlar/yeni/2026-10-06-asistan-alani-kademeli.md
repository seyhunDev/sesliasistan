## Nerede kaldım
- Asistan alanı kademeli büyür (Seyhun: "kubbe hemen açıldı, mesajlarla kademeli açılmalı, yarıdan sonra kaydırma başlamalı; küre ile iş yazısı bitişik"; telefonda denenmedi): konuşma alanı sabit yükseklik yerine yine içerik kadar (`max-h`, görünen ekranın %45'i), mesajlar geldikçe kubbe yumuşak geçişle yükselir, sınıra varınca sabitlenir ve içinde kayar. Küre satırı ve durum şeridi altta kaldığı için büyüme küreyi oynatmaz. Durum şeridi h-8 → h-11, kapsül üstte: kapsül ile küre arasında ~1 rem boşluk (TabBar.jsx `Dome`).

## Sıradaki işler
0. Asistanı aç: alan küçük açılmalı, cevaplar geldikçe büyümeli, ekranın yarısına yaklaşınca kaymaya başlamalı; "… hazırlanıyor" kapsülü ile küre arasında boşluk olmalı.

## Tasarım
- Asistan açıkken konuşma alanı içerikle kademeli büyür, en çok %45; küre ve düğmeler altta sabit, iş yazısı kürenin üstünde ayrı şeritte, arada boşluk (2026-10-06).
