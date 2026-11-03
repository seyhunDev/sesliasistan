## Nerede kaldım

- Yayın › Parkur: alt çubukta **Konuş** (Seyhun 2026-11-03 18:43). Söylenen: "rüzgâr 20 ile 35 arası 12 knot", "rüzgâr 20", "eksen 320", "rota 1 2 3 2 3 finiş" (ya da "parkur bir iki üç finiş"), "trapez" / "ILCA parkuru", hat ve orsa boyu. Rota ve tür seçili karta yazılır; ölçümler parkura eklenir (asistanla aynı kurallar `courseCommand`, göreli cümle, anlaşılmazsa `/api/course-parse`). Duyulan cümle çubuğun üstünde görünür, sonuç bildirimde "Yazdım: …".
- Kod: `src/features/broadcast/courseVoice.js` (`courseVoice`, `routeOf`, `typeOf`). Kaydet yalnız rota elle değişince görünür.
- Test: yaris.mjs "sesle parkur: rota, tür, rüzgâr aralığı".

## Sıradaki işler

- Telefonda denenmedi. Parkur sekmesi yeni tasarım örneği onay bekliyor.
