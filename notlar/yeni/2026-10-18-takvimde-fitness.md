## Nerede kaldım
- Takvimde fitness (Seyhun: "ana sayfada gösterdiğimiz fitness antrenmanları takvimde gösterilmiyor"; telefonda denenmedi): Takvim sayfası artık ana sayfanın kullandığı `fitDays()` ile kendi ve (ana hesapta) sporcuların fitness antrenmanlarını gösteriyor. Ay ızgarasında turuncu nokta (+ "Fitness" açıklaması), seçili günde plan satırı görünümünde turuncu saatli satır: sporcu adı, "Fitness · program adı", durum (Yaptı/Yapmadı/Atladı). Dokununca o antrenman açılır (AddSheet, fitOthers dahil). Ek Firestore okuması yok (fitOthers zaten yüklü). Kendi fitness planları artık normal plan satırı yerine bu satırla görünür. Dosyalar: `src/app/(app)/calendar/page.jsx`, `src/lib/agenda.js` (`fitOn`); test `elle.mjs` › kulüp kartları.

## Sıradaki işler
0. Telefonda Takvim'de sporcunun fitness günü: turuncu nokta, satır, dokununca antrenman açılıyor mu.
