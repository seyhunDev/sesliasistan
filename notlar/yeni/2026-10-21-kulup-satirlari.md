## Nerede kaldım
- Ana sayfa › Kulüp listesinin başına üç satır eklendi (Seyhun 2026-10-21): Yarış (süren yarış önce "Sürüyor · Bugün", yoksa sıradaki "Paz 25 Eki - Pzt 26 Eki · Foça · 6 sporcu", sağda kalan gün; dokununca yarışın sayfası), Antrenman (yoklamada "geldi" olan son gün, gelenlerin ilk adları ilk 3 + N, sağda "N kişi"; dokununca o günün yoklaması), Fitness (bu hafta yapılan/toplam; dokununca Fitness). Yalnız ana hesap + sporcu yetkisi.
- Son antrenman kulüp verisindeki yoklamadan okunur (loadAthletes, oturumda 3 dk saklı); sonuç cihazda tutulur (readSum "train"). raceHome.js open listesine endDate, yer, sporcu sayısı eklendi.
- Kodlar: lib/homeTiles.js clubRaceRow, lastTraining, fitWeek; features/home/HomeWidgets.jsx ClubRows. Test: elle.mjs "Ana sayfa kulüp satırları" (6).
- Telefonda denenmedi (önizlemede kulüp verisi yok, Antrenman satırı görülemedi).

## Sıradaki işler
- Telefonda Antrenman satırının adları doğru gösterdiğini kontrol et.
