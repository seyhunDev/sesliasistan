## Nerede kaldım

- Sporculara fitness programı, 1. adım: ana hesabın tarafı (Seyhun: "ben sporculara program hazırlayayım, sporcu kendisi hazırlayamasın, sayfasında görsün"; plan `/mnt/project-files/fitness/sporcu-plani.md`; telefonda denenmedi). Fitness › + › ilk soruda "Kimin için": Ben ya da uygulamada hesabı olan bir sporcu. Sporcu seçilince hedef/gün/saat/yer soruları aynı, profil bilgin sporcunun programına yazılmaz. Program `fitPrograms` kaydında yeni alanlar `for` (sporcunun hesabı), `forName`; antrenman planlarında `people: [sporcu]`, `fit.for`. Kaydedince sporcuya tek bildirim "Yeni fitness programın hazır" (`/api/notify` olay `fitProgram`, programda `notifiedAt`; bir kez). Fitness sayfasında "Sporcular" satırı: programı olan sporcular (bu hafta yapılan/planlanan, son antrenman), programı olmayanlar "Program hazırla"; sporcuya dokununca programı (düzenle, takvimden kaldır, sil) ve son antrenmanları (`athleteRows`, `isOthers`, model.js; `AthletesSheet`, FitnessHome.jsx). Sporcuların antrenmanları senin Planlar'ında, ana sayfanda ve bildirim özetlerinde görünmez (`fitOthers`, DataProvider; plan-reminders.mjs). Kural değişikliği VAR: sporcu kendi fitness planında yalnız `fit.res` (sonuç) yazabilir (`fitResOnly`, firestore.rules). Sporcunun ekranı henüz yok (2. adım). Testleri `test:elle` › "Fitness: sporcu programı".

## Sıradaki işler

- firestore.rules'u Firebase konsolundan yayınla.
- 2. adım: sporcunun tarafı (ana sayfa kartı, Fitness düğmesi, salt okunur Fitness sayfası, adım adım antrenman ekranı, sonuç yazma). 3. adım: asistan komutları.
