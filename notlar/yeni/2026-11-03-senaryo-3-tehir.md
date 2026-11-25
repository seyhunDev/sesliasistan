# Canlı ekran senaryo 3: tehir (2026-11-03)

## Nerede kaldım

- Seyhun (senaryo/3-*.png onayı, "yap"): tehirde videosuz ve videolu ekran 1. adımın düzeniyle; yalnız sol blok değişir (`ApBlock`, LiveScreen.jsx):
  - AP bayraklı "Tehir" etiketi (`.lv-apk`).
  - Tehir süresi belliyse "Tehir inişine" geri sayım, altında sebep · Karada (sarı) ve "3. yarış · Sarı grup bekliyor".
  - Süre belli değilse sayaç yerine büyük sebep (`.lv-bigt`, sarı) ve "Karada · Uyarı işareti bekleniyor".
  - Tehir inince (plan.warn) "Tehir indi" etiketi, büyük "Start yakında", "Uyarı işareti bekleniyor".
  - İniş ve uyarı işareti saati hiçbir yerde yazılmaz. Program, parkur sahnesi ve ortak rüzgâr bloğu 1. adımdaki gibi.
- Videolu bant aynı ApBlock'u (`.lv-sbig` sayaçla) kullanır; bantta program satırı tek satır (…), tablo bant içinde kırpılır.
- Ekran görüntüleri: yayin-tasarim/senaryo/3-videosuz-uygulandi.png, 3-videosuz-suresiz-uygulandi.png, 3-videosuz-tehir-indi-uygulandi.png, 3-videolu-uygulandi.png.
- Test yaris.mjs: "canlı ekran senaryo 3: tehir"; "bekleme örnek H, tehir" regex'i ApBlock'a göre güncellendi.

## Sıradaki işler

- Senaryo 4 yarış sürüyor, 5 startlar arası / abandone, 6 gün bitti, 7 yarıştan önceki günler: önce örnek, onay, sonra kod.
- Örnek G (parkur sahnesi sade) onay bekliyor.
- Telefonda denenmedi.
