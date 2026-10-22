## Nerede kaldım

- iPhone küçük dokunuşlar (Seyhun: "7'yi yapalım"; telefonda denenmedi, Xcode'dan yeniden kurulmalı):
  - Titreşim: ortak `haptic(tür)` (src/lib/haptic.js; light/medium/heavy/select/success/warning/error). iPhone uygulamasında Taptic (VeloraPlugin.haptic, mobil/ios/App/App/VeloraDokunus.swift); uygulamadaki eski `navigator.vibrate` çağrıları da otomatik Taptic'e çevrilir (bridgeVibrate). Asistan ekranı titreşimlerini "Ana sayfa ve asistan yeni tasarım" thread'i bu fonksiyonla bağlıyor.
  - Face ID ile kilit: Ayarlar › Hesap › "Face ID ile kilit" (yalnız iPhone uygulamasında, bu telefonda saklanır). Açıkken uygulama açılınca ve 1 dk'dan uzun arka planda kaldıktan sonra Face ID ister, olmazsa telefon şifresi (src/features/ios/AppLock.jsx).
  - Ana ekran widget'ı "Velora": küçük (rüzgâr + sıradaki plan), orta (rüzgâr + 3 plan), kilit ekranı dikdörtgen. Lacivert zemin. Rüzgârı widget kendisi open-meteo'dan alır (seçili hava konumu), planlar uygulama açılınca güncellenir (src/lib/widgetData.js, VeloraWidget/SiradakiWidget.swift). Veri ortak uygulama grubunda: `group.com.seyhunyildiz.sesliasistan` (App.entitlements, VeloraWidget.entitlements).
  - Testler: elle › "iPhone widget ve titreşim" (2).

## Sıradaki işler

0. Xcode'dan yeniden kur. App Groups hatası çıkarsa: iki hedefte de Signing & Capabilities › App Groups altında `group.com.seyhunyildiz.sesliasistan` işaretli olsun. Dene: ana ekrana Velora widget'ı ekle; Ayarlar › Hesap › Face ID ile kilit; düğmelerde titreşim.
