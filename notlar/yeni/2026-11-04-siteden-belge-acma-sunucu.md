## Nerede kaldım

- Siteden alınan belgeler açılmıyordu (Seyhun 2026-11-04: "açılıyor diyor, bekletiyor", geçici sonuçta "Firebase Storage … max retry"): telefon belgeyi doğrudan Storage'dan indiremiyordu (indirme dakikalarca deneyip düşüyordu). Artık sunucu okur: `/api/race-site?race=<yarış>&key=<anahtar>` (yalnız ana hesap, kendi noticeFiles yolu), istemci `siteDocBlob` (raceSite.js). Yarış sayfası Dokümanlar, Yayın › Belgeler (DocsTab), sonuç ve liste işleme hepsi bunu kullanır. 5,5 MB'tan büyük belge (Netlify cevap sınırı 6 MB) eskisi gibi doğrudan Storage'dan.
- Hata yazısı PdfViewer'da tam görünür (sunucunun hata kodu dahil).
- Telefonda denenmedi.

## Sıradaki işler

- Storage CORS ayarı (cors.json, gsutil) yapılırsa doğrudan indirme de çalışır; şimdilik gerek yok.
