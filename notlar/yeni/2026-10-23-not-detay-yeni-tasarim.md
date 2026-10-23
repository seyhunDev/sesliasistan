## Nerede kaldım

- Not sayfası yeni tasarımda (Seyhun 2026-10-23 "Yap", örnek /mnt/project-files/not-detay/yeni-tasarim.png): başlık lacivert üstte (`.ck`), sağ üstte renk noktası ve ⋯ (Not ayarları), yazı altta açık alanda. Altta Sabitle, Paylaş, Tamamla.
- Tamamla animasyonu: düğme ve büyük daire yeşile döner, tik çizilir, başlığın üstü çizilir (0,85 sn); sonra liste açılır, not satırı kayarak çıkar (`NOTE_GONE`, sessionStorage), "Geri al". CSS `.note-burst`, `.note-check`, `.note-strike`, `.note-out` (globals.css).
- Dokunmatik ekranda yazı alanları 16px'e zorlanıyordu (globals.css), not başlığı küçük görünüyordu; başlık ve yazı `!text-…` ile kendi boyunda.
- Sahte Firebase'le tarayıcıda denendi; telefonda denenmedi.

## Sıradaki işler

- Telefonda Tamamla animasyonunun akıcılığına bakılacak.

## Tasarım

- Not sayfasında ana iş düğmesinin adı "Tamamla"; "Yapıldı" yalnız iş bitince (durum) görünür. Seyhun her notta "Yapıldı" yazısını notun durumu sandı.
