## Nerede kaldım

- Yarış detayı ve Multimedya tek sayfa gibi (Seyhun 2026-10-29 "detay, multimedya aynı sayfa farklı sekmeler olsun", örnek yaris-tasarim/tek-sayfa, "Böyle yap"): yarış sayfasında da Multimedya'nın alt çubuğu (`TabDock`, `RACE_DOCK` = Yarış · Süre · Medya · Parkur · Sonuçlar) + Kayıt + asistan.
- Yarış sekmesi /athletes/races/<id>, diğerleri /media?tab=…; geçiş router.replace. Detaydaki Multimedya düğmeleri (RaceEditor mediaBtn, RaceDayTop Multimedya · Parkur) kaldırıldı. Yarış sayfasında uygulama alt çubuğu gizli (TabBar isMedia). Multimedya geri düğmesi yarış listesine.
- Test: yaris-ekran "alt çubukta Süre ve Yarış sekmesi". Telefonda denenmedi.

## Sıradaki işler

- İki adres tek sayfa gibi görünüyor; istenirse tek rotaya taşınabilir.

## Tasarım

- Yarış detayı ve Multimedya ayrı sayfa değil, alttaki tek çubuğun sekmeleri; detaya ayrı Multimedya düğmesi konmaz.
