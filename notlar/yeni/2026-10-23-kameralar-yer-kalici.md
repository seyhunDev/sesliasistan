## Nerede kaldım

- Kameralar'da seçilen yer kalıcı (Seyhun 2026-10-23: "seçtiği yer sabit kalıcı olsun, istediğinde değiştirir"). Sayfa kayıtlı yerle hemen açılır, konum yeniden sorulmaz; "Konumum" seçildiyse o anki koordinat kaydedilir. Kayıt yoksa bir kez telefonun konumu alınıp kaydedilir (izin yoksa Dikili). Sesle söylenen yer de kaydedilir. Kayıt telefonda (localStorage `cams-place`).

## Sıradaki işler

- Telefonda: yer seç, sayfadan çık, yeniden aç: aynı yerle açılmalı.

## Nerede kaldım (YouTube durumu)

- YouTube'dan yayın gelmezse sayfanın altında tek satır nedenini yazar: "<yer> canlı yayın yok", "Anahtar yok" (Netlify `YOUTUBE_API_KEY` yok ya da yayın anahtardan önce), "Bağlanamadı (403…)" (API açık değil / kota). `/api/cams` cevabında `ytState` (nokey · noplace · fail · ok) ve `ytWhy`.
