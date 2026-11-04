## Nerede kaldım

- Siteden gelen belge (sonuç, sunucunun okuyamadığı liste) telefonda iki yerde işlenebiliyordu: yarış sayfası (SiteDocs) ve Yayın › Belgeler (DocsTab). İkisi aynı anda açıksa aynı belge iki kez işlenebilirdi. Artık işlemeden önce `claimDoc` (raceSite.js, Firestore işlemi) kaydı "busy" yapar; alamayan atlar. 5 dakikadan eski "busy" yarım kalmış sayılır, yeniden alınır (`waiting`). İşlenemeyen sonuç (sporcular yüklenmemiş) "new"e döner.
- Yarış sistemi bölüşümü (/mnt/project-files/sistem-haritasi/yaris-sistemi-haritasi.md): bu sohbet "B" (Siteden, belge çekme/işleme, Dokümanlar, talimat okuma, Bilgi alanı).

## Sıradaki işler

- Siteden gelen sonuç biri sayfayı açana kadar sıralamaya gelmiyor: sunucuda yazmak sonuçlar sohbetiyle (C) birlikte.
- Yarış sayfası saveRace sunucunun yazdığı notice'u ezebilir: yarış detay sahibiyle (A) birlikte.
- Geçici → kesin sonuç geçişi dosya adına bağlı.
- Bilgi alanı: Seyhun'un seçimi bekleniyor.
