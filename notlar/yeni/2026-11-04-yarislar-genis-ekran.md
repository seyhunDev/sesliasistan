## Nerede kaldım
- Yarışlar (Kulübüm) ve Yarış takvimi (Takvim) geniş ekranda ekranı doldurur (Seyhun 2026-11-04 iPad'de dar sütun). Yalnız CSS (globals.css "Yarışlar ve Yarış takvimi geniş ekranda") + sınıflar race-wide / race-top / race-body. Dik iPad (≥48rem): lacivert üst tam genişlik, aylar iki sütun. Yatay iPad ve Mac (sol menü, ≥64rem): solda 26rem lacivert kutu sabit, sağda aylar iki sütun. Telefonda değişiklik yok.
- "14 gün" g'si kesilmesin: ortak kutu (Row.jsx Tile, ana sayfa Kulüp kutuları) büyük değerin altında pay; yarış sayfası "Bugün başlıyor" ve yarış günü başlığı da aynı.

## Sıradaki işler
- Gerçek iPad ve Mac'te denenmedi (tarayıcıda 820, 1180 ve 1440 genişlikte bakıldı).
- Hâlâ ortada dar sütun olan sayfalar: Sporcular, Aidatlar, Envanter, Mesajlar, Planlar, Takvim, Görevler, Notlar, Medya, Antrenman, Hava, Fişler, Ayarlar vb. (her biri kendi sahibi thread'de).
