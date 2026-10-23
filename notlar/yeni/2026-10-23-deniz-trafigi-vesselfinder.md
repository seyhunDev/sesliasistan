## Nerede kaldım
- aisstream Dikili çevresinden sinyal vermedi; Seyhun "VesselFinder'ı kullanalım" dedi (2026-10-23). Deniz trafiği sayfasındaki harita artık VesselFinder'ın ücretsiz gömülü haritası (`public/vf.html` + `src/features/sea/VesselMap.jsx`, iframe). Gemileri VesselFinder çizer ve yeniler; Büyüt / Küçült duruyor.
- Teknem ve listedeki satır haritayı o noktada (yakınlık 13) yeniden açar. Telefonun konum noktası VesselFinder haritasında görünmez.
- Alttaki aisstream listesi yalnız gemi varsa görünür (boş liste haritayla çelişmesin). Sesli cevaplar hâlâ aisstream verisinden.
- Ana sayfa kartı kendi hafif haritamızla kaldı (VesselFinder'ı ana sayfaya koymak ağır; 0 gemide alt yazı "Dikili").

## Sıradaki işler
- Telefonda ve iPhone uygulamasında (Capacitor) VesselFinder haritasının açıldığını görmek gerek; bulut ortamı vesselfinder.com'a ulaşamadı.
- Sesli asistan "yanaşan gemi var mı" sorusunu VesselFinder verisiyle cevaplayamaz (gömülü harita veri vermez); veri için ücretli API ya da kulübe AIS alıcısı gerekir.
- Ekran testi `npm run test:asistan-ekran` main'de de "Senaryolar › çalıştırma" adımında ara ara düşüyor (Gönder düğmesi bekleme); bu işle ilgisiz.
