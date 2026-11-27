## Nerede kaldım

- Yeni plan penceresi Sahne tasarımına geçti (Seyhun 2026-11-27 "Yap"; örnek project-files/plan-ekle/ornek.html). `src/features/add/PlanForm.jsx`, AddSheet elle yeni planda bunu koyu `Sheet` (SheetTone "sahne", yeni `mid` boyu) içinde açar.
- Türler: Antrenman, Yarış, Toplantı, Kamp, Diğer (cat Genel). Tür seçilince ad türün adı olur (kendi yazdığın ada dokunmaz), saat ve yer o türün son planından gelir. Yarış ve Kamp Başlar/Biter kutularıyla açılır.
- "Daha fazla": Önemli, Birkaç gün, Her hafta, Hatırlat, Sorumlu. Görev ve Not seçilince eski ekran açılır.

## Sıradaki işler

- Telefonda dene (+ Plan, takvimden gün seçip Plan ekle).
- İstenirse Görev ve Not ekleme pencereleri de Sahne'ye geçer.

## Tasarım

- Yeni plan penceresi: koyu Sahne, türler renkli noktalı kutular (takvimdeki renkler), seçili limon çerçeve; ad dar büyük yazı (`.pf-title`).
