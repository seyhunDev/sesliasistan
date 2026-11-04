## Nerede kaldım

- Siteden ekranının yarış listesi artık kaydedilmiş listeden açılır (Seyhun 2026-11-04 "listeyi bir kere kaydedelim, siteye sürekli istek atmayalım"): `raceSite/_list-{sezon}` ({ json, at }), `cachedList` (lib/server/raceSiteSync.js). Saatlik yeni yarış taraması şimdiki sezonu yeniler; kayıt 3 saatten eskiyse siteden okunur, site açılmazsa eski kayıt gösterilir.
- Yarış sayfasında Siteden belgeler penceresinde belgeye dokununca PDF açılmıyordu: PdfViewer sayfanın içinde (page-in, ayrı katman), pencere body'de olduğu için arkada kalıyordu. Artık PdfViewer de body'ye (createPortal).
- Telefonda denenmedi.

## Sıradaki işler

- "Bilgi" alanı: ek talimatlar ve duyurular tarihleriyle, yarış öncesi/sonrası gösterme (örnek gösterilecek).
