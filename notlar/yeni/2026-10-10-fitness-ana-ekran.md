## Nerede kaldım

- Fitness ana ekranı yeniden (program kaydedildikten sonra; Seyhun "Kayıt sonrası ekranlar"ı seçti; onay bekliyor, telefonda denenmedi): en üstte koyu "Bugün" kartı: antrenmanın adı, süre, hareket sayısı, ilk 4 hareket (set × tekrar · kg), büyük "Antrenmana başla" / "Devam et"; yapıldıysa "Antrenman tamam" ve sonuç; antrenman yoksa "Dinlenme günü" + sıradaki antrenman. Altında "Bu hafta": halka (yapılan/planlanan), 7 gün daireleri (✓, ✕, bugün çerçeveli), seri ve dakika. "Gelişim": hareket başına en iyi değer, küçük çizgi grafik, artış etiketi (ilk 4, Tümü). "Programım": programın kaçıncı haftası ve ilerleme çubuğu, günler yalnız ad ve saatle, Düzenle / Planlara ekle (ya da Takvimden kaldır), Programı sil. "Bu ay" tek kart, "Geçmiş" son 5 (Tümü). Parçalar `src/features/fitness/FitDashboard.jsx`, hafta hesabı `progWeek` (model.js). Firestore'a ek okuma yok. Örnek: `/mnt/project-files/fitness/ana-plan.png`, `ana-done.png`, `ana-rest.png`.

## Sıradaki işler

- Fitness ana ekranını telefonda aç: Başla düğmesi antrenmanı açıyor mu, hafta daireleri ve gelişim doğru mu.
