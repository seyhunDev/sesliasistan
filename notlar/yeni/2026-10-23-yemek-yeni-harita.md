## Nerede kaldım

- Yemek haritaları tek görünüme geçti (Seyhun: "tek, hareketli, göze hoş harita; seçenek yok"): MapLibre GL (vektör, akıcı) + OpenFreeMap "positron" (ücretsiz, anahtarsız). Yükleyici `src/lib/maplibre.js` (unpkg maplibre-gl@4.7.1, SRI'li). Kaynak yazısı haritadaki küçük "i" içinde. Örnek sayfa (/yemek/harita-ornek) ve mapStyles.js silindi.
- Rota: sipariş verilirken OSRM'den (OpenStreetMap yolları) restoran → adres rotası alınır, siparişe `route: { line (polyline6), km, min }` yazılır (`src/yemek/route.js` fetchRoute; 5 sn, olmazsa düz çizgi). Eski siparişte harita rotayı kendisi ister.
- Süre: hazırlık (restoranın prepMin) + yol (rota süresi; motor ×0,85, araba ×1, bisiklet 15 km/sa). Onay ve kuryeye verişte de aynı hesap (`roadMin`). Yoldayken kalan süre kuryenin rotadaki yerinden (`progressOn`).
- Takip haritası (`TrackMap.jsx`): rota çizilerek gelir, kamera rotaya uçar; restoran fotoğraflı yuvarlak, ev camgöbeği, kurye aracına göre simge (motor/araba/bisiklet) nabız halkalı, yeni konuma kayarak gider; alınan yol soluk. Takip sayfasında harita artık sipariş verilir verilmez görünür (üstte "Hazırlık N dk · Yol M dk", yolda "Kurye · Araç · km").
- Kurye aracı: Yönetim › Kuryeler'de Motor / Araba / Bisiklet seçilir; kuryeye verilince siparişe yazılır. Deneme kuryesi Murat, motorlu, rota üzerinde ilerler.
- Adres ekleme haritası da aynı görünüm; kaydırırken iğne havalanır, "Konumum" uçarak gider.
- Bulut ortamında harita ve rota sunucularına erişim yok: kod sahte stil ve rota ile tarayıcıda denendi (işaretler, rota, kurye hareketi çalışıyor), gerçek harita telefonda denenmedi.

## Sıradaki işler

- Telefonda: harita görünümü, rota çizimi, kurye simgesi; tek parmakla sayfa kayıyor mu.
- 4. adım: yapay zeka önerisi ve sesli asistandan sipariş.
