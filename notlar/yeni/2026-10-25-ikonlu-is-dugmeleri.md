## Nerede kaldım
- Ana sayfa iş düğmeleri (Yoklama, Not, Plan, Fiş, Mesaj, Toplantı, Görev, Tümü) ikonlu oldu (Seyhun 2026-10-25, örnek "B · İki sütun, camgöbeği ikon"): iki sütun, solda büyük camgöbeği ikon kartın kenarından içeri girip sağa doğru solar, yazı sağında. Bugünün yoklaması dolu camgöbeği (ikon beyaz), alındıysa yeşil tik.
- Kod: `ActionGrid icons` (src/components/ui/ActionGrid.jsx), her öğede `icon`; HomeGrid; CSS `.ck-ibtn` / `.ck-icon` (globals.css); Icon setine `grid` (Tümü).
- Test: ekran testi "Ana sayfa › iş düğmeleri" (iki sütun, her düğmede ikon). Telefonda denenmedi.

## Sıradaki işler
- Telefonda bak: ana sayfa 4 sıra düğmeyle fazla uzadıysa düğme yüksekliği küçültülebilir.

## Tasarım
- Ana sayfa iş düğmeleri: 2 sütun, soldan giren soluk camgöbeği çizgi ikon + ad (emoji yok).
