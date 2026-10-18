## Nerede kaldım
- Hava grafiğine gerçekleşen (ölçülen) rüzgâr eklendi (Seyhun "Örnekteki gibi" seçti, örnek /mnt/project-files/hava/olculen-tahmin-ornek.png). Geçmiş saatlerde ölçülen mavi ve önde, o saatlerin tahmini soluk kesik çizgi, son ölçümden sonrası her zamanki tahmin. Seçili saat satırı "15 kn ölçülen · tahmin 12"; grafiğin altında "Ölçüm: Dikili istasyonu · 0,4 km · son 17:50" ya da "Yakında ölçüm istasyonu yok (en yakını 46 km); yalnız tahmin".
- Kaynak: Meteoroloji'nin Dikili istasyonu (WMO 17180) SYNOP raporları, OGIMET üzerinden (`/api/wind-obs`, `src/lib/windObs.js`, telefonda `useWindObs`). Ücretsiz, 1-3 saat gecikmeli; sunucu 15 dk saklar. Yalnız seçilen yere 10 km içindeki istasyon kullanılır; istasyon listesi elle tutulur (şimdilik yalnız Dikili).
- DOĞRULANMADI: bulut ortamı OGIMET'e bağlanamadı. Canlıda veri gelmezse grafik eskisi gibi yalnız tahmin gösterir ("henüz veri yok"). Dikili istasyonunun saatlik mi 3 saatlik mi rapor verdiği de canlıda görülecek.
- Bağlı yerler: hava penceresi ve hava kartı (`at={getPlace()}`). Multimedya Hava sekmesi `DayDetail`'e `at={{ lat, lon }}` geçerse orada da çıkar (o sohbetin dosyası). Ana sayfa küçük grafiğinde yok.
- Telefonda denenmedi.

## Sıradaki işler
- Canlıda Dikili verisinin geldiğini doğrula; gelmezse OGIMET'in Netlify'dan erişimini ya da Meteostat'ı dene.
- Ölçülen ile tahmin farkından sonraki saatlerin tahminini düzeltme (Seyhun'un ikinci adımı).
- Başka yarış yerleri için istasyon ekleme (yalnız yeri ve numarası doğrulananlar); Holfuy/Windguru istasyonları sahibinden şifre ister.

## Tasarım
- Ölçülen rüzgâr rengi mavi (#3f74ad, `OBS`), tahmin yeşil. Uzak istasyonun verisi asla gösterilmez.
