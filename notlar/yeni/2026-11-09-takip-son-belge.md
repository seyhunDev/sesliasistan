## Nerede kaldım
- Takip'in en üstünde son gelen belge kartı (RaceTrack NewsCard, örnek /mnt/project-files/talimat-ust/ornek-telefon.png): sonuç ve sporcu/grup listeleri dışındaki en yeni belge (siteDocs.latestNews), ne değiştiği (sunucunun notu) ve "Program ve canlı yayın programı güncellendi". "Aç" belgeyi açar, "Okudum" kaydına `read: true` yazar ve kart kalkar; yenisi gelince yine çıkar. Bitmiş yarışta gösterilmez.
- Okunana kadar Program'da o belgenin değiştirdiği satırlar mavi, eski saat üstü çizili (siteDocs.changedRows, belgenin undo.notice'i ile karşılaştırma; ilk talimat değişiklik sayılmaz).
- Ek talimatla programın güncellenmesi zaten otomatikti (raceSiteTake.takeNotice: race.notice.schedule + raceLive plan, yalnız belgede geçen günler).

## Sıradaki işler
- Gerçek bir ek talimatla telefonda denenmedi.
