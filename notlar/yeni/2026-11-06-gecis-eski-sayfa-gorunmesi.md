## Nerede kaldım

- Sayfa geçişinde önceki sayfanın parçaları (ör. Notlar'daki not kâğıdı) yeni sayfada bir an görünüp kayboluyordu (Seyhun 2026-11-06). Sebep #1215 görünüm geçişi: yeni sayfanın katmanı (`.page-in`) zeminsizdi, kayarken boş yerlerinden alttaki eski sayfa görünüyordu. Düzeltme globals.css `.page-in { background: inherit; min-height: 100lvh }`: katman gövdenin zeminini alır (açık, lacivert, koyu sayfalar aynı) ve en az ekran boyu.
- Telefonda denenmedi.

## Sıradaki işler

- Hâlâ görünürse hangi sayfadan hangisine geçerken olduğu öğrenilecek.
