## Nerede kaldım

- Canlı ekranda rüzgâr grafiği bazı yarışlarda hiç gelmiyordu (Seyhun 2026-11-02 "grafik gelmedi"). Sebebi: /api/canli tahmini yalnız yarışın `spot` ya da `weather.place` konumu kayıtlıysa alıyordu.
- Artık bu konum yoksa yarış sayfasının hava sekmesindeki gibi `racePlace` kullanılıyor: önce Çevre'deki yarış alanı, sonra ilçe/il adından yer bulunuyor. Sonuç 30 dk bellekte tutuluyor.
- Program sekmesi yalnız günün yarışı varsa (Yayın'da oluşturulmuş bekleyen yarış ya da bugünkü start) görünüyor.

## Sıradaki işler

- Seyhun'un yarışında grafik geldi mi bak.
