## Nerede kaldım

- Seyhun 2026-10-28: Parkur sekmesi "Bu sayfa açılamadı · undefined is not an object (evaluating 'e.lat')" diye çöktü. Sebebi: komite ve pin işaretlenmeden (yalnız telefonun konumu varken) bir rüzgâr ya da eksen ölçümü girilince `courseShape` olmayan pinden komiteyi hesaplamaya çalışıyordu. Şimdi komite telefonun yerine konuyor (tahmini). Yalnız pin ve 1 nolu işaretliyken eksen hesabı da düzeldi. Şekil hesabında yine bir hata olursa sayfa çökmüyor, harita çizilmiyor ama ölçümler görünüyor.
- Test: yaris.mjs "işaretsiz parkur".

## Sıradaki işler

- Telefonda Parkur'u yeniden aç: önceki ölçümler duruyor, sayfa açılmalı.
