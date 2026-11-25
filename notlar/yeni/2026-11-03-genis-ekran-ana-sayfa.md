## Nerede kaldım

- Mac ve iPad (Seyhun 2026-11-03 "geniş ekrana göre hazırla, hem mac hem ipad"; örnek /mnt/project-files/genis-ekran): ana sayfa geniş ekranda ekranı doldurur (en çok 80rem). Yalnız CSS (globals.css "Ana sayfa geniş ekranda") + sınıf adları (home-wide, home-ck, ck-a…ck-d); telefonda değişiklik yok.
- ≥48rem (dik iPad): hava ve günler tam genişlik, altında plan | iş düğmeleri, sonra Kulüp. ≥64rem (yatay iPad, Mac, sol menü): solda hava tablosu + günler + canlı yarış, sağ sütunda (22rem) plan, iş düğmeleri, Kulüp. Notlar altta, kartlar 12.5rem.
- Uygulama kabuğu: iPad zaten açık (TARGETED_DEVICE_FAMILY 1,2); Mac için Xcode'da "My Mac (Designed for iPad)", yalnız Apple Silicon. Saat ve CarPlay yalnız iPhone.

## Sıradaki işler

- Öteki sayfalar geniş ekranda hâlâ ortada 44rem sütun; sırayla (Planlar, Hava, Yarış) çok sütunlu yapılabilir.
- Gerçek iPad ve Mac'te denenmedi.
