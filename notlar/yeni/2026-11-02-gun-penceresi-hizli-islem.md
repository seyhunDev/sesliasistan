## Nerede kaldım
- Ana sayfa gün penceresi (DayPick.jsx) hızlı işlemler (Seyhun 2026-11-02 "A · Satırda düğmeler"): plan satırında solda yuvarlak Yapıldı işareti (plan `done: true`; yeşil ✓, üstü çizili, "Yapıldı" yazar, yeniden dokununca geri alınır), adın altında türe göre adlı küçük düğmeler. Yarışın kendi planı: solda saat, "Yarış sayfası" + "Plan"; "Yarış adı: son tarih": Yapıldı + "Yarış sayfası"; diğer plan: Yapıldı. Antrenman satırı: "Yoklama" + "Günlük" (gün geldiyse); eski alttaki Günlük yaz / Yoklama düğmeleri satıra taşındı, "Antrenman ekle" duruyor.
- Yarış bağlantısı adla: raceLinks.js `planKindOf(p, races)` (races = useRaceHome().open, yalnız bitmemiş yarışlar). Yapılan planlar pencerede listede kalır (gün şeridindeki noktalarda sayılmaz).
- Testler: yaris.mjs "gün penceresi: planın türü ve yarışı", ekran "gün penceresi Yapıldı". Telefonda denenmedi.
- Ekran testinde yarış multimedya sayfası testleri (5) kırmızı, bu değişiklikle ilgisiz (koordinatöre bildirildi).

## Sıradaki işler
- Yok.
