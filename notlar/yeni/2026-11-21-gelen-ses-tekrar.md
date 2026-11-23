## Nerede kaldım

- Bilgi Yönet'te sporcudan gelen ses, uygulama güncellenip yeniden açılınca bir kez daha çalınıyordu. Sebep: çalınan seslerin listesi yalnız bellekteydi; açılışta 30 sn'den yeni görünen ses yeniden çalınıyordu (sporcu telefonunun saati ileriyse daha eski ses de "yeni" görünüyordu).
- Düzeltme: `BilgiAdmin.jsx` `useGelenPlay` görülen ses kimliklerini cihazda saklar (localStorage `bilgiGelenDuyuldu`, son 200); açılışta saklanan kimlikler çalınmaz, 30 sn kuralı saat farkına karşı iki yönlü (`Math.abs`).

## Sıradaki işler

- Telefonda dene: sporcudan ses gelsin, Yönet'i kapat/aç; aynı ses tekrar çalmamalı.
