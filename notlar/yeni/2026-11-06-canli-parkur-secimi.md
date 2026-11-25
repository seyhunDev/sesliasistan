## Nerede kaldım
- Canlı › Parkur ve rüzgâr: üstteki Eksen/Fark/Pin kutularının yanında "Parkur" kutusu (o anki/sıradaki sınıfın parkuru: ILCA / Trapez). Dokununca alan açılır: parkur şekilleri (küçük çizim), Rota (örn. "1 2 1 2 3 Finiş"), "Sınıflara göre" (sınıf çipleri; sınıfa dokunup şekil/rota seçince o sınıfa kalıcı, "… herkesle aynı olsun" geri alır). Şekil seçince alan kapanır. Kayıt `raceLive.cards` (saveCards, LiveStart `cards` isteği), yarış boyu kalır, Başlat o kartı yarışa yazar. Kod: `LiveScreen.jsx` `ScCrsPick`, `ScWindNow pk`, stil `sahne.css` `.sc-pk*`, `.fx .pk`.
- Tahmin grafiği ortak rüzgâr şeridiyle (`WindRibbon`): Şimdi = bugün (geçen saatler istasyonun ölçtüğü), Yarın = ertesi gün; gece bugünden 4 saatten az kaldıysa eski grafik. `/api/canli` `forecast.next` artık sıcaklık ve yağmur da taşır.
- Örnek sayfaya ILCA 6 startı eklendi (demo).

## Sıradaki işler
- Telefonda ve iPad'de denenmedi.
