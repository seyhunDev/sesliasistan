## Nerede kaldım
- Yönet › Mesajlar (Seyhun 2026-11-23 örneği "Yap"): sol araçlarda "Mesajlar" büyük pencere (BilgiMesaj.jsx MsgList). Gönderilen yazılı mesajlar (bilgiLog kind "msg") en yenisi üstte; saat, mesaj, kime, görülme; etiket Sabit / Ekranda / Gizli.
- ⋯ menüsü: Sabitle (ekran belgesinde `pin`, aynı anda bir tane, kaldırılana kadar sporcu ekranında altta "Sabit"), Gizle (ekrandan hemen kalkar, günlükte `hid`), Sil (ekrandan kalkar, 6 sn "Geri al", sonra günlük belgesi silinir).
- sendMsg günlüğe `dev` yazar (tek sporcuya giden sabitlenebilsin); eski kayıtlarda tek sporcuya gidenler sabitlenemez. loadLog satırında `logId` = günlük belgesi.
- Telefonda denenmedi.

## Sıradaki işler
- Sesli mesajlar listede yok (yalnız yazılı).

## Tasarım
- Sabit mesaj sporcu ekranında normal mesaj yerinde durur, üstünde "Sabit"; yeni gelen mesaj 1 dk onun yerine gösterilir, sonra sabit geri gelir.
