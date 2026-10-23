## Nerede kaldım

- Yemek sepetinde adres ekleme yeniden yapıldı (Seyhun onayladı, örnek /mnt/project-files/siparis/ornek-adres.png). `src/yemek/ui/AddressForm.jsx`:
  1. Harita (Leaflet + OpenStreetMap): iğne ortada sabit, harita kayar; "Konumum" telefonun yerine götürür. Durunca sokak ve mahalle Nominatim ters aramasıyla yazılır (1 sn bekleyip; ücretsiz, saniyede bir istek).
  2. Ev / İş / Kulüp / Diğer (Diğer'de ad), sokak ve bina no, kat, daire, zil, kuryeye not. Üstte küçük harita resmi ve "Değiştir".
- Adres listesinde her satırda ⋯: düzenleme (doğrudan 2. adım) ve "Adresi sil".
- Adres alanları: street, area, floor, flat, bell, note, pos; `text` = `addressText()` (siparişe, restoran ve kurye ekranına giden tek satır). Kurye ve restoran ekranı notu da gösterir. Eski adresler (yalnız text) düzenlenince sokak alanına text gelir.
- Yardımcılar `src/yemek/address.js`: parseReverse, addressText, tileOf; testleri `npm run test:yemek` "Haritadan adres".
- Bulut ortamında harita servislerine erişim yok; harita adımı telefonda denenmedi.

## Sıradaki işler

- Telefonda: harita tek parmakla kayıyor mu, pencere aşağı çekilince kapanmıyor mu, sokak adı geliyor mu.
- 4. adım: yapay zeka önerisi ve sesli asistandan sipariş.
