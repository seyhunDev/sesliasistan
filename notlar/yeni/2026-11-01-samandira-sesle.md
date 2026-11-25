## Nerede kaldım
- Şamandıra dönüşlerini sesle girme (Seyhun: "konuşarak yapmak en iyisi", 100'den fazla tekne; telefonda denenmedi): Canlı ekran › Dönüşler › "Sesle gir" tam ekran (`src/features/rounds/RoundsScreen.jsx`). "Konuş" ile numaralar sırayla söylenir; söylenen yapay zekaya gider (`/api/round-say`) ve komutlara çevrilir (sona ekle, N. sırayı değiştir, sil, araya ekle, taşı, sonraki/önceki şamandıra, parkur), telefon uygular (`src/lib/roundSay.js` applySay). Yapay zeka yoksa yalnız numaralar eklenir. Dönüşler canlı ekranın kaydına (`rounds[startId]`, `saveRounds`) yazılır.
- Kayıt listesi (`EntriesView.jsx`, `raceLive/{yarış}/entries/list`): PDF/foto/Excel yapay zekayla okunur (`/api/race-entries`), önceki sonuç PDF'lerinden alınır, yazılır ya da söylenir. Söylenen numara listede yoksa satır sarı ve en yakın numara önerilir; aynı şamandırada iki kez söylenen eklenmez; ses tanımanın birleştirdiği numaralar ("243524") listeye göre ayrılır.
- Örnek: /mnt/project-files/samandira-donus/ornek2.png. Testler `yaris.mjs` "Şamandıra dönüşü sesle" (16). Firestore kuralı değişmedi (yalnız ana hesap).

## Sıradaki işler
0. Telefonda dene: kayıt listesine bir PDF ekle, Sesle gir › Konuş › "24, 3542, 2" › "2. sırayı 512 yap" › "sonraki şamandıra"; canlı ekranda göründüğüne bak. Botta rüzgârda mikrofon nasıl, gerekirse kulaklık mikrofonu.
1. Kamera ile okuma (ikinci adım, Seyhun seçti): iPhone uygulamasında Apple Vision ile tekne takibi + yelken numarası okuma, şamandıra çizgisini geçiş sırası; aynı kayıt listesi ve aynı ekran. Xcode ile yeniden kurulum gerekir.
