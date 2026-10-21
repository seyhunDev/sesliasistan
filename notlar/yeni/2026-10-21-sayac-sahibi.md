## Nerede kaldım
- Sayaç hatası (Seyhun: "süreyi başlatıyorum, geri sayım başlamıyor, diğer yarışın sayımını açıyor"): sayaç telefonda tekti, her sayfa (yarış multimedya, antrenman günü) başka sayfada başlatılan sayacı gösteriyordu; çembere dokununca onu durduruyordu, startan sonra çember kilitliydi.
- Düzeltme: sayaç kaydında `own` (sayacın sayfası: `/athletes/races/<id>/media` ya da `/training/day?id=<plan>`). Her sayfa yalnız kendi sayacını gösterir (useTimerRun başkasınınkini boş verir); başlatınca eskisinin yerine geçer. Kural `ownedBy` (lib/raceLive.js). useLiveSync başka sayfanın sayacını yarış belgesine yazmaz; açılışta başka sayfada süren sayacın yerine belgedeki eski sayacı koymaz. Küre üstündeki süre düğmesi adresi `own`dan alır (sa-sayac-yer kalktı).

## Sıradaki işler
- Antrenmanda her start yarış açmasın, "+" ile yarış eklensin (Seyhun aynı mesajda istedi): örnek hazırlanacak.
- Asistan ekran testinde "Sesli yanıt › bugün plan var mı" adımı main'de de ara ara düşüyor (asistan başlığına söylendi).
