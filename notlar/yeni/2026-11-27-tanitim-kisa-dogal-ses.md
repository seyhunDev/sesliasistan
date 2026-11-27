## Nerede kaldım
- Kısa tanıtım siteye kondu: /tanitim/kisa (public/tanitim/kisa/index.html; klipler /tanitim/ altındakiler). 7 özellik: Antrenman, Yarış, Denizde, Video, Hava, Fitness, Simülatör; her özellikte kayıtla eş zamanlı adım yazıları.
- Seslendirme başta kapalı; açılınca yazılar gider, doğal Gemini sesi (Aoede, "anlatim") anlatır. Ses /api/tanitim-ses?id=… ile gelir: yalnız src/lib/tanitimSes.js'teki sabit cümleler; ilk istekte üretilir, Storage tts-cache'e yazılır, CDN'de bir yıl saklanır (her izleyende API çağrısı yok). Ses gelmezse cihazın sesi.
- Sonda "Hemen katıl" → /tanitim/?k=kisa#katil (başvuruda kaynak "Kısa tanıtım").

## Sıradaki işler
- Cümle değişirse hem sayfadaki "say" hem lib/tanitimSes.js birlikte değişmeli (yeni metin bir kez yeniden üretilir).
- Telefonda ve iPad'de sesli deneme yapılmadı.
