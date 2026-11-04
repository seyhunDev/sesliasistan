## Nerede kaldım
- Mac ve iPad sayfaları 1. grup (Seyhun 2026-11-04 "sağda solda boşluk var, iPad ve MacBook'a kendine has tasarım"): Takvim ekran boyu ay ızgarası (hücrede plan adları, sağda gün listesi + Plan ekle / Görev ekle), Planlar, Notlar, Görevler, Yarışlar solda ekran boyu lacivert kokpit + sağda liste, Ayarlar kenardan kenara + sütunlar. Telefonda değişiklik yok.

## Sıradaki işler
- Aynı desenle: Yarış detayı, Sporcular, Mesajlar, Hava, Aidatlar, sonra diğer sayfalar.

## Tasarım
- Geniş ekran sayfa deseni (≥64rem, sol menü): yan boşluk yok. Liste sayfası = `main.split` (lacivert kokpit solda 22rem / ≥80rem 26rem, ekran boyu sabit; sağda `.bg-bg` gövde, `split-cols` sütunlar ya da `split-main` + `.split-side`). Ayar benzeri sayfa = `main.wide` + `.wide-body.wide-cols`. Dik iPad (48–64rem) sütunlu gövde iki sütun. Kurallar globals.css sonunda.
