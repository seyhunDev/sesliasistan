## Nerede kaldım

- İngilizce sayfası (/english) yeniden tasarlandı (Seyhun 2026-10-26, örnek /mnt/project-files/ingilizce-kelime/yeni/ornek-2.png onaylandı: "asıl amaç bir kelimeyi veya bir cümleyi öğrenmek, onu ön plana çıkaralım"). Koyu, soluk fotoğraflı tek ekran: kelime ya da cümle büyük, anlamı, örnek cümleler, kısa A/B diyaloğu. Üst çubuk ve düğmeler soluk; listeler, konular ve Ekle "⋯" içinde.
- Ek örnekler: /api/word `more: true` (2 cümle + 3 satır diyalog), kart ilk açılınca bir kez hazırlanır, destede kelimenin `ex2` / `dlg` alanlarına yazılır (englishWords.js setMore, cleanWord).
- Sına: "Öğrendim" düğmesi yerine 3 soru (quizFor): anlamını seç; boşluğu doldur (kelime cümlede geçmiyorsa ya da cümlede: Türkçesinden İngilizcesini seç); dinle, anlamını seç. 3/3 → öğrenildi, değilse çalışmaya girer ve yarın yeniden (missWord).
- Dokununca okuma: sayEn (features/words/WordView.jsx) önce /api/tts `lang: "en"` (Google en-US sesi, GOOGLE_TTS_KEY; GOOGLE_TTS_VOICE_EN ile değişir), anahtar yoksa ya da 4 sn'de gelmezse telefonun İngilizce sesi. Kelime kartı da aynı sayEn'i kullanır.
- Telefonda denenmedi; arka plan fotoğrafı (Unsplash) bulut ortamında açılamadı, açılmazsa yalnız koyu zemin kalır.

## Sıradaki işler

- Telefonda dene: İngilizce ses Google'dan mı geliyor, fotoğraf görünüyor mu, Sına akışı.

## Tasarım

- İngilizce sayfası: öğrenilen kelime/cümle ekranın odağı; başlık, düğme, sayı gibi her şey soluk ve küçük. Listeler ⋯ içinde.
