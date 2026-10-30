## Nerede kaldım

- Parkur sesle toplu (Seyhun 2026-10-30 "parkurdaki her şeyi, çoklu söyleyebilmem lazım"): bir cümlede rüzgâr, eksen, pin/komite hattı, şamandıra yönü, orsa uzunluğu birlikte ("rüzgar 330 derece 12 knot, eksen 320, pinden komite 110 ve orsa şamandırası 15 derece"). `courseList` (raceCourse.js) cümleyi böler; `courseCommand` → `{ obs, list }`; tek yazım `addCourseMany`. Rüzgâr yön adıyla da olur ("rüzgar kuzeybatı 12 knot, eksen 320"). "1 nolu şamandıra 15 derece" artık 15° (önce 1 alınıyordu).
- Parkur sekmesi anlık: CourseTab bekleyen yazımı atlamıyor; asistanın yazdığı ölçüm sayfa yenilenmeden çizilir (önce yenileyince görünüyordu). Tarayıcıda emülatörle denendi; telefonda denenmedi.

## Sıradaki işler

- "Komite burada" gibi konum cümleleri asistanda yok (yalnız Parkur sekmesinde).

## Asistan

- Birden çok parkur ölçümü olan cümle raceWind'den önce raceCourse'a gider; tek yön adlı rüzgâr ("rüzgar 15 knot kuzeybatı") eskisi gibi rüzgâr kaydı.
