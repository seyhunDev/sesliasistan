## Nerede kaldım

- Seyhun 2026-11-21 "butonlar modern, sade, profesyonel olsun; bütün tasarımlarda ortak butonu kullanalım". Örnek project-files/butonlar/oneri.png (Şimdiki · A Düz · B Çerçeveli); 2026-11-22 "Yap" ile A · Düz seçildi.
- globals.css ortak düğme (.btn) düz oldu: tek renk dolgu, degrade/gölge/çerçeve yok, köşe 12px (küçükte 10px). Renkler --btn-bg / --btn-fg değişkeninden; açık gri --btn-gray. Lacivertte (.ck/.navy/.lvd/.food-card) Ana #3d7bff, İkincil yarı saydam beyaz, Tehlike açık kırmızı. Basınca %97 küçülür + koyulaşır (lacivertte açılır).
- masa.css (Yayın masası) --btn-top/--btn-bot yerine --btn-gray; Canlı ekran beyaz düğmesi (rz-go) gölgesiz, değişkenle.
- Tasarım örnekleri için hazır parça: project-files/butonlar/ortak-dugme.css + KULLANIM.md (uygulamayla aynı sınıf adları). velora-tasarim skill'inin düğme bölümü güncellendi.

## Sıradaki işler

- Telefonda bakış.
- `.raised` (seçim kutuları, gün kutuları, çipler) hâlâ degradeli; istenirse onlar da düzleşir.

## Tasarım

- Düğme görünümü "A · Düz" (Seyhun 2026-11-22). Yeni düğme yazılmaz; örneklerde ortak-dugme.css.
