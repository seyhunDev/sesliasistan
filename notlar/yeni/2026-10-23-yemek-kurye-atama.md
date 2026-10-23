## Nerede kaldım

- Kurye durumu: açık siparişi (atanan ya da yolda) olan kurye "Siparişte", yoksa "Müsait" (`src/yemek/couriers.js`). Restoran ekranı › Kuryeye ver: müsaitler önce, restorana yakınlığa göre, mesafe sağda; siparişteki kurye seçilemez.
- Yönetim › Kuryeler: haritada kuryeler (müsait camgöbeği, siparişte lacivert, restoranlar gri nokta), listede Müsait / Siparişte (hangi restoran, #no). Deneme modunda "Deneme kuryeleri ekle / kaldır": Dikili'de 6 kurye (Murat, Emre, Ayşe, Can, Zeynep, Ali; Can ve Zeynep siparişte).
- Otomatik atama: sipariş verilince restorana en yakın müsait kurye siparişe yazılır (store.orderNow → nearestFree). Kurye ekranında "Restorana git" satırı çıkar; kurye kare kodu okutunca ya da restoran "Kuryeye ver" deyince yola çıkar. Deneme siparişinde yolda görünen kurye atanan kurye.
- Kurye ekranı açıkken telefonun yeri kuryenin kaydına yazılır (dakikada bir, 100 m değişince); deneme kuryelerinin yeri sabit.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: Yönetim › Kuryeler › Deneme kuryeleri ekle, sonra sipariş ver; restoran ekranında "Kurye …" yazmalı.
