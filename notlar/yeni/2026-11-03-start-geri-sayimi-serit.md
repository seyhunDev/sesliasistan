# Canlı ekran: start geri sayımı şeritli (2026-11-03)

## Nerede kaldım

- Seyhun: "ilk starta geri sayım ile start geri sayımı farklı olmalı; start geri sayımında önemli olan süre, şerit gibi; tehir ve genel geri de var". Örnek yayin-tasarim/senaryo/2e-start-geri-sayim-*.png onaylandı.
- Yayın sayacı start modunda sayarken (`seqMode` "run") canlı ekran: büyük sayaç (son dakikada turuncu "Son dakika"), altında yarış ve grup; altta 5·4·1·0 şeridi süreye orantılı, her noktada çekilen/inen bayrak (sınıf ↑, hazırlık ↑, hazırlık ↓, sınıf ↓), geçilenler parlak, ilerleyen düğme; sağda sabit şimdiki rüzgâr ve start hattı avantajı. Hiçbir şey dönmez. Videoda aynı üçlü alt bantta (SeqBand). Telefonda alt alta, şeritte yalnız dakikalar.
- Dizide tehir ("ap"): Yayın tehiri dizi sürerken çekerse `plan.ap.seq` (kalan saniye) ve `plan.ap.dur` yazılır (lib/raceLive cleanPlan korur). Ekranda AP + "Tehir · dizi durdu", büyük sebep, şerit gri ve durduğu yerde kırmızı nokta; süre belliyse "Tehir inişine" geri sayımı (ApBlock `seq`). Dizi dışında çekilen tehir eskisi gibi senaryo 3 ekranında.
- Genel geri ("fs"): bugünün son startı genel geri ise 30 dk içinde, yeni dizi başlayana kadar: 1. tekrar bayrağı + "Genel geri · saat", "Yeniden start", uyarı işareti bekleniyor, şerit boş.
- Yarış sırası dönen panel (senaryo 4) olduğu gibi kaldı.
- Ekran görüntüleri: yayin-tasarim/senaryo/2e-uygulandi-*.png.

## Sıradaki işler

- Senaryo 5 (startlar arası / abandone) kodu hazır, gönderilmedi: yayin-tasarim/senaryo/senaryo5-ve-B.patch (NEAR_FIXED kısmı atılır, genel geri artık bu ekranda).
- Senaryo 6 (gün bitti) ve 7 (yarıştan önceki günler): önce örnek.
- Telefonda denenmedi.
