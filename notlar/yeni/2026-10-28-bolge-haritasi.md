## Nerede kaldım
- Seyhun "Evet, böyle yap" (örnek bolge-haritasi): hava sayfasında NOKTA haritası yerine BÖLGE kartı, RegionMap.jsx.
- MapLibre (Yemek'teki gibi, lib/maplibre.js) + OpenFreeMap koyu "fiord" görünüm (açılmazsa dark, sonra positron).
- Rüzgâr: 7 × 7 nokta (~5 km), renkli oklar (SDF "ok", colorOf) + yumuşak renk alanı. Yağış: geçmiş son 2 saat RainViewer radar karoları (10 dk), şimdiden sonrası saatlik Open-Meteo mm (mmColor).
- Altta zaman kaydırıcı −2 sa · Şimdi · +12 (lib/regionMap.js regionSteps), ▶ oynat, ⤢ tam ekran; bilgi satırında saat, yön, kn ve istasyonun ölçtüğü kn.
- Dokununca seçilen yer taşınır (pointName Nominatim, profil weatherPlace, Geri al). PointMap.jsx silindi.
- Ekran testi haritayı WX_MAPLIBRE=<npm pack maplibre-gl@4.7.1>/package/dist verilirse gerçekten çizer (yoksa "Harita açılamadı").

## Sıradaki işler
- Telefonda denenmedi; fiord stilinin adresi ve RainViewer karolarının telefonda açıldığı kontrol edilmeli.
