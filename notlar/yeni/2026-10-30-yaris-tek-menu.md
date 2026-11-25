## Nerede kaldım

- Yarış yeni yapısı 2. adım: yarış sayfasındaki ve multimedyadaki iki ayrı ⋯ tek liste oldu (src/lib/raceMenu.js): Hazırlık · Sporcu · Evrak · Yolculuk · Bütçe, Gün özeti · Çekim ayarları · Gün ekle · Denemeleri sıfırla, Bilgileri düzenle, Yarışı sil. Bölümler yarış sayfasında `?sec=`, multimedya işleri multimedyada `?do=` ile açılır.
- Süre sekmesindeki "Denemeleri sıfırla" ve gün seçicideki "Gün ekle" düğmeleri ⋯ içine taşındı.
- Yarıştan önce yarış sayfasında yarışın alt çubuğu yok; uygulamanın alt çubuğu (asistan dahil) görünür (sayfa "sa-plain" olayıyla TabBar'a bildirir). Alt çubuk ilk yarış günü gelir.
- Multimedyanın ⋯ menüsünde bölümlerin kısa durumu (ör. "3 iş") yok; yarış sayfasındakinde var.

## Sıradaki işler

- 3. adım: Saha (rüzgâr + Parkur + sesle söylenen rüzgâr); tek Bugün ▾ (yarış sekmesindeki havanın gün seçicisi kalkacak).
- 4. adım: Start (Süre + Medya, Kayıt içinde). 5. adım: Sonuç.
