## Nerede kaldım
- Fişler › "N fiş kontrol bekliyor" uyarısı: sayaç tüm fişleri sayıyordu, dokununca açılan liste ise bu ayla ve diğer süzgeçlerle sınırlıydı; ayrıca fişte onaylanacak bir düğme yoktu. Artık sayaç, liste ve fiş sayfası aynı kaynaktan (`lib/receipts.js` `checkWhy` / `needsCheck`). Uyarıya dokununca diğer süzgeçler temizlenir, kontrol bekleyenler ay seçiminden bağımsız görünür. Fiş sayfasında nedeni yazar ve "Doğru" düğmesi uyarıyı kaldırır.
- Fiş toplamı ile kalemler arasında 10 kuruşa kadar fark uyarı vermez (Seyhun 2026-10-19). Eski kayıtlarda nedeni kalmayan "review" sayılmaz.
- Fişsiz kasa çıkışı: Hesaplar › Kasa › Nakit çıkış'ta "Kime verildi" isteğe bağlı. Asistan "200 lira kasa çıkışı ekle" → kısa onay ("Kasadan 200 TL nakit çıkış yazılsın mı?"), sonra yazar. Kişili kasa çıkışları da artık onay sorar (para işi).
- Kasa listesinde elle yazılmış, fişi olmayan kulüp çıkışlarının yanında "Fiş ekle" düğmesi: fiş eklenince yeni çıkış yazılmaz, o çıkış fişe bağlanır (`src rc:<fiş>`, tutar fişten).
- Telefonda denenmedi.

## Sıradaki işler
- Seyhun telefonda dener: kontrol uyarısı, "Doğru", sesle fişsiz çıkış, Kasa'da "Fiş ekle".

## Asistan
- Kulüp kasasından nakit çıkış (kişili ya da kişisiz) kaydetmeden önce onay sorar; kişi söylenmezse fişsiz çıkış olarak yazılır.
