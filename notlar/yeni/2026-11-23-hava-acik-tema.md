## Nerede kaldım

- Hava sayfası (`WeatherTop`, yükleme ekranı) ve Bilgi › Yönet › Hava (`PlaceWx`) açık temaya geçti (`main.acik` / `.acik`), ana sayfa #1480 gibi. Örnek: https://claude.ai/artifact/T77KJ3cnhcJPmr41M3ckaD (Seyhun 2026-11-23 "yap").
- `HourTable` yeni `tone="acik"`: gri tonlar, grafik gri, ölçülen mavi, sağanak renkli kutu yerine düz rakam (18 kn ve üstü kehribar). Yarış havası (`tone="light"`) ve canlı ekran (koyu) değişmedi.
- `RegionMap` ve `NowRain` renkleri CSS değişkeninden (`--rg-*`, `--nr`; `.acik` içinde açık, başka yerde eskisi gibi). Harita zemini koyu kaldı.
- Açılış ekranı açık: web `BootSplash` (globals.css "Açık açılış") Apple beyazı zemin, koyu daire içinde V. iPhone: `VeloraViewController` zemini ve `capacitor.config.json` ios `backgroundColor` #f5f5f7, `Splash.imageset` açık; bunlar Xcode ile yeniden kurulunca görünür.

## Sıradaki işler

- Takvim sayfası açık temaya (önce örnek).
- Sonra diğer sayfalar sırayla. Yarışlar ve yarış detayı Yarışlar sohbetinde, buradan dokunulmaz.
- Giriş ekranı hâlâ lacivert; açılış logosu girişe uçarken renk değişir (ilk girişte).

## Tasarım

- Açık sayfada saat saat tablosu `tone="acik"` kullanılır; bileşen renkleri sabit yazılmaz, `.acik` değişkenlerinden gelir.
