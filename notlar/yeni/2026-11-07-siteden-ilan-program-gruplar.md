## Nerede kaldım

- Siteden gelen yarış ilanı artık yalnız saklanmıyor (Seyhun 2026-11-07 "yarış talimatında program var, onu kullanalım"): yarışta program yoksa ilanın programı, Yayın programı (raceLive plan) boşsa ilandan Yayın programı yazılır. Ek talimatların değişikliği ezilmez (`raceSiteTake.takeNotice` ilan).
- Sporcu listesinde grup sütunu (Grup/Renk) ya da grup başlıkları varsa gruplar o günün grubu olur (Optimist'te ilk günün grupları sporcu listesinde). Gün: adında tarih varsa o; yarıştan önce gelen liste ilk yarış günü; yarış günü 15:00'ten sonra gelen liste ertesi gün (`siteDocs.listDay`).
- Önceden alınmış yarışlarda bir kez geriye dönük: Yayın programı boşsa ilan, hiç grup yoksa sporcu listeleri yeniden işlenir (`fillOld`, raceSite kaydında `fill`).
- Telefonda ve gerçek PDF ile denenmedi (www.tyf.org.tr buluttan kapalı).

## Sıradaki işler

- Canlı ekranda grupların listesi ve talimat programı (toplantılar, ilk start) Ekran sohbetine iletildi.
