## Nerede kaldım
- Sonuç her ekranda hemen (Seyhun 2026-11-10 "telefondan yüklerim, iPad'de o an açıktır, anlık görebilmeliyim"; telefonda denenmedi): yarış sayfası ve Genel sonuçlar yarış kaydını dinler (`races.js watchRace`, yalnız sunucu hâli; sonuç değişince `remoteResults` ile sonuçlar + sporcular alınır, yarış sayfasında `sa-race-saved` ile düzenleyiciye gider). Genel sonuçlar genel listeyi (`sheets`) sonuç belgeleri değişince yeniden okur (`ResultsTab filesKey`). Canlı ekran (`api/canli`) genel listeyi 60 sn bellekte tutuyordu; artık yarışın `results.files` değişince hemen yeniden okur (ek okuma yok).
- Paylaş › Velora (Seyhun "WhatsApp grubuna gelen sonuçları direkt uygulamaya"; telefonda denenmedi, Xcode ile yeniden kurulum gerekir): yeni `VeloraPaylas` share extension (mobil/ios/App/VeloraPaylas), PDF ve fotoğraf (en çok 5, 30 MB) App Group › Paylasilan klasörüne, `velora://paylas` ile Velora açılır; `VeloraPlugin.sharedTake` dosyaları verir ve siler; `src/features/ios/SharedResults.jsx` "Sonuç ekle" penceresi (yarış seçimi, bugün süren seçili; `defaultRace`), Ekle → `resultsImport.addResults`. Yalnız ana hesap. Velora açılamazsa dosya bekler, uygulama öne gelince alınır.
- Testler `test:yaris` › "Sonuç anında".

## Sıradaki işler
0. Xcode ile yeniden kur (Team: App, VeloraWidget, VeloraSaat, VeloraPaylas). WhatsApp'ta sonuç PDF'i › Share › Velora › yarış › Ekle; iPad'de yarış sayfası / Genel sonuçlar / canlı ekran açıkken kendiliğinden güncellendiğine bak.
1. İstenirse: düz yazı mesajı (WhatsApp metni) da paylaşılabilsin; Android'de de Paylaş › Velora.
