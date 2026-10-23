## Nerede kaldım

- Kurye ana sayfası (`src/yemek/ui/CourierBoard.jsx`, veri `CourierView.jsx`): lacivertte ad, Müsait/Siparişte, Çıkış (ana hesapta "Değiştir") ve bugünün sayıları (Yolda, Sırada, Teslim); altta Kare kod okut, Yolda kartı (küçük harita, müşteri, adres, kalan dk, Ara · Yol tarifi · Teslim), Sırada (restoran fotoğrafı, durum, uzaklık, hazır olmasına kalan dk ya da Yeni), Bugün teslim (saatleriyle).
- Atama: en yakın müsait kurye; müsait yoksa en yakın kurye (`pickCourier`, couriers.js). Şimdilik tek kurye olduğundan her sipariş ona gider, meşgulse Sırada'ya düşer.

## Sıradaki işler

- Telefonda kurye hesabıyla dene.
