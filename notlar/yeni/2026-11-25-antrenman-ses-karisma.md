## Nerede kaldım

- Sporcu antrenman ekranında iki ses karışıyordu (Seyhun 2026-11-25). Düzeltmeler:
  - TtsProvider: sunucu sesi (Google) çalmadan önce cihaz sesinden kalan okuma susturulur; iPhone/iPad'de cancel'ın silmediği eski parçalar başlarsa hemen kesilir. Böylece aynı anda tek ses çalar.
  - FitGuided otomatik mod: dinlenmede sıradaki hareketin anlatımı (artık hazırlık + nasıl yapılır, uzun) dinlenmeden uzun sürerse "Başla" anlatımı kesmez, anlatım bitince gelir (restSay/talk/waitGo). Durdur, Elle, Devam et, sessiz ve yeni hareket bekleyen anlatımı temizler (hush).
- FitPlanView (Fitness ana sayfası başlığının dosyası): iPad döndürülünce FitWorkout başka dala taşındığı için yeniden kuruluyor, açık adım adım ekran kapanıyor; o başlığa bildirildi.

## Sıradaki işler

- iPad ve telefonda otomatik modda bir antrenman baştan sona dinlenip tek ses olduğu doğrulanmalı.
