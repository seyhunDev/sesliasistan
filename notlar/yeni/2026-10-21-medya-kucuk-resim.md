## Nerede kaldım

- Medya listesi (yarış ve antrenman aynı MediaTab) artık videonun kendisini değil küçük resmi gösterir (Seyhun 2026-10-21: "sürekli video yüklemesi olmasın"). Çekilince telefonda ilk kareden 480 px JPEG hazırlanır (`posterOf`), Storage'a `orgs/<org>/raceMedia/<id>-k` olarak yüklenir, künyede `thumb`. Silme ve sıfırlamada o da silinir. Storage kuralı değişmedi (aynı klasör, image/jpeg).
- Küçük resmi olmayan eski kayıtlar, sayfa açıkken sırayla bir kez indirilip tamamlanır (`backfillPoster`).
- Çekilen hemen listede, telefondaki önizlemesiyle; yüklenirken üstünde dolan halka, bitince kısa ✓, yüklenemezse "!" (örnek yaris-tasarim/medya/yukleme.png, onaylandı). Alttaki "Yükleniyor %" şeridi ve "kaydedildi" bildirimi kalktı.
- Telefonda denenmedi; başarılı yükleme yolu yerelde denenemedi (Storage emülatörü yok), küçük resim üretimi tarayıcıda denendi.

## Sıradaki işler

- Telefonda: video çekince halka, ✓ ve küçük resim; eski videoların küçük resmi geliyor mu.
