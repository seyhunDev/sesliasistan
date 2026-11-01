# Yayın sayfası düzeltmeleri, canlı ekranda Bugün · Genel (2026-11-01)

## Nerede kaldım
- Video yükleme: 55 MB'a sığan video olduğu gibi gider, küçültme (video süresi kadar süren yeniden kodlama) yalnız sığmayana (`broadcastStore.uploadForScreen`, `RAW_MAX` dışa açıldı). "Küçültülüyor"da takılma sebebi buydu.
- Yayın sayfasında Başlat yarışı da açar (`Countdown` yeni `startRace` özelliği → `raceStart(all)`); 0'da start saati yazılır, herkese açık ekran "Start'tan beri" ileri sayar, durdurulana kadar. Start kaydı henüz yoksa da ekran sayaçtan ileri sayar (`LiveScreen` Clock).
- Rüzgâr aralığı animasyonu (`lib/courseCard.js`): bir uçta 5 sn durur, 2 sn'de yavaşça öbürüne döner (14 sn döngü; eskiden 6 sn git-gel).
- Herkese açık ekran: üstte Bugün · Genel. Bugün = günün yarışı (sayaç, sıralama, yayın, parkur); Genel = genel sıralama sade liste (sıra, yelken, ad, kulüp, toplam; yarış yarış puan kalktı). Başlıkta grup ve kaçıncı yarış ("Mavi grup · 3. yarış", grup noktası).
- Yayın sayfası: grup seçimi yalnız Başlat'tan önce (Sıradaki N. yarış satırında); Başlat'tan sonra "Mavi grup · 3. yarış" yazar, değiştirilemez. Biten yarışın grubu Yarışlar listesinde seçilip altındaki Grup satırından düzeltilir.

## Sıradaki işler
- Telefonda denenmedi: video yükleme (iPhone'dan 55 MB altı video), Başlat → 0 → ileri sayım herkese açık ekranda.
- Genel sıralamada "Kulübüm" süzgeci (istenirse).

- Herkese açık ekranda logo kaldırıldı (Seyhun 2026-11-01); başlık en solda.
