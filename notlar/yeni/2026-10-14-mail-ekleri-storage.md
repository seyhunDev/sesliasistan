## Nerede kaldım

- Banka maillerinin Excel ekleri Storage'a taşınıyor (Storage taşıma 5. adım; telefonda denenmedi): Gmail betiği değişmedi, ekleri yine maile ham yazar, sunucu bildirim için tabloyu okur. Hesaplar sayfası açılınca ekleri hâlâ mailde duran mailler için tablo (`sheets`) okunur, ekler `orgs/{uid}/mailFiles/{mail}_{sıra}_{ad}` yoluna yüklenir, mailde `rawFiles [{name, path, url, size}]` kalır, `raw` silinir (`moveMailFiles`, src/features/mail/mailFiles.js). Eski mailler Ayarlar › Telefondaki veriyi taşı ile de taşınır (`moveAllMailFiles`, 50'şer). Mailin altındaki ek düğmesi dosyayı Storage'dan indirir. Kural değişikliği VAR: storage.rules'a `mailFiles` eklendi (yalnız ana hesap).

## Sıradaki işler

- storage.rules'ı Firebase › Storage › Kurallar'da yayınla, sonra Hesaplar'ı aç ve Ayarlar › Telefondaki veriyi taşı'ya bas; "N mail eki taşındı" yazmalı. Bir maili açıp ekini indir.
- Storage taşıma planı bitti (5/5).
