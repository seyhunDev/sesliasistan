## Nerede kaldım

- Mac ana sayfa (Seyhun 2026-11-04 "MacBook tasarımı hâlâ kötü, hava durumunun üstünde boşluk yok"): yalnız CSS, globals.css "Ana sayfa geniş ekranda". ≥64rem sayfa üstte boşlukla başlar (1.5rem + güvenli alan), 64–80rem (yatay iPad) hava + günler tam genişlik, altında plan | iş düğmeleri; ≥80rem (Mac) solda hava + günler, sağda aynı hizada sıradaki plan, Bugün, iş düğmeleri; altta tam genişlik Kulüp, notlar dörtlü ızgara; ≥90rem sayfa 96rem. Ekran görüntüleri /mnt/project-files/mac-ana-sayfa/.
- Beyaz ekran (Seyhun: "sayfalar arasında geçerken benimki beyaz ekranla açılıyor, diğer uygulamalar normal"). İki neden bulundu:
  1. Sayfa geçişi animasyonu yeni sayfayı tamamen saydamdan (opacity 0) başlatıyordu; Mac'te sayfa alanı bir an boş görünüyordu (1440 genişlikte ölçüldü: geçişin 30. ms'sinde sağ taraf bomboş). Artık sayfa hiç saydam olmaz: telefonda ileri/geri yalnız hafif kayma, alt sekmeler arası ve geniş ekranda (≥64rem) animasyon yok (globals.css SAYFA GEÇİŞİ).
  2. Yeni sürüm yayınlanınca uygulamaya dönüşte sayfa göz önünde baştan yükleniyordu (#1148), bir an boş ekran kalıyordu. Artık dönüşte yalnız sürüm sorulur; yenileme uygulama arkaya gidince görünmeden yapılır (`src/lib/newVersion.js` onHide) ya da sonraki sayfa geçişinde.
- Gerçek Mac'te ve telefonda denenmedi.

## Sıradaki işler

- Hâlâ beyaz ekran görülürse: hangi geçişte (sol menüden sayfa mı, uygulamaya dönüş mü) öğrenilecek. Yeni sürüm sonrası ilk sayfa geçişi tam yükleme olduğu için kısa bir boş an kalabilir.

## Tasarım

- Sayfa geçişlerinde içerik hiç saydamlaşmaz (beyaz/boş an olmasın); geniş ekranda geçiş anında.
