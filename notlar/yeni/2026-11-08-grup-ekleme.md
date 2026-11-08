## Nerede kaldım

- Yayın › Süre "Başlatılacak" kartında grup çiplerinin yanında "+ Grup": sınıfa eklenmemiş renk grupları (final açıklanmışsa yalnız Altın/Gümüş/Bronz) çıkar, dokununca sınıfa eklenir ve bekleyen her yarışa o grubun startı da girer (`addGrps`, `fillOrder` lib/raceLive.js).
- Neden yalnız Sarı görünüyordu: renk listesi, Sporcu sekmesi ve kurulum gruba yeni grup ekleyince yalnız `plan.sets` değişiyordu; önceden oluşmuş bekleyen yarışta yalnız Sarı startı kalıyordu. Artık üçü de bekleyen yarışları dolduruyor.
- Sesle: "mavi grubu ekle", "optimist kırmızı ve yeşil grupları ekle" (`grpCommand`, liveActions `grpSay`, isler/canliEkran, yönlendirme liveScreen).

## Sıradaki işler

- Telefonda denenmedi. Yarısı başlamış yarışa (bir grubu start almış) yeni grup eklenmez; sonraki yarışlarda olur.
