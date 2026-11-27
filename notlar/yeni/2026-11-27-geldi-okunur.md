## Nerede kaldım

- Yoklama ekranında (antrenör, `RollView`) seçili "Geldi" limon zemin üstünde beyaz yazı olduğu için okunmuyordu (Sahne sayfalarında `--ok` limon). Yeni renk değişkeni `--on-ok` (açık temada beyaz, `--ok` limon olan yerlerde #111; globals.css :root, `.afull`, Sahne bloğu, `main.sahne-pg`, fitSahne.css) ve Tailwind `text-on-ok`.
- `bg-ok text-white` geçen her yer `bg-ok text-on-ok` oldu (görevler, alışveriş, aidat hücresi, fişler, yarış, bütçe…): koyu Sahne sayfalarında da okunur, açık temada değişiklik yok.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda yoklama ekranında Geldi düğmesine bak.

## Tasarım

- Yeşil/limon (`bg-ok`) zemin üstündeki yazı her zaman `text-on-ok` (beyaz yazma; Sahne'de limon üstü koyu yazı). (Seyhun 2026-11-27)
