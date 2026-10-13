## Nerede kaldım

- Sonradan eklenen YouTube videosu sporcuya gitmiyordu (Seyhun sporcu hesabıyla girip baktı; telefonda denenmedi): programı takvime yazan adımda (`syncPlans`, fitnessData.js) bir ad çakışması vardı (`keep`), planlar yazıldıktan sonra hata veriyordu. Program "takvimde değil" sanılıyor, sonraki düzenlemelerde "Yalnız kaydet" sporcunun planlarını yenilemiyordu; video yalnız programda kalıyordu. Düzeldi; ayrıca programın takvimde gelecek planları varsa her kayıtta onlar da yenilenir (FitnessHome `save`).
- Hazır örnek fotoğraflar (free-exercise-db) kaldırıldı (`stockPhotos`, ExerciseMedia). Hareketlerin adım adım tarifi kaldı.
- Adım adım antrenmanda ayrı "Nasıl yapılır" ekranı ve düğmesi kalktı: hareket ekranında ad, hedef, video (YouTube ya da eklenen video/fotoğraf), tarif; altında set kartı ve Tamamlandı (FitGuided.jsx). Asistana "nasıl yapılır" denince tarif okunur.

## Sıradaki işler

- Yayından sonra sporcu programını sil, yeniden oluştur, videoları ekle, kaydet; sporcu hesabıyla antrenmanı başlat, video ve tarif ilk ekranda görünmeli.
