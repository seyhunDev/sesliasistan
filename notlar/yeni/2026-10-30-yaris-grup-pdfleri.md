## Nerede kaldım

- Altın, Gümüş, Bronz grupları AYRI AYRI PDF yüklenebiliyor (Seyhun 2026-10-30). Önceden aynı sınıfın yeni PDF'i eskisinin yerine geçiyordu; şimdi ikisi de gruplu ise birleşir: yeni PDF'in grupları eskisindekilerin yerine geçer, diğer gruplar kalır (`resultSheet.js` `joinGroups`, `byGroup`; `sharedRace.js` `fleetsOf`). Grup içinde 1'den başlayan sıra genel sıraya çevrilir (Gümüş 1. = Altın'ın sonundan bir sonraki).
- Yükleme anında sporcunun sırası önceki PDF'lerle birlikte hesaplanır (`sharedRace.js` `rankWith`; `resultsImport.js` ve ortak yarıştan çekme `sharedRaces.js` `pullSheets`). Başka grubun sporcusunun sonuç satırı kendi PDF'ine bağlı kalır (`keepFiles`), o PDF silinince yalnız onun satırları gider.
- Yapay zekaya: belge yalnız bir grubun listesiyse ("Silver Fleet") bütün satırlara o grup yazılır.
- Grupsuz okunan PDF yine eskisinin yerine geçer. Gerçek PDF'lerle ve telefonda denenmedi.

## Sıradaki işler

- Gerçek Altın + Gümüş PDF'leriyle denemek (yapay zeka grubu başlıktan okuyor mu).
