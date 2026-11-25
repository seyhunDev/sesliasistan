# Yayın sekmeleri, ekranda alt yazı, rüzgâr grafiği, üst şerit, yarışlar penceresi

## Nerede kaldım
- Seyhun 2026-11-02 (PR #955 sonrası): Yayın sayfası sekmelere ayrıldı: **Süre** (sayaç, bugünün startları, program), **Video** (Ekranda + "Ekranda yazı"), **Parkur** (parkur ve rüzgâr, ölçümler), **Dönüşler** (dönüşler, kayıt listesi, sesle gir). `Seg` ile, `tab` state.
- "Ekranda yazı" (`screen.caption`, `cleanScreen`): alt yazı; öneri çipleri (günün startı, sıradaki start, Start, Finish, Ödül töreni). Canlı ekranda `LowerThird`: sayacın üstünde, solda pembe şerit, büyük yazı, altında sınıf · grup · yarış. Sesle "ekrana yaz: …" / "ekrandaki yazıyı kaldır" (`screenCommand` caption, `screenSay`).
- Rüzgâr: aralık (`range`) okta salınır (`lv-swing`), yön değişince ok döner ve değerler yeniden süzülür; gün boyu grafik her evrede (`WindDay mine mini`): beyaz tahmin + mavi istasyon ölçümü (`/api/canli` `forecast.obs`, OGIMET en yakın istasyon 100 km, `lib/windObs`) + bizim ölçümler beyaz nokta.
- Üst şerit: geri tek başına sol üstte (`lv-backc`), yarış adı büyük harf çok soluk (`lv-ttl2`), yer · tarih daha soluk, hayalet düğmeler (`lv-ghost`); "Canlı" mesaj şeridinin başında kırmızı nokta (`lv-livedot`).
- Önceki yarışlar penceresi (`Races`): geniş (66em), 3 sütun kart; grup · sınıf, yarış no, bayraklar (sınıf, hazırlık, Tehir → AP, Genel geri → 1. tekrar, İptal → N; `voidFlag`), durum etiketi, saat · süre, birinci.
- Örnekler yayin4/{yaris-pc,yarislar-pc,once-pc,gunsonu-pc}.png. Test: yaris.mjs "yayın sekmeleri, ekranda alt yazı…".

## Sıradaki işler
- Seyhun'un telefonda denemesi (sekmeler, alt yazı, gerçek YouTube yayını).
- İstasyon 100 km'den uzaksa mavi ölçüm çizilmez.
