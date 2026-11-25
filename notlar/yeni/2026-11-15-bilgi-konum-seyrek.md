## Nerede kaldım
- Bilgi ekranı konum yazımı seyreltildi (Seyhun 2026-11-15 Firebase yükü sorusu): hareketli 10 sn (önce 5), durgun ya da konumsuz 45 sn (önce 30). Canlı sayılma süresi LIVE_MS 90 sn, TekneMap STALE 90 sn.
- Hesap (tek tekne, hareketli): saatte 360 yazma; Yönet açıkken aynı kadar okuma. Konum tek belgede üzerine yazılır (bilgiTekne/{cihaz}), iz bulutta tutulmaz. Pusula kaydı (yalnız girişli hesapla açılan ekran) dakikada 1 belge, orgs/{org}/bilgiPusula, silinmiyor.
- Telefon verisi: konum yazımı saatte ~0,3-0,5 MB; harita karoları ilk açılışta 1-3 MB, sonra az.

## Sıradaki işler
- İsterse: pusula kayıtlarını 30 günden eski otomatik silme; eski bilgiTekne belgelerini temizleme.
