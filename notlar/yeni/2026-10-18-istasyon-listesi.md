## Nerede kaldım
- Ölçülen rüzgâr artık yalnız Dikili değil: `src/lib/windStations.js` Türkiye'nin resmî SYNOP istasyonlarını (76 tane, meteostat/weather-stations listesinden + elle Dikili 17180) tutuyor. Hava durumu konumu hangi yer seçilirse en yakın istasyon kendiliğinden bulunur; 10 km içinde yoksa "Yakında ölçüm istasyonu yok" yazar, yalnız tahmin görünür. Örnek: Bodrum → 17290 Bodrum, Fenerbahçe → 17062 Göztepe.
- Bulut ortamı OGIMET'e ulaşamadığı için yeni istasyonların gerçekten rapor gönderdiği doğrulanmadı; telefonda "henüz veri yok" görünürse o istasyon SYNOP yayımlamıyor demektir.

## Sıradaki işler
- Seyhun Bodrum ve Fenerbahçe'de mavi gölgenin geldiğini kontrol edecek.
- Küçük ilçelerin (Ayvalık, Çeşme, Foça…) otomatik istasyonları SYNOP'ta yok; gerekirse başka kaynak (MGM) düşünülür.
