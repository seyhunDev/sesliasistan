## Nerede kaldım

- Sonuçlarda final grupları (Seyhun 2026-10-30): final serisi Altın / Gümüş / Bronz (Gold / Silver / Bronze, Zümrüt / Emerald) gruplara bölünen yarışlarda yapay zeka sonuç PDF'inden her sporcunun grubunu da okur (`/api/race-results` grp). `resultSheet.js` `grpOf` ile adlandırır, `cleanSheet` aynı sınıfın gruplarını tek listede Altın önce birleştirir (grup içinde 1'den başlayan sıralar genel sıraya çevrilir). Eleme serisinin renk grupları (Sarı, Mavi, Kırmızı) grup sayılmaz.
- Sporcunun sonucu `rankOurs` grp/fp/fn: "Optimist Gümüş grup 5. / 40 · genel 65. / 120"; sesli cevapta "gümüş grupta"; Instagram cümlesinde "Optimist Gümüş grubunda 5." (madalya yalnız genel ve kategori sırasından).
- Sonuçlar sekmesinde Genel'den sonra Altın · Gümüş · Bronz süzgeçleri (grup içinde sıra), her satırda grup sırası kutusu. Yarış takvimindeki ortak sonuçlarda da grup süzgeci.
- Önceden yüklenmiş PDF'lerde grup yok; grup görünmesi için sonuç PDF'i yeniden yüklenmeli. Telefonda denenmedi, gerçek bir gruplu PDF ile denenmedi.

## Sıradaki işler

- Gerçek bir Altın/Gümüş PDF'i ile yapay zekanın grubu doğru okuduğunu denemek.
