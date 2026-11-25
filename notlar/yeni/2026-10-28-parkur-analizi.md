## Nerede kaldım

- Yarış Multimedya'ya **Parkur** sekmesi eklendi (Süre · Medya · Parkur · Sonuçlar). Onaylı örnekler: /mnt/project-files/yaris-tasarim/parkur/ (parkur-3-harita.png, parkur-3-pusula.png).
- Harita: arkada soluk OSM (Leaflet). Komite / pin / şamandıra "burada" düğmeleriyle telefonun konumuna işaretlenir. İşaretlenmeyen pin ve şamandıralar eksen ve hat açısından tahmin edilir (kesik çizgi, "tahmini · 0,5 mil"). Rüzgâr okları ölçüldüğü yerde durur. Haritaya dokununca o noktaya ölçüm eklenir.
- Ölçüm türleri: rüzgâr (derece + kn, yer), parkur ekseni, start hattı (pin'den komite / komiteden pin), şamandıraya bakış, orsadan apaza / apazdan orsaya. Kim ölçtü: Ben · Komite · Hakem botu.
- Sesle ya da yazarak ekleme: önce telefondaki kural (`parseCourseText`), anlamazsa yapay zekâ (`/api/course-parse`). Anlaşılan ölçüm 3 sn sonra eklenir; İptal ve Şimdi ekle düğmeleri var.
- Pusula: kamera + telefonun pusulası, "Al" ile açı alınır, ardından "Bu açı ne?" sorulur.
- Hat avantajı: hat rüzgâra dik olsa pin'den komite = rüzgâr + 90°. Fark artıysa pin önde, eksiyse komite önde. Özet kartı rüzgâr dönüşünü ve hız değişimini gösterir. Ölçüme dokununca silinir (Geri al ile).
- Kayıt: `orgs/{org}/raceLive/{yarış}/course/{gün}`. Kural değişikliği gerekmedi.
- Ortak yarış (`race.shared`): ekleyen kulüp parkuru `sharedRaces/{id}/course/{gün}` belgesine, ölçülen rüzgârı `live/wind` belgesine de yazar. Başka kulüpte kendi kaydı boşsa ortaktaki gösterilir; ilk eklemede kendi kaydına geçer. Yazmadan önce `canShare` bakar, böylece kural reddi "kaydedilemedi" uyarısı çıkarmaz.
- iPhone uygulamasına konum izni yazısı eklendi (Info.plist `NSLocationWhenInUseUsageDescription`). Xcode ile yeniden kurulması gerekiyor; o zamana kadar uygulamada "Komite burada" çalışmayabilir.
- Telefonda denenmedi. Pusula (webkitCompassHeading) gerçek iPhone'da denenmeli.

## Sıradaki işler

- Telefonda dene: konum izni, pusula yönü (elde pusulayla karşılaştır), sesle "orsa şamandırasında rüzgâr 330, 5 knot".
- Rüzgâr okları gerçek hava modeliyle karşılaştırılabilir (istenirse).

## Asistan

- Parkur ölçümü şimdilik yalnız Parkur sekmesindeki kutudan eklenir. Ana asistana yönlendirme (`isler/`) henüz yok. Sesle eşitlik kuralı için sıradaki iş bu.
