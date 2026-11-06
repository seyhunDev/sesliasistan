## Nerede kaldım

- iPhone/iPad/Mac uygulamasında (Capacitor) uygulamalar arası geçişte bir an beyaz ekran (Seyhun 2026-11-06; üçünde de iOS uygulamasını kullanıyor). Sebep (tahmin, cihazda denenmedi): sistem arkadaki uygulamanın görüntüsünü atınca dönüşte sayfa yeniden çizilene kadar web görünümünün kendi zemini görünüyor; zemin krem/beyazdı. Artık lacivert #0b1a33: `mobil/capacitor.config.json` ios.backgroundColor ve `VeloraViewController.swift` capacitorDidLoad (view, webView isOpaque=false, scrollView).
- Xcode ile yeniden kurulum gerekir (iPhone, iPad, Mac).

## Sıradaki işler

- Yeniden kurulumdan sonra hâlâ beyaz görülürse: LaunchScreen.storyboard zemini (systemBackground) da lacivert yapılabilir.

## Asistan

- Kenardan kaydırarak geri (Seyhun 2026-11-06 "yana kaydırınca sayfa boş; Instagram'da önceki sayfa altta hazır"): iPhone uygulamasında WKWebView `allowsBackForwardNavigationGestures = true` (VeloraViewController), iPhone önceki sayfanın görüntüsünü altta gösterir. Tarayıcı kimliğine "VeloraKaydir" eklenir (capacitor.config.json ios.appendUserAgent); bunu gören web tarafı kendi `SwipeBack.jsx` kaydırmasını kapatır (eski kurulumda eskisi çalışmaya devam eder). Öncesinde navStart olmayan popstate = kenardan kaydırma, geçiş animasyonu oynamaz (`navProgress.js` navPopped → data-nav none). Açık pencere varken de kaydırma geri gider (önceki engel yalnız web kaydırmasındaydı).
