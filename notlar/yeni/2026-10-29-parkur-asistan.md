## Nerede kaldım
- Parkur dereceleri ana asistanla (Seyhun 2026-10-29): `raceCourse.js` `courseCommand` (parkur sözcüğü + derece; soru/tahmin değil) → `assistRoute` moreKind "raceCourse" (raceWind'den sonra) → `isler/yarisMedya.js` `courseCmd` o günün yarışına `addCourseObs`. `resultSheet.js` `resultsAsk` "N derece"yi artık sonuç sorusu saymaz. Testler: yonlendirme raceCourse, yaris "asistana parkur".
- Yarış multimedya alt çubuğunda asistan küresi (`RaceMedia.jsx` `AskButton`, antrenman sayfası da bunu kullanır); örnekler sekmeye göre.

## Sıradaki işler
- Telefonda denenmedi. Seyhun'un "15 saniyede bir değişim, parkurdaki rüzgâr" isteği soruldu (10 sn ortalama önerildi).
