## Nerede kaldım

- Tehir canlı ekrana gitmiyordu (Seyhun 2026-11-04 06:50): Yayın gece açık kalınca plan dünde kalıyordu; tehir dünün gününe yazılıyor, `/api/canli` `rollPlan` onu yeni günde siliyordu. Artık `changePlan` önce planı bugüne geçirir, `planDay` dünü göstermez, gün değişince plan kendiliğinden bugüne geçip kaydedilir (`BroadcastPage.jsx`).
- Ortak `Button` (Seyhun "her butonda yuvarlak loading, veri gitti mi görmek için, tıklama hissiyatı"): onClick Promise döndürürse veri gidene kadar düğmede dönen halka (`.btn-spin`, globals.css), her dokunuşta `haptic("light")`. Yayın'da `changePlan` / `postpone` Promise döndürür; bayrak onayı veri gidince kapanır ve "çekildi" der.

## Sıradaki işler

- Telefonda denenmedi. Süre sekmesi "sıradaki büyük kart" kodlanıyor; Parkur sekmesi örneği onay bekliyor.
