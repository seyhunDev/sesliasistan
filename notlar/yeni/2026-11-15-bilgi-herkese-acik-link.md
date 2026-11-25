## Nerede kaldım
- Bilgi ekranı herkese açık link (Seyhun 2026-11-15): Yönet › "Herkese açık link" (Link oluştur / Kopyala / Yenile). Link /ekran/{anahtar} giriş istemez; ekran, ses ve bipler aynı, pusula kaydı ve geri düğmesi yok.
- Veri: bilgiAcik/{anahtar} (ekranın kopyası, org alanıyla) + bilgiAcik/{anahtar}/ses/son. saveBilgi ve sendSes kopyaya da yazar (bilgiStore mirror). Anahtar orgs/{org}/bilgi/ekran.link; Yenile yeni anahtar açar, eskiyi siler.
- Kural: bilgiAcik get herkese açık (liste yok), yazma yalnız ana hesap. firestore.rules değişti, Firebase konsolundan yayınlanmalı.
- Sesle: "bilgi ekranı linkini ver" (yoksa açar, panoya kopyalar).

## Sıradaki işler
- Kurallar yayınlanınca linki başka telefonda girişsiz dene.
- Mesaj iletildi/görüldü örneği onay bekliyor (artifact XQjxxdyaZRFE7pN2Mb4Wid).
