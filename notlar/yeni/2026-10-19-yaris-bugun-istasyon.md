## Nerede kaldım

- Yarış multimedya açılış hatasının asıl nedeni: dün eklenen antrenman günü varken bugün listede olmadığı için sayfa Hava sekmesinde son yarış gününü açıyordu. Artık bugün, yarışın ilk gününden 14 gün öncesinden son gününden 1 gün sonrasına kadar her zaman gün listesinde (`withToday`, lib/raceLive.js) ve açılışta seçili; sayfa Süre ile açılır. Arkadan 30 sn'den uzun aradan sonra dönünce de bugüne döner.
- Multimedya Hava'da ölçülen rüzgâr 10 km sınırı olmadan en yakın istasyondan (en çok 100 km): `/api/wind-obs?far=1`, `useWindObs(..., far)`, `DayDetail far`. Ana sayfa ve hava sayfası 10 km kuralıyla aynı kaldı. Grafiğin altında "Ölçüm: İzmir Çiğli istasyonu · 29,5 km · son ..." yazar.
- Ekran testine (test:asistan-ekran) iki adım eklendi: açılışta bugün seçili, arkadan dönünce bugün.

## Sıradaki işler

- Uzak istasyon (Foça için 30 km) yarış alanındaki rüzgârı tam göstermez; MGM otomatik istasyonları gelince (hava thread'i) daha yakın istasyon kendiliğinden seçilir.
- Telefonda denenmedi.
