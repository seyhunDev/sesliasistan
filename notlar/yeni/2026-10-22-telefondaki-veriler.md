## Nerede kaldım
- Ayarlar › Veri ve cihaz › "Telefondaki veriler" (eski adı "Bu cihazdaki veriler") yeniden tasarlandı (Seyhun: "Firebase'e geçirdik, silebiliriz değil mi? videolar görünüyor mu? daha organize"; telefonda denenmedi). Alttan açılan pencere: üstte toplam ve renkli çubuk (Videolar, Evrak, Uygulama, Bekleyen, Diğer); "Bulutta da var · silinebilir" (7 gün tutulan yarış/antrenman medyası yarış yarış, evrak ve talimat kopyaları, uygulama dosyaları, tek "Hepsini sil"); "Yalnız bu telefonda · silinmez" (yüklenmeyi bekleyen medya, gönderilmemiş evrak + Gönder, özetlenmemiş toplantılar); "Uygulamanın kendisi" (çevrimdışı kayıtlar ≈, ayarlar).
- Hata düzeldi: telefonda tutulan videolar önceden bu alanda yoktu, boyutları "Firebase önbelleği"ne ekleniyordu.
- Medya silinmeden önce canlı belgede (raceLive.media) adresli bulut kaydı aranır (`inCloud`); bulunamayan silinmez, mesajda söylenir. Silmeden sonra tarayıcının toplamı gecikmeli güncellendiği için oturumda silinen bayt düşülür.
- Dosyalar: `src/features/settings/DeviceData.jsx`, `src/lib/deviceData.js` (mediaGroups, mediaCount, inCloud; testler elle.mjs "Cihazdaki veriler"), `src/features/raceMedia/pendingStore.js` (listAllPending).

## Sıradaki işler
0. Telefonda: Ayarlar › Telefondaki veriler; videolar yarış adıyla görünüyor mu, Sil sonrası Medya sekmesinde video buluttan oynuyor mu.
