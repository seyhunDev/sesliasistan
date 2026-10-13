## Nerede kaldım

- Fitness sporcu tarafı (Seyhun'un planı `/mnt/project-files/fitness/sporcu-plani.md`, 2. adım; telefonda denenmedi): sporcu (çalışan rolündeki hesap) Fitness sayfasında antrenörün hazırladığı programı görür, kendisi program hazırlayamaz (`AthleteFitness.jsx`: bugünkü antrenman, bu hafta, sıradaki 5 antrenman, kapalı "Gelişim ve geçmiş"; programı yoksa "Programını antrenörün hazırlıyor"). Sporcunun ana sayfasında "Bugünkü antrenmanın" / "Sıradaki antrenman" kartı (`MyFitCard.jsx`, `athleteNext`, `myFit`, model.js) ve antrenmanı varsa kısayollarda Fitness (`homeActions` `fit`).
- Adım adım antrenman (`FitGuided.jsx`): antrenman ekranında "Antrenmana başla" tam ekran açılır: tek hareket, nasıl yapılır, Set 2/3, tekrar/kilo/süre − / + ile düzeltilir, "Tamamlandı" seti işaretler, dinlenme sayacı (+15 sn, Geç), sonra sıradaki set ya da hareket; "Bu hareketi atla"; sonda "Nasıl geçti?" ve "Antrenmanı bitir". Her set işaretlenince plana yazılır, kapatıp açınca kaldığı yerden sürer. Hareket listesi artık "Tüm hareketleri gör" altında. Ana hesapta da aynı.
- Sporcu kendi antrenmanının yalnız sonucunu (`fit.res`) yazar; kayıt ekranında "Tamamladım" yerine antrenman ekranı çıkar (Assigned `extra`, DataProvider `updateRecord` kilit istisnası). Kural 1. adımda (#336) eklendi, bu adımda kural değişikliği yok.
- Testleri `test:elle` › "Fitness" › "adım adım …", "sporcu: bugünkü ya da sıradaki", "sporcu kısayolu".

## Sıradaki işler

- Firestore kurallarını (1. adım) yayınladıysan bir sporcu hesabıyla dene: ana sayfadaki kart, Fitness sayfası, "Antrenmana başla", setleri tamamla, bitir; ana hesapta Fitness › Sporcular'da sonuç görünmeli.
- 3. adım: asistan ("tamam", "sonraki" ile adım adım ilerleme, "bugünkü antrenmanım ne", "Ali için program hazırla").
