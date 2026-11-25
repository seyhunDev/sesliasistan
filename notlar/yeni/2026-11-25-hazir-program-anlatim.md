## Nerede kaldım

- "Yelken ev kuvveti" hazır programı yenilendi (Seyhun 2026-11-25): 39 fotoğraf PDF afişlerinden EDSR ile 4 kat büyütülüp netleştirildi (`public/fitness/hazir`, en çok 1400 px); yelken sonrası fotoğraflarındaki yazılar silindi.
- Her harekete kısa "Hazırlık" (setup) ve "nasıl yapılır" (how) anlatımı: `src/lib/fitness/templateHow.js` HOW, fromTemplate ekler; `model.js cleanItem` setup/how alanlarını tutar. FitGuided: ekranda Hazırlık satırı + adımlar (cümle cümle), sesli anlatımda yeni harekette hazırlık + bütün adımlar okunur (moveText/restText/howSay; "nasıl yapılır" sesli komutu da).
- Fotoğrafı olmayan 5 hareket (90 90 nefes, Kedi deve, Ayak bileği knee to wall, Adductor rock back, Bodyweight split squat) program yüklenirken yapay zekayla çizilir: `/api/fitness-pic` (yalnız ana hesap, Gemini görsel modeli, örnek fotoğraf hip-hinge.jpg ile aynı oda/kıyafet, iki kare, yazısız; sayaç `fitpic` günde 20). `templateDraw`, `templateSeed.js`. Çizilemezse "+" ile eklenir. "Ana harekete prova" fotoğrafsız kalır.
- Örnek sayfa: https://claude.ai/artifact/PsnjKpz9f7Gz6gS99yEot4

## Sıradaki işler

- Telefonda: Fitness'ı sıfırla → Hazır program › Örnek programı ekle → fotoğraflar ve 5 çizim gelsin; antrenmanda hazırlık ve anlatım okunsun.
- Anlatım kütüphaneye de yazılabilir (başka programdaki aynı harekete gitsin).
- main'de `scripts/asistan-test/yerel/elle.mjs` 3266. satırda sözdizimi hatası var (başka PR; `/<HourTable.test(`), test:elle çalışmıyor.
