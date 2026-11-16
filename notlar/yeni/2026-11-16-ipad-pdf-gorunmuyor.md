## Nerede kaldım
- iPad'de yarış detayı › Bütçe › sporcu çıktısı açılmıyordu (Seyhun 2026-11-16). Neden: iPad yarış sayfasının sağdaki buzlu cam paneli (main.rzi > .rzc-body) backdrop-filter kullanıyor; bu, içindeki "position: fixed" öğeleri ekrana değil panele bağlar. PdfViewer panelin içinde çizildiği için tam ekran yerine panelin boyunda ve panelin tepesinde (sayfa kaydırılmışsa ekranın yukarısında) açılıyordu, zemini de panelin yarı saydam rengiydi.
- Düzeltme: PdfViewer artık createPortal ile body'ye çizilir (her yerde tam ekran). Evrak "Aç", bilgi notu, talimat görüntüleyici de aynı düzeltmeden yararlanır.

## Sıradaki işler
- Telefonda/iPad'de denenmedi. Aynı risk: panel içinde tam ekran açılan başka parça (ör. CourseTab tam ekran, AroundMap tam ekran) varsa portal gerekir.
