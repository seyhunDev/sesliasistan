## Nerede kaldım

- Ana sayfa ve Hava sayfasında (bugün) saat tablosunun altında, lacivert kartın içinde "Şu an" etiketli radar satırı (`features/weather/NowRain.jsx`, ortak): "Burada yağmıyor · 8 km kuzeyinde hafif yağış (radar 13:40)", "Burada şu an orta yağış var", tahmin bugünün kalanında yağış derken "Burada ve 30 km içinde şu an yağış yok". Seyhun 2026-11-04 "burada yağmıyorsa burada yağmıyor diye göstermeliyiz".
- Saat tablosunda (HourTable, her yerde) gerçekleşen (istasyon ölçümü) sütunların zemini açık mavi; açıklama "Ölçülen" yerine "Gerçekleşen". Seyhun "gerçekleşenleri daha net göstermeliyiz".
- 2026-11-04 (sonra): "Şu an" satırı tek satır (sığmazsa …) ve turuncu; metin kısaldı: "Burada yağmıyor · 8 km kuzeyinde hafif · 13:40". Seyhun "tek satır olarak yazmalıyız, turuncu daha dikkat çeker".
- Telefonda ve gerçek radarla denenmedi.

## Sıradaki işler

- Telefonda bak: "Şu an" satırı ve renkli gerçekleşen sütunlar yeterince net mi.
