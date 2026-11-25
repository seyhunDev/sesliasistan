## Nerede kaldım

- 2026-11-25 Yarış detayı "Sahne" (Seyhun "Yap"; örnek /mnt/project-files/yaris-detay-sahne/ornek.html, https://claude.ai/artifact/WCi2Y15cnj5LAnsvXySkAD): ana sayfa ve Fitness ile aynı koyu dil.
  - Üst çubuk: geri · "Yarışlar" (yarış günü "Yarışta · N. gün", Ekran · Yönet · limon Canlı) · ⋯.
  - Yarış kartı `RaceHero` (raceUi.jsx): tarih · yer, büyük ad; önce kalan gün, yarış günü Bugün "2 bitti" · Sıradaki "12:30" (`dayStats`, RaceDayTop.jsx).
  - Hava `RaceSahneWx` (RaceWx.jsx): ana sayfadaki hava paneli, yarış günleri kutuları, dokununca saat saat tablo; altında Harita kutusu. Eski `RaceWxRows`, `RaceStats`, `RaceGo` silindi.
  - Sekmeler `RaceTiles`: Takip · Hazırlık · Sporcu · Belgeler durum kutuları; eski bilgi şeridi kalktı.
  - CSS `src/features/athletes/raceSahne.css`; renkler fitSahne.css (`main.fs`), hava paneli sporcu.css.

## Sıradaki işler

- Telefonda ve iPad yatayda dene (yarıştan önce, yarış günü, Takip sekmesi, pencereler koyu mu).
- iPad'de Hazırlık sekmesi iki sütuna yayılabilir (Yapılacaklar | Yolculuk), örnekteki gibi.
- Yarışlar listesi hâlâ açık temada; istenirse aynı dile geçer.

## Tasarım

- Yarış detayı Sahne: kurallar velora-tasarim SKILL.md "Yarış detayı Sahne".
