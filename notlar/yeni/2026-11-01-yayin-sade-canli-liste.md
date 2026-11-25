# Yayın sayfası sade; /canli listesinde Canlı; çökme ekranı canlıya döner (2026-11-01)

## Nerede kaldım
- Seyhun: "çok fazla buton, yanlışlıkla tıklanmasın; sonuç PDF'i başka yerde; canlı sayfada yarış varsa anlık gösterilsin; hata ekranı ana sayfaya değil canlıya dönsün; yer seçiliyken rüzgâr grafiği gelmiyor."
- Yayın: Linki kopyala, Ekranı aç, Sonuç PDF'i, Kayıt listesi, Bugün yarış yok, Günü bitir (bir daha sorar) sağ üst ⋯ menüsünde (`Sheet`); listede yalnız Start ekle + Tehir; Dönüşler'de yalnız Sesle gir; Sonuçlar bölümü kalktı.
- Yeni sayfa `/athletes/races/<id>/sonuclar` (ResultsTab); yarış sayfasının Sonuçlar satırı oraya gider ("PDF yükle").
- `/canli` listesi 20 sn'de bir yenilenir; `/api/canli` listesi `live` (süren start), `today`, `status` döner → "Canlı" / "Bugün" / "Ertelendi" etiketi.
- Çökme ekranı `/canli…` altında "Canlı yarışlara dön" (/canli); `src/app/canli/error.jsx`.
- "Sayfa bulunamadı/açılamadı" hatası yerelde tekrarlanamadı (liste → yarış geçişi çalışıyor); büyük olasılıkla art arda yayınlar sırasında eski sayfa + yeni parça (chunk) uyuşmazlığı. Rüzgâr grafiği: #951 yayını henüz çıkmamış olabilir; yarışta `spot` ya da `weather.place` gerekli.

## Sıradaki işler
- Seyhun telefonda yeniden dener; hata sürerse "Ayrıntı" metnini ister.

## Ek (2026-11-02)
- Sıradaki start artık Başlat düğmesinin içinde: "Başlat · Optimist · Mavi" / "Başlat · Start seçilmedi" (`Countdown startText`); üstteki "Sıradaki" satırı ve beklerken "Start sayacı" başlığı kalktı (`noHead`). Start sonrası sayaç başlığında sınıf · grup · yarış.

## Ek 2 (2026-11-02): bekleme ekranında parkur
- Seyhun: start saatine geri sayım sürerken parkur kurulunca saat animasyonla bir tarafa kaysın, parkur büyük ve kartsız gösterilsin; sola yaslı ve geniş ekranda yanlarda boşluk olmasın.
- Yapılan: `Waiting` içinde parkur varsa (`course.obs`) `lv-waitgrid course` iki sütun: sol sayaç `lv-slide` ile kayar, sağda `CourseFlat` (kartsız SVG, `lv-rise`, yükseklik `min(78vh,60vw)`). Yayın/sıralama varsa alta iner. Telefonda alt alta, parkur tam genişlik. Hareket azaltma tercihinde animasyon yok.
- Test: yaris.mjs "bekleme ekranında parkur kurulunca sayaç yana kayar…". Örnekler `/mnt/project-files/samandira-donus/yayin3/parkur-{pc,laptop,telefon}.png`.
