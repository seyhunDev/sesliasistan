## Nerede kaldım
- Sesli yanıt: "kn", "kt", "kts", "knot", "knots" artık "not" okunur ("kaç knot" → "kaç not", "15 knotluk" → "15 notluk"); sayı aralığı "2–4 kn" → "2 ile 4 not", "300-320°" → "300 ile 320 derece". Ekrandaki yazı değişmez (`src/lib/speech/speakText.js`, test `yerel/ses.mjs` "Sesli okunuş").
- Asistan küresi: iş bitince yeşil ✓ yalnız `CHECK_MS` (1,5 sn) görünür, sonra halka boşa döner ve normal asistan düğmesi gelir (`TabBar.jsx`; ekran testi "Halka renkleri" kaybolmayı da bekler). Renkler değişmedi.
- Telefonda denenmedi.

## Sıradaki işler
- Seyhun telefonda dener: rüzgâr soran bir cevabı sesli dinle, bir plan ekleyip ✓'nin kaybolduğuna bak.
