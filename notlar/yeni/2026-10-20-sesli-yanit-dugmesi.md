## Nerede kaldım

- Asistan ekranının sağ üstüne hoparlör düğmesi eklendi (`ReadToggle`, `src/features/home/TabBar.jsx`). Seyhun 2026-10-20: "asistan kullanılırken de seslendirmeyi kapatabilmeliyim".
  - Kapatınca: okuma o an susar, sonraki cevaplar yalnız yazılır. Kısa "Sesli yanıt kapalı" bildirimi çıkar.
  - Açınca: sonraki cevaplar okunur. "Sesli yanıt açık" bildirimi çıkar.
  - Ayarlar › Sesli yanıt ile aynı ayar (`sa_tts_on`).
  - Açık: mor çerçeveli hoparlör. Kapalı: soluk, üstü çizili hoparlör. Simgeler yumuşak geçişle değişir, basınca içe çökme var.
- TtsProvider'a `disable()` eklendi: sessiz kapatır ("kapalı" diye konuşmaz) ve okumayı durdurur.
- Ekran testine 3 adım eklendi: okurken kapatma, kapalıyken soru, yeniden açma (90/90).
- iPhone'da denenmedi.

## Sıradaki işler

- Seyhun telefonda denesin: okurken hoparlöre bas, hemen susmalı. Sonra bir şey sor, cevap okunmamalı.

## Asistan

- Sesli yanıt asistan ekranından tek dokunuşla açılıp kapanır. Ayarlar'daki anahtarla aynı ayardır.
