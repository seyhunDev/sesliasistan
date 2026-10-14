## Nerede kaldım

- "Telefondaki veriyi taşı" takılı kalıyordu (Seyhun: "Taşınıyor da takılı kaldı"; telefonda denenmedi). Yüklemeler bağlantı ya da kural sorununda 10 dakikaya kadar yeniden deniyordu, ekran da yalnız "Taşınıyor…" yazıyordu. Artık Ayarlar'da adım yazar (Bekleyen kayıtlar gönderiliyor / Yarış evrakı taşınıyor %N / Mail ekleri taşınıyor N), yükleme en çok 1 dk dener, her bölüm en çok 5 dk sürer; olmazsa nedeni yazar ("Storage kuralları yayınlanmamış olabilir", "bağlantı zayıf", "Firebase Storage açık değil") (`errText`, `withValue`, MoveAll.jsx; `mailMoveErr`, mailFiles.js; raceStore.js `store`). Kural değişikliği yok.

## Sıradaki işler

- Ayarlar › Telefondaki veriyi taşı'yı yeniden dene; takılırsa ekrandaki adımı, biterse altta yazan cümleyi yaz.
