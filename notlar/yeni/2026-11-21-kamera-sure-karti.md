## Nerede kaldım
- Kamera üstündeki süre (Seyhun 2026-11-21 "süre başlattım, kamerada görünüyor; tasarladığımız süre kartının aynısı olsun"): iPhone kamerasının üstündeki sayaç (`VeloraKamera.swift` `SayacKatmani`) siyah kutudan /canli süre kartı görünümüne geçti: kutu yok, sol üstten solan lacivert gölge, büyük dar yazı; geri sayım mavi "−2:59" ve altında eriyen ince çizgi, sıfırdan sonra beyaz "+1:35". "Yarış startı/Antrenman" yazısı kalktı.
- Tek yer: bütün çekimler `RecPick` üzerinden açılır (yarış/antrenman Kayıt, /canli ve yönetimdeki Video çek), hepsinde aynı kart. RecPick sayacın tamamını `dur` olarak gönderir (çizgi için).

## Sıradaki işler
- Yerel değişiklik: iPhone'da Xcode ile yeniden kurulmalı. Telefonda denenmedi (kart yeri: güvenli alanın 60 pt altı, solda; iPhone kamera düğmeleriyle çakışırsa yeri ayarlanır).
- Grup rengi çizgisi kamerada yok (yerel sayaçta grup bilgisi yok); isterse eklenir.
