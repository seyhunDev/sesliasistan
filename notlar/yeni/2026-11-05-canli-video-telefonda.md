## Nerede kaldım
- /canli Kamera paneli (ana hesap): "Video çek" → video yalnız telefona kaydedilir (künyesi "Telefonda", küçük resim yarışa yazılır). Seçilen videolar "Buluta yükle"; buluttaki tek video seçiliyse "Ekrana al" / "Ekrandan kaldır" (herkesin ekranında arka plan; evreye ayrı görüntü atanmışsa o da). Kod `src/features/liveScreen/LiveVideos.jsx` (LiveStart içinden Kamera paneline portal).
- Yayın › Ekran › Kayıtlar "Telefondan video ekle" de aynı kural: önce telefona, seçilenler "Buluta yükle". Ortak `broadcastStore` keepForScreen / cloudForScreen / keptIds.
- Rüzgâr paneli yalnız grafik (ekleme düğmesi kalktı); Parkur panelinde ana hesaba "+ Ölçüm ekle" (aynı AddSheet).
- Cihazda denenmedi.

## Sıradaki işler
- Telefonda dene: Video çek → Telefonda → Buluta yükle → Ekrana al.
