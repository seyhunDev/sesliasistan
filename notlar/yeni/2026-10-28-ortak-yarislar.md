## Nerede kaldım
- Ortak yarışlar (Seyhun 2026-10-28: "ben bir yarış ekledim, diğerleri de o yarışı görecek… kendi talimat yüklemesin, gelsin oradan seçsin"; telefonda denenmedi):
  yarışın herkese açık kısmı üst düzeyde `sharedRaces/{id}` (ad, federasyon, il/ilçe, yurt dışı, tarihler, talimat bilgisi + PDF künyesi, spot; `by` ekleyen uid, `byName`, `at`, `sheets` liste kimlikleri).
  Alt belgeler: `sheets/{dosya}` tam sonuç listesi + PDF künyesi, `live/wind` ölçülen rüzgâr (`shareWind`), `course/{gün}` parkur (multimedya başlığının raceCourse.js biçimi).
  Kulübün yarışı `orgs/{org}/races/{id}` ortağa `shared` (+ `sharedAt`) ile bağlı. Sporcu, evrak, bütçe, yolculuk, not, fotoğraf/video kulüpte kalır.
  - Yayın: yarış sayfası her kayıttan sonra arkada `shareRace` (yalnız değişince; yalnız ekleyen kulüp ve ana hesap yazar). Bağ yoksa aynı gün + benzer adlı ortak yarış aranır (`sameRace`), yoksa yeni açılır; önceki sonuç listeleri de gider.
  - Eski yarışlar: Yarışlar sayfası açılınca oturumda bir kez `shareAll` (yalnız ana hesap sahibi, bağı olmayan, adı + tarihi olan).
  - Yeni yarış: "Ortak yarışlardan seç" (RaceEditor `SharedPick`; `pickable`: bitmemiş, kulüpte olmayan). Seçince `fromShared` alanları gelir.
  - Bağlı yarış açılınca: ortak daha yeniyse (`at` > `sharedAt`) alanlar alınır (ekleyen kulüp hariç); ortakta yeni sonuç listesi varsa (`newSheets`) kulübün sporcuları bulunur (`pullSheets`, rankOurs) ve genel liste kulübün raceLive'ına yazılır.
  - Sonuç yükleme (`resultsImport`) yarış ortaksa listeyi ortağa da yazar.
  - Talimat PDF'i kopyalanmaz: Storage indirme adresi herkesten açılır; eski parçalı (Firestore) talimat paylaşılmaz. Storage kuralı değişmedi.
  - Kural: firestore.rules `sharedRaces` (okuma: giriş yapmış owner/staff; ekleme: kulüp ana hesabı, `by` = kendisi; değiştirme/silme: ekleyen ya da `seyhunyildiz@gmail.com`; alt belgeler sheets/live/course aynı). Seyhun konsoldan yayınlar.
  - Testler: `test:yaris` › Ortak yarışlar (7).

## Sıradaki işler
0. firestore.rules'u konsoldan yayınla; Yarışlar'ı aç (eski yarışlar aktarılır), yeni yarışta "Ortak yarışlardan seç" listesine bak (yalnız başka kulübün yarışı görünür).
1. Multimedya: rüzgâr (`shareWind`) ve parkur (`sharedRaces/{id}/course/{gün}`) ortağa yazılsın, başka kulüpte ortaktan okunsun (multimedya başlığı bağlayacak).
2. Başka kulübün eklediği yarışa sonuç yükleme yetkisi (şimdi yalnız ekleyen ve ana hesap) gerekirse açılır.
