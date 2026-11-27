## Nerede kaldım
- Veli takvimi PDF'i artık varsayılan olarak telefon düzeninde (Seyhun 2026-11-27: WhatsApp grubundan telefonda açılıyor). `src/features/calendar/veliPdfTelefon.js` `buildPhonePdf`: her ay ayrı uzun dik sayfa (420×800 pt), büyük takvim, hücrede gün + antrenman saati, yarış turuncu (antrenman da varsa üst yarı), tatil kırmızı çerçeve + kısa adı; altta o ayın yarış/tatil satırları ve yalnız o ayın saatleri; not her sayfanın altında; sayfa numarası.
- Pencerede "Sayfa: Telefon | A4 · yazdır" (bu cihazda hatırlanır, sa-veli-takvim `size`); A4 eski `veliPdf.js`.
- Örnek: https://claude.ai/artifact/Bdy7ed2copmBY6Vnb9p2kZ

## Sıradaki işler
- Telefonda gerçek veriyle deneme.

## Tasarım
- Veliye giden PDF önce telefon için: ay başına bir sayfa, saat hücrede.
- Yarış günleri (Seyhun 2026-11-27): PDF'te asıl yarış günleri yarış kaydından (`startDate`/`endDate`, `realDates`); yarış planı yolculuk yazıldıysa gidiş–dönüşü kapsadığı için PDF'te 1 gün kayık görünüyordu. Kayıt yoksa plan tarihi. Önce/Sonra ekstra gün yine elle.
