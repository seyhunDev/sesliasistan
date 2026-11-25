## Nerede kaldım
- /canli'den start (Seyhun 2026-11-05, örnek canli-tv/canli-start-ornek.png onaylı): ana hesapla girilmiş telefonda alt panelin sağında "Start" (src/features/liveScreen/LiveStart.jsx, dinamik import; yalnız readWarmMe varsa yüklenir, sonra Firebase oturumu + orgs/{uid}/races/{id} varsa görünür). Yarım pencere: grup (plan.order; süren yarışlar en başta, geri sayım), Bayrak ve Parkur tek satır + Değiştir (bayrak seçilen ve sonraki aynı sınıf satırlarına + plan.prep; parkur grubun kartı course.by), "<grup> start ver · N dk". Start verince sıradaki grup seçili. Süren geri sayımda +1 dk ve İptal (VoidSheet).
- Ortak kurallar src/features/broadcast/startFlow.js (startBlock, startedRow, orderWithout, zeroStarts, countingAt, yayinPath); Yayın › Süre de bunu kullanır. Sayacın sahibi her zaman Yayın sayfası (own = /athletes/races/<id>/yayin); /canli sayacı saveTimer ile belgeye yazar.

## Sıradaki işler
- Telefonda denenmedi. Start düğmesi yalnız telefon dikeyde (alt panel). Süre sekmesinin yeni tasarımı çoklu grup sohbetinde; startFlow'u o da kullanacak.
