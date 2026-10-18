## Nerede kaldım

- Hata (Seyhun, 2026-10-18): asistan dinliyor görünüyor, dalga oynuyor ama yazı çıkmıyor, bitince de bir şey yok. Sebep: iPhone'da ana ekrandaki uygulamada telefonun kendi ses tanıması (Web Speech) çoğu zaman hata vermeden hiç yazı üretmiyor. O yolda ses seviyesi gelmediği için dalga sahte hareket ediyor; mevcut geri dönüş yalnız hata ya da hemen biten oturumda çalışıyordu.
- Düzeltme: ana ekrandaki uygulamada varsayılan yol kayıt + sunucuda yazıya çevirme (gerçek ses dalgası, söylenen 2-3 sn'de bir yazılır; `nativeOn` lib/speech/detect.js). Safari sekmesinde ve Ayarlar › Ses testi'nden açıkça açılırsa telefonun tanıması denenir; yine yazı vermezse kendiliğinden kapanır ve "tekrar konuşur musun" der (useSpeech `deliver`).
- TimerSound (yarış multimedya) yalnız geri sayım sürerken ses oturumunu alıyor; sebep o değil. Geri sayım sürerken mikrofonla birlikte kullanım ayrıca denenmedi.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda: ana ekrandan aç, asistana konuş; yazının birkaç saniyede bir göründüğüne bak.
