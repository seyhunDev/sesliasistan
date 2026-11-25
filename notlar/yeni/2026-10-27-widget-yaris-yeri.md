## Nerede kaldım

- Yarış günü widget'ı: uzak bir yarış süren günlerde (evden 10 km'den uzak) büyük Velora widget'ında ve Rüzgâr widget'ında büyük rüzgâr ve grafik yarışın yerinin; üstte "Foça · Ege Kupası", altta evin tek satırı "Dikili · 17° · 6–10 kn". Yarış yoksa eski görünüm.
- Uygulama yazar: WidgetFeed `awayRace` + `loadRaceDay` ile yarış yerini bulur, `widgetRace` (lib/widgetData.js) 10 km kuralını uygular, WidgetVeri.race (name, place, lat, lon, start, end). Widget bugünün start…end içinde olup olmadığına kendisi bakar.
- Rüzgâr önbelleği artık yer başına ayrı anahtar (ruzgarOnbellek-lat-lon). Yarış yerinin rüzgârı alınamazsa eski görünüm.
- Xcode'da yeniden derleme gerekir; telefonda denenmedi.

## Sıradaki işler

- Seyhun bir yarış gününde widget'ı telefonda görsün.
