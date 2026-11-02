# Canlı ekran: yayın görünümü (SailGP örneği)

## Nerede kaldım
- Seyhun 2026-11-02, SailGP ekran görüntüsünü örnek verdi: canlı yayın olunca arka plan animasyonla tam ekran, sıralamada yelken no + kısa ad + kulüp, rüzgâr, parkur, yarış adı ve grup köşelerde; yarış öncesi, sırası ve sonrası üç evre.
- Yapılan (`src/features/liveScreen/LiveScreen.jsx` + `liveScreen.css`): `Backdrop` (ekranda canlı yayın/tekrar varsa video tam ekran, 1.2 sn'de açılır, kenarlar koyu; yoksa `Sea`), `lv-ov` grid (sol üst `RankPanel`/`PlanPanel`/gün sonunda `OverallPanel`, üst orta `MsgStrip`, sağ üst `CoursePanel`, sol alt `WindPanel`, alt orta `Clock` şeridi + bayraklar, sağ alt `SidePanel`: sıradaki start + genel ilk 5 / gün sonunda yarışlar ve birinciler). Sıralama satırı: sıra · yelken · `shortName` ("D. Aydın") · `shortClub` ("DYK") (`lib/raceRounds.js`). Panele dokununca tam tablo (`FullList`: Ranking / Overall). Telefonda video üstte 16:9, paneller alt alta.
- Eski üç sütun, Waiting, Summary, Media kartı kaldırıldı; `hasOverall` yerine `overallTop`.
- Örnekler: `/mnt/project-files/samandira-donus/yayin4/{once,yaris,gunsonu}-{pc,telefon}.png`, `once-deniz-pc.png` (videosuz).
- Test: yaris.mjs "yayın görünümü: video tam ekran arkada…".

## Sıradaki işler
- Seyhun'un telefonda gerçek canlı yayınla (YouTube) denemesi; iframe arkada ses kapalı başlar.
- "Kulübüm" süzgeci genel sıralamada (henüz yok).

## Tasarım
- Herkese açık canlı ekran = yayın görünümü: video arkada, köşelerde ince koyu paneller (siyah başlık şeridi, büyük harf), orta boş; tek vurgu pembe; kısa ad ve kulüp kısaltması.

## Ek (2026-11-02, ikinci tur)
- Seyhun: tasarım güzel, gün sonu kötü → gün sonu yeniden: ortada büyük "4 yarış yapıldı" + her yarışın kartı (grup · sınıf · ilk üç) `SummaryHero`; sol üst genel ilk 10; alt orta yarınki ilk start'a geri sayım; sağ alt boş.
- Duraklatma: Yayın › Ekranda "Duraklat / Sürdür" (`screen.pause`, `cleanScreen`); ekranda görüntü kalır, kararıp bulanır, önünde "Yayına ara verildi · Görüntü düzeltiliyor". Sesle "yayını duraklat / yayına ara ver / yayını sürdür" (`screenCommand` pause).
- Geçişler (`useFade`): videosuzken sayaç ortada büyük, video gelince 0.9 sn'de alt ortaya kayıp küçülür (CSS transform geçişi; sayacın giriş animasyonu yalnız opaklık, çünkü `lv-rise` transform'u geçişi eziyordu); video kalkınca 0.9 sn solar, deniz geri gelir; parkur ve rüzgâr panelleri girerken yukarı süzülür, çıkarken `out` ile solar.
- Yayın › Parkur ve rüzgâr: "Ölçümler · N" düğmesi listeyi açar, satırda "Sil" (`saveCourse` ile obs'tan düşer; Seyhun 2026-11-02 "hatalı girişi silmem gerekiyor").
- Test: yaris.mjs "yayın duraklatma, geçişler, ölçüm silme, gün sonu". Örnekler yayin4/{yaris-ara,yaris-videosuz,gunsonu}-pc.png.
