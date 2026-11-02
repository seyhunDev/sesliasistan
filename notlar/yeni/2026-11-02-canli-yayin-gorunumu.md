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
