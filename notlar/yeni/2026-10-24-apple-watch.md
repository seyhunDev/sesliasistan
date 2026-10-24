## Nerede kaldım
- Apple Watch uygulaması (Seyhun: "saatimden konuşarak bir şey yaptırma, süre başlatma, antrenmanda süreyi durdurma"; örnek iphone/saat-ornek.png onaylandı, "saati de yap ve birleştir"; saatte ve telefonda denenmedi):
  - Saat hedefi `mobil/ios/App/VeloraSaat` (watchOS 10+, SwiftUI, `com.seyhunyildiz.sesliasistan.watchkitapp`), iPhone uygulamasının içine gömülü (Embed Watch Content). Ekranlar: Ana (logo küresi = Konuş, saatin dikte ekranı; altta sayaç şeridi / Süre), Cevap (söylenen, cevap, ✓ Kaydedildi, Geri al = "son kaydı geri al", Tamam; cevap soruysa Cevapla), Süre (2/5/10 dk + Başlat; çalışırken start sırası 5 4 1 0, −1 / Durdur / +1; durunca Bitir / Devam; sıfırdan sonra +süre ve Bitir).
  - Telefon: `VeloraSaatKoprusu.swift` (WatchConnectivity, AppDelegate'te başlar), eklentide `watchTake` / `watchReply` / `watchState` ve "watch" olayı. 40 sn cevap gelmezse saate "cevap gelmedi".
  - Web: `src/features/ios/WatchBridge.jsx` (IosBridge içinde). "sor": asistana yazılmış gibi gider (openAssistant), son cevap 3,5 sn değişmeyince ya da kaydedilince saate döner; önceki saat cevabı soru değilse asistan yeni konuşmayla açılır. "sayac": `src/lib/watchTimer.js` (watchTimerAct / watchTimerView / watchTraining) tek sayacı yazar; saatten başlatılan sayaç bugünkü antrenmanın sayfasına bağlanır (mode "start"). Yarışa bağlı sayaç (rid) saatte yalnız görünür.
  - Derleme denetimi (`.github/workflows/ios.yml`) artık `-sdk` vermiyor, saat hedefi kendi simülatörü için derleniyor.
  - Test: `test:elle` › "Saatten sayaç" (7).
- Bilinen sınır: telefon kilitliyken ya da Velora kapalıyken web sayfası çalışmayabilir; o zaman saat "Telefondan cevap gelmedi, Velora'yı telefonda aç" der.

## Sıradaki işler
0. Xcode'da üç hedefe Team seçip (App, VeloraWidget, VeloraSaat) iPhone'a kur; saat uygulaması Watch uygulamasından ya da kendiliğinden saate gelir. Saatte dene: "yarın 16:00 antrenman ekle", Geri al, Süre › 5 dk Başlat, Durdur, Devam, ±1, Bitir; telefon kilitliyken de dene.
