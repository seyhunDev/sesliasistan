## Nerede kaldım

- Yarış multimedya: sayfa telefonda arkada açık kalıp geri dönünce (5 dk'dan uzun ya da gün değişti) elle seçilen gün bırakılır, bugün seçili gelir; seçili gün şeritte ortaya kayar.
- Hava sekmesi: yarışın yeri yeni `spot` alanında ({ name, lat, lon }). İlk havada ilçeden bulunan yer yarışa kaydedilir; bulunamazsa "Haritadan yer seç", her zaman "Yeri değiştir" (SpotSheet: arama + haritaya dokun, en yakın istasyon ve km görünür).
- Ölçülen rüzgâr bugün ve geçmiş günlerde gelir; en yakın resmî istasyon 10 km'den uzaksa grafiğin altında "Ölçülen rüzgâr yok: en yakın istasyon X, N km" yazar. Foça'ya en yakın istasyon İzmir Çiğli (30 km), bu yüzden Foça'da ölçüm çıkmaz.

## Sıradaki işler

- Küçük yerler (Foça, Çeşme, Urla) için daha sık istasyon kaynağı (MGM otomatik istasyonları) gerekiyor; bu iş hava/rüzgâr sayfası thread'inde.
- Telefonda denenmedi: harita bulut ortamında açılamadı (unpkg kapalı), yalnız yedek görünüm denendi.
