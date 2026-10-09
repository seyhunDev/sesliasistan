## Nerede kaldım

- Asistanda tek bilgi kanalı (Seyhun: "yapay zeka anladım diyor, bilgi kısmında da anladım yazıyor; bilgi kısmı süreci anlatır, yapay zeka cevap verir"; inceleme `/mnt/project-files/asistan/inceleme-2026-10-09.md` adım 1-2; telefonda denenmedi):
  - Ön cevap ("Tamam, planı hazırlıyorum.", "Bakıyorum.") artık sohbete yazılmıyor ve okunmuyor; beklerken ne yapıldığını yalnız bilgi alanı söyler. Ön cevapta veriden yardımcı bilgi varsa ("O saatlerde “Toplantı” planı da var.", rüzgâr) yalnız o yazılır ve okunur (`info`, precue.js). Yapay zekaya da yalnız söylenen bilgi ve telefonun anladığı gider; istem "Tamam / Anladım / Bakıyorum" ile başlamayı yasaklar (lib/ai/assistant.js).
  - Bilgi alanı tek satır: şu an ne yapıldığı. Önceden saat dolunca "Takvim kontrol edildi" gibi gerçekte yapılmamış adımlar "bitti" diye yazılıyordu (WaitLines.jsx). İş belli değilken "Anlaşılıyor" yerine "İstek inceleniyor".
  - Görev listesi sürerken süren iş yalnız listede parlıyor, bilgi alanında ikinci kez yazılmıyor.
  - İşlerin sonucu: akışlar hata verdiğinde cevaba açıkça "olmadı" işareti koyar (`fail`, reply); görev listesindeki ✗ ve "elle yapman gerekiyor" uyarısı buna bakar, yalnız sözcük tahminine (`failed`) kalmaz.
  - Testleri `test:asistan` › "Kısa ön cevap", "Ön cevap", "Bekleme yazıları".

## Sıradaki işler

- Asistana "yarın 10'da antrenman ekle" ve "bugün neler var" de: sohbette "Tamam" / "Bakıyorum" balonu çıkmamalı, altta tek satır bilgi, sonra yalnız cevap.

## Asistan

- Tek bilgi kanalı: beklerken ne yapıldığını yalnız bilgi alanı (tek satır) söyler; sohbete ve sese yalnız asıl cevap (ve veriden yardımcı bilgi) gelir (2026-10-09).
