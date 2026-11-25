## Nerede kaldım
- Bilgi ekranı Başlat'ta yelken no + isim sorar (bu telefonda saklı, "Değiştir" ile değişir; ana hesapla da farklı isim yazılır). Sporcu hesaplarından ve Takip'ten AYRI.
- Ekran açıkken GPS: bilgiTekne/{cihaz} tek belge, 5 sn'de bir (tekne 10 m'den az kıpırdadıysa 30 sn'de bir). Alanlar org, k (açık link anahtarı), sail, name, lat, lon, spd (kn), hdg, acc, t, uid.
- Yönet › Tekneler: MapLibre haritada her tekne GPS noktasında yelken no · isim etiketiyle (TekneMap.jsx), altında liste; 1 dk'dır konum gelmeyen gri. Yalnız Yönet açıkken dinlenir.
- firestore.rules: bilgiTekne (yazma: işletme hesabı ya da açık link anahtarı; okuma ana hesap). Konsoldan yayınlanmalı.
- Okuma/yazma: 10 tekne 2 saat ≈ 14 bin yazma; Yönet açık kaldıkça benzer okuma (günlük sınır 50 bin okuma / 20 bin yazma).

## Sıradaki işler
- Telefonda dene (konum izni, haritada görünme). Tekne simgesi/yön ileride. Sporculara bağlama ileride (uid alanı hazır).
