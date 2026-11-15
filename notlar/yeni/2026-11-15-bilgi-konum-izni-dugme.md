## Nerede kaldım
- Bilgi ekranı: konum izni verilmemişse haritanın ortasında büyük "Konum iznini ver" düğmesi (BilgiScreen GeoAsk, useMyPos.ask). Dokununca izin yeniden istenir; verilirse konum izlemesi baştan başlar. Telefon artık sormuyorsa (kalıcı red) cihaza göre tek satır yol yazılır (geoHelp: Android uygulaması, iPhone uygulaması, iPhone Safari, Chrome).
- Başlat dokunuşu zaten pusula, ses ve konum iznini birlikte istiyor. Capacitor'da ayrı konum eklentisi yok (WebView kendisi Android izni soruyor), uygulama yeniden derlemesi gerekmez.

## Sıradaki işler
- Telefonda dene: izni reddet, düğmeye bas, pencere geliyor mu.
