## Nerede kaldım

- iPhone uygulamasının yerel özellikleri (Seyhun: "1, 2 ve 3'ü yapalım… bir saat öncesine de alarm kur diyebilmeliyim"; telefonda denenmedi, Xcode'dan yeniden kurulmalı):
  - Bas-konuş: Siri "Velora dinle" / "Velora'ya söyle", Eylem tuşu (Ayarlar › Eylem Tuşu › Kısayol › Velora'ya söyle), iOS 18+ Denetim Merkezi ve kilit ekranı düğmesi. Uygulama açılır, asistan dinler (`sa-open-assistant` listen). Dosyalar: `mobil/ios/App/Ortak/BasKonusIntent.swift`, `App/VeloraShortcuts.swift`, `VeloraWidget/BasKonusDugmesi.swift`.
  - Tek sayaç kilit ekranında ve Dynamic Island'da (Canlı Etkinlik): çalışırken sistem kendisi sayar (0'dan sonra ileri), durunca sabit + "Durdu", bitince kalkar; dokununca sayacın sayfası. `VeloraWidget/SayacEtkinligi.swift`, `src/features/ios/IosBridge.jsx`.
  - Plan alarmı: planın `alarm` alanı (dk önce, 0 saatinde, null yok; `src/lib/planAlarm.js`). iOS 26'da saat alarmı (AlarmKit, sessiz modda da çalar), eski iOS'ta sesli bildirim. Sesle: "antrenmanın 1 saat öncesine alarm kur", "toplantıya alarm kur", "alarmı kaldır" (yapay zeka patch.alarm; yazmazsa cümleden); yeni plan cümlesinde de okunur. Elle: plan formunda "Alarm" satırı (yalnız iPhone uygulamasında görünür). Alarmlar uygulama açılınca ve planlar değişince telefona eşitlenir (başka cihazdan eklenen plan, uygulama açılınca kurulur). Hatırlatmadan (remind) ayrı.
  - Yeni Xcode hedefi `VeloraWidget` (xcodeproj gem ile eklendi, iOS 16.2+); uygulama iOS 15+ kalır (ActivityKit/AppIntents/AlarmKit zayıf bağlı). Uygulama dili `tr` (Siri cümleleri Türkçe). GitHub Actions "iPhone derleme" (macos-26, imzasız simülatör) mobil/ios değişince çalışır.
  - Testler: elle › "Plan alarmı" (7), asistan › "plan alarmı".

## Sıradaki işler

0. Xcode'dan yeniden kur (VeloraWidget hedefine de Team seç). Dene: Eylem tuşu / Siri "Velora dinle" asistanı dinlemeye açıyor mu; Denetim Merkezi'ne "Velora'ya söyle" düğmesi eklenebiliyor mu; antrenman sayacı kilit ekranında ve Dynamic Island'da akıyor mu; "antrenmanın 1 saat öncesine alarm kur" deyince ilk seferde alarm izni sorulup saat alarmı çalıyor mu.
- Seyhun'un ekip kimliği (DEVELOPMENT_TEAM) projeye yazılırsa her güncellemede Team seçmek gerekmez.
- Sıradaki iPhone işleri (listeden seçilmedi): uygulama bildirimleri (APNs), paylaş menüsü, arka planda yükleme, titreşim/Face ID/widget; tek başına "sabah 7'ye alarm kur" (plansız alarm).

## Nerede kaldım (ek)

- Seyhun telefonda denedi: "1 saat öncesine alarm kur" planın Alarm satırına yazıldı, Settings › Apps › Velora › Alarms açık (izin verilmiş) ama kurulduğu görünmüyordu. Artık alarm telefona kurulunca kısa yazı çıkar ("Alarm kuruldu · Cum 18:00"), izin yoksa nereden açılacağı yazılır (src/features/ios/IosBridge.jsx). Alarmın gerçekten çaldığı henüz denenmedi.
