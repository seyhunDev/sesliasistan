## Nerede kaldım
- Yarış akışı (Seyhun: "seri boyunca yarışları oluşturalım, ertesi gün dünden devam, yanlış dokunmaya karşı geri alma, yüklemeden önce değişiklik"; telefonda denenmedi):
  - Süre sekmesi: "Başlat · 5. yarış" geri sayımı başlatır ve yarış satırını açar (`cd` geri sayım başı, `at` start); +30 sn/+1 dk start anını kaydırır; geri sayımda Duraklat yerine "Geri sayımı iptal et" (başlamamış satır silinir); 0'da o anki rüzgâr yazılır; startan sonra "Yarışı bitir" bitiş saatini (`fin`) yazar, süre satırda görünür. Her adımdan sonra 8 sn "Geri al" (önceki liste + sayaç geri yazılır, `writeTimer`). Sayaç kaydında `rid` yarışı bağlar. Countdown.jsx `race` prop'u; TimerTab.jsx; lib/raceLive.js `beginRace/shiftRace/zeroRace/finishRace/dropRace/raceName/raceTime/nextRaceNo`.
  - Numara bütün seri boyunca (`renumber`): 1. gün 3 yarış → 2. gün 4. yarış. Ad elle değişir (boşsa "4. yarış"), bitiş saati de düzenlenir. Liste gün gün, seçili gün üstte.
  - Asistanla başlatılan sayaç (rid yok) multimedya sayfası açıkken yarışa bağlanır (RaceMedia).
  - Fotoğraf/video anı artık yarış satırlarından (`momentAt`): geri sayımda Start öncesi / Son 1 dakika, startan bitişe Yarış sırasında, bitişten 30 dk Yarış sonrası; künyede `rid`. Gruplar "4. yarış · Yarış sırasında".
  - Kaydetmeden önce (ReviewSheet.jsx): kamerada çekilenler telefonda bekler; Bitti'ye basınca liste açılır, her birinin yarışı (ya da Yarışsız) ve anı değiştirilir/silinir, "Kaydet" yükler. Fotoğrafa yazı Kaydet'te seçilene göre basılır; videoya süre çekerken basılır. Kapatılırsa Medya'da "n çekim kaydedilmeyi bekliyor · Gözden geçir".

## Sıradaki işler
1. Telefonda dene: 5. yarışı başlat, iptal + Geri al, 0, Yarışı bitir + Geri al; ertesi gün numara; kamerayla çek → Bitti → düzelt → Kaydet.
2. Yüklenmiş fotoğrafın yarışını/anını sonradan değiştirmek yok (istenirse görüntüleyiciye eklenir).
