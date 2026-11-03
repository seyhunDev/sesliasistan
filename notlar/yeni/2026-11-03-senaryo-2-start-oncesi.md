# Canlı ekran senaryo 2: start'a 1 saatten az, dönen tek panel (2026-11-03)

## Nerede kaldım

- Seyhun (2026-11-03, örnek 2b onayı): yarış günü start'a 1 saatten az, turuncu bayrak çekili ya da start dizisi sürerken videosuz ve videolu ekran yeniden yapıldı. Önceki örnek (hepsi aynı anda) "çok fazla yazı" diye reddedildi.
- Videosuz `StartHero` (`.lv-hold2`): solda büyük sayaç, sıradaki yarış + grup (sınıf · start saati), start dizisindeyken bayraklar (sınıf bayrağı çekildi/indi, hazırlık bayrağı 1 dk'da iner/indi). Sağda TEK bilgi paneli, 8 sn'de bir kayarak değişir: Start hattı (Pin/Komite avantajlı N°, hat ve rüzgâr yönü) → Rüzgâr (ölçüm, yoksa start'ta beklenen) → Parkur (rota çipleri, eksen) → Sıradaki (bu start'tan sonraki yarış). Altında noktalar. Olmayan bilgi panele girmez. Son dakikada panel kapanır, yalnız sayaç ve bayraklar. Altta 5·4·1·0 çubuğu (geçenler beyaz, süren adım pembe-turuncu dolarak ilerler). Sağ üstte turuncu bayrakta "Start öncesi" + gün · yer.
- Videolu `NearBand` (`.lv-band2`): alt bantta aynı düzen (sayaç + bayraklar solda, dönen panel sağda, çubuk altta).
- Koşul (`near`, LiveScreen.jsx): canlı görünüm, süren yarış yok, tehir / "yarış yok" / yarın değil; sayaç sayıyor ya da turuncu bayrak ya da start'a 1 saatten az. Bu durumda sıralama paneli, program çipleri, kayan parkur/rüzgâr kartları ve alt şerit yok.
- Ekran görüntüleri: yayin-tasarim/senaryo/2-videosuz-uygulandi.png, 2-videosuz-uygulandi-ruzgar.png, 2-videolu-uygulandi.png, 2-videosuz-son-dakika.png.
- Test: `scripts/asistan-test/yerel/yaris.mjs` "canlı ekran senaryo 2" (dosya denetimi).

## Sıradaki işler

- Senaryo 3 tehir, 4 yarış sürüyor, 5 startlar arası / abandone, 6 gün bitti, 7 yarıştan önceki günler: her biri için önce örnek, onay, sonra kod.
- Örnek G (parkur sahnesi sade) onay bekliyor.
- Telefonda denenmedi.
