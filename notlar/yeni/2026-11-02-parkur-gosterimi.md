## Nerede kaldım

- **Rüzgâr:** Canlı ekrandaki rüzgâr hücresinde artık "oynuyor" yazmıyor. Hız "knot" olarak yazılıyor, örneğin "B · 8 knot". Derece aralığı "280–300°" olarak kaldı.
- **Parkur gösterimi** (Seyhun 2026-11-02):
  - Yarış öncesinde (bekleme ya da start'a geri sayım) her 30 sn'nin ilk 12 sn'sinde parkur kendiliğinden çıkıyor.
  - Yayın › Parkur › "Ekranda parkur" bölümünde "Otomatik açık/kapalı" ile bu kapatılabiliyor. "Parkuru göster" düğmesi parkuru 15 sn gösteriyor.
  - Veri `raceLive.courseShow` alanında: `{ auto, at }`. Okuyan ve yazanlar `cleanCourseShow`, `courseShowing` (lib/raceRounds.js) ve `saveCourseShow`; /api/canli da bu alanı veriyor.
- **Parkur görünümü:**
  - Kart yok, parkur sağa alındı (left 40vw).
  - Gösterilirken arka plan (video ya da deniz/fotoğraf) bulanıklaşıyor, ortadaki sayaç gizleniyor. Parkur kapanınca ikisi de geri geliyor.
  - Telefonda parkur bütün ekranın önüne çıkıyor; alt şerit ve listeler o sırada gizleniyor.

## Sıradaki işler

- Telefonda ve büyük ekranda denenmeli.
