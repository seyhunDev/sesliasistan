## Nerede kaldım

- Gruplu tekne konum animasyonu (onaylı örnek project-files/tekne-animasyon/gruplu): BoatRace yeniden yazıldı. Alçak açı (start hattının arkasından), kamera grubu takip eder, üstte yalnız "● SARI GRUP · N TEKNE" (CANLI KONUM · START yazısı kalktı).
- Örnek izler start'tan finişe uzatılıyor (boatPlay `fullRace`: orsa tramolalı → 1 → 2 → kapı → finiş, iskeleden dönüş, 3 sn'de bir). Kesitler `cutsOf`.
- Uygulama içi canlı ekranda tekneler görünürken çubuğun üstünde şerit (BoatCtl): grup, kesitler, −10 sn, Durdur/Oynat, Canlı, − / +. Depo `src/features/tracking/boatStore.js`; yalnız o telefonda.
- Canlı an: grubun bugünkü son startı (LiveScreen `boatStart`); start yoksa klip baştan döner. Yarış başladıysa ileri sarma canlıya yetişince Canlı'ya döner.
- Telefonda denenmedi; iki parmakla yakınlaştırma yok (− / + düğmeleri var).

## Sıradaki işler

- Gerçek takip verisi (takip/{yarış}/tekne) bu oynatıcıya bağlanınca `fullRace`/`realSet` kalkar.
- İstenirse iki parmakla yakınlaştırma ve TV'de (yayında) kesit gösterme.
