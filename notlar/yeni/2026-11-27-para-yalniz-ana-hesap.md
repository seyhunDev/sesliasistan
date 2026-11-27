## Nerede kaldım

- Para bilgisi yalnız ana hesapta (Seyhun 2026-11-27 "normal kullanıcılar, sporcular… o bilgileri onlar görmeyecek; ana sayfasında da gösterilmesin"). Kural tek yerde: `src/lib/hesapGorunum.js` `seesMoney(view)` (yalnız "ana").
  - Tümü / sol menü / sporcu menüsü: "Para" grubu (Fiş / Fatura, Hesaplar) yalnız ana hesapta (`homeActions` o.money, usePages).
  - Ana sayfalar: çalışanın "fişin ödendi" bildirimi (PaidNotice) normal ve sporcu ana sayfasından kalktı.
  - Zaten yalnız ana hesapta olanlar: Hesaplar (/mail), Mail ayarları (/mail/setup), Gelen ödemeler (/payments) sayfaları başkasını ana sayfaya döndürür; Ayarlar'daki "Gmail ve banka mailleri" satırı ve ana sayfadaki Hesaplar kutusu yalnız ana hesapta; banka maili bildirimi yalnız ana hesaba gider.
  - Veri silinmedi. Çalışan fişini yine + Ekle ile ekleyebilir (ödeme bekler).
- Test: elle.mjs "işlemler: çalışan ve veli". Telefonda denenmedi.

## Sıradaki işler

- Seyhun Ayarlar › "Normal kullanıcı gibi gör" ve "Sporcu gibi gör" ile Tümü'de Para grubunun çıkmadığına baksın.
