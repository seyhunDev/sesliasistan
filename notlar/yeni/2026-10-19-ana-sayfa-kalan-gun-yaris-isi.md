## Nerede kaldım

- Ana sayfa plan satırlarında kalan gün (`leftTag`, lib/homeTiles.js): bugünküler ve yarın kırmızı ("Bugün", "Yarın"; süren planda yok, "şimdi" var), 2 gün kala sarı "! 2 gün", sonrası gri "N gün".
- Plan adları kısaltılmıyor, alt satıra geçiyor (SiradaCard TimeRow).
- Yarış planına dokununca pencere (`src/features/home/RacePlanSheet.jsx`): Yapıldı, Yarışın sayfası, Planı aç. Yapıldı planı Arşiv'e alır; plan adı "Yarış adı: iş" ise yarışın eşleşen işi (`planRaceStep`, races.js) yarışın Yapılanlar'ına yazılır (`withStepDone`). Yarışın kendi planında Yapıldı yok.
- "Multimedyayı aç" ve Yapıldı yeşil düğme `.acc-btn` (globals.css): gölgesiz, koyu kenarlık + içte yeşil gradyan, basınca içeri.
- Telefonda denenmedi. Örnek: /mnt/project-files/ana-sayfa/yeniden/12-yaris-isi-yapildi.png

## Sıradaki işler

- Önerilen ekler onay bekliyor: yarışa 7 gün kala rüzgâr tahmini, planda yer varsa Yol tarifi, yarış kartında ödenmemiş otel/aidat toplamı.
