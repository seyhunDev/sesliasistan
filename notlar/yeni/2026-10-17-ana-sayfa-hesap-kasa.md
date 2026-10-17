## Nerede kaldım
- Ana sayfa Hesap alanı banka + kasa (Seyhun: "Hesaplar'daki gibi toplam, altında banka ve kasa ayrı, yüzde artış, giriş varsa"; telefonda denenmedi): useMoney (TeamMoney.jsx) kasayı Hesaplar'daki gibi hesaplar (loadCash + loadDebts, kasaOf; açılışta ve `sa-cash-saved` olunca; son değer cihazda `cash`), banka Hesaplar'da seçilen hesaplardan (meta.accts, shownAccounts) TL toplamı. Alan: büyük toplam, "Banka … · Kasa …", "Banka +%x · bu ay kasaya +… ₺" (cashMonth, homeTiles.js), bakiye çizgisi. Test: elle.mjs "Kasa bu ay". Not: ana sayfa açılışında kasa için dues koleksiyonu + incomes + meta + borç belgesi okunur (Hesaplar'la aynı).

## Sıradaki işler
0. Telefonda Hesap alanı: toplam Hesaplar sayfasındaki toplamla aynı mı.
