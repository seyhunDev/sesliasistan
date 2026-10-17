## Nerede kaldım
- Fitness: nefes, mobilite, reset, yelken sonrası toparlanma ANTRENMAN DEĞİL (Seyhun 2026-10-17). Hazır program "Yelken ev kuvveti" artık 3 antrenman günü (Salı Kuvvet A, Perşembe Kuvvet B, Cuma mikrodoz); #440'ta eklenen Pazartesi reset, Çarşamba nefes ve mobilite, hafta sonu toparlanma günleri çıkarıldı, kurallarda başlık olarak duruyor (`src/lib/fitness/templates.js`).
- PDF/fotoğraf/metinden okuma (`/api/fitness-import`): kısa rutinler gün olarak eklenmez, süreleri güne katılmaz, rules'a tek satır yazılır; "Nefes ve mobilite · 6 dk", "Isınma", "Hazırlık" gibi bölüm başlıkları hareket olmaz. Yapay zeka kaçırırsa `dropRoutines` (model.js) başlık hareketlerini ve yalnız rutinden oluşan günleri (adı reset/nefes/mobilite/toparlanma/esneme, hiçbir hareketi 2+ set değil) atar. Değişiklik isteğinde (edit) uygulanmaz.
- Antrenman ekranı ve adım adım antrenmanda (FitWorkout, FitGuided) hareketin bütün fotoğraf ve videoları büyük, ortada, aynı boyda (kendi oranı, en çok 18rem boy), oval köşeli gösterilir (`MediaShow`, ExerciseMedia.jsx); fotoğrafa dokununca tam ekran. Küçük kareler yalnız düzenleme ve kütüphanede.
- Daha önce hazır programla kaydedilmiş İlay programında eski reset günleri durur; düzenleme ekranından silinir.

## Sıradaki işler
0. Telefonda dene: Fitness › Sporcular › İlay › Hazır program (3 gün); PDF'i yükleyip nefes ve mobilitenin gün ya da hareket olmadığını gör; fotoğraflı bir hareketi antrenmanda aç.
