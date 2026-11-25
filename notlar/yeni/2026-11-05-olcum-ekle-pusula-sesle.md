## Nerede kaldım

- Ölçüm ekle penceresi yenilendi (Seyhun 2026-11-05 "Yap", örnek project-files/yayin-parkur/olcum-ekle-ornek.png): 8 kısa kutu, parmakla çevrilen pusula kadranı, −5 −1 +1 +5, Pusula (telefonun baktığı yön kadranda canlı; "Bunu kullan", "Kamerayla nişan al"), rüzgârda Hız / Sağanak / Aralık satırları (Yok = eklenmez), Kim ölçtü, "Ekle · KB 330° · 12 kn". iPad'de iki sütun. Tek bileşen: `src/features/raceMedia/CourseTab.jsx` AddSheet (Yayın › Parkur, /canli, antrenman).
- "Canlı ekranda da sesle de olmalı": pencerede Sesle düğmesi (onVoice verilen yerlerde: Yayın › Parkur ve /canli). Sesle parkur penceresi (CourseTalk) /canli'de de açılır; yazım ortak `src/features/broadcast/courseWrite.js` writeCourseVoice. CourseTalk stilleri `CourseTalk.css`'e taşındı (masa.css /canli'de yüklenmez).
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda pusula yönünü (iPhone uygulamasında gerçek kuzey) ve /canli'de Sesle'yi dene.
