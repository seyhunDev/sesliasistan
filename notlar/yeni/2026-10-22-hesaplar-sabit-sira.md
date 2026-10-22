## Nerede kaldım

- Hesaplar listelerinde aynı gündeki kayıtlar her açılışta yer değiştiriyordu (Seyhun 2026-10-22). Sebep: sıralama yalnız tarihe bakıyordu, aynı tarihliler veritabanından gelen sıraya kalıyordu.
- Artık sıra sabit: önce tarih/saat (en yeni önce), eşitse kaydın eklenme zamanı (en yeni önce), o da eşitse kimlik. `src/lib/hesapRows.js` `rowOrder` + `tieOf`; Hesaplar'ın beş sekmesi, Ödenecek ve Geri gelecek listeleri ile Fişler sayfası (/receipts) aynı kuralı kullanır. Test: elle.mjs "Hesaplar sabit sıra".
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun Hesaplar'ı birkaç kez açıp aynı gündeki kayıtların yerinde kaldığına baksın.
