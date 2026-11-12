## Nerede kaldım
- Canlı ekrandan geri dönüşte takılma (Seyhun 2026-11-12, iPad; telefonda/iPad'de denenmedi). Ölçülen kök neden: `/canli` uygulamanın (`app/(app)`) dışındaydı. Yarış sayfasından ya da Yayın'dan "Canlı"ya basınca bütün uygulama kapanıyor (sağlayıcılar, ~22 Firestore dinleyicisi), geri dönünce baştan kuruluyordu. Ayrıca yarış sayfası yalnız 1 dk içinde okunan listeyi kullanıyordu: daha uzun kalınca "Yarış yükleniyor" çıkıyor, bütün yarış listesi sunucudan yeniden okunuyordu.
- Düzeltme: `app/(app)/athletes/(..)canli/[id]/page.jsx` (Next araya giren yol): /athletes altındaki sayfalardan /canli/<id>'ye geçiş uygulamanın içinde çizilir, adres aynı. Bağlantıyla ya da yenileyince herkese açık `app/canli/[id]` açılır. Yazı ortak `features/liveScreen/fonts.js`. `(app)/layout.jsx` /canli'de alt çubuğu, güncelleme notlarını, tanıtımı ve spor seçimini göstermez. `SwipeBack` /canli'de çalışmaz (InAppBack var).
- Yarış sayfası bellekteki yarışla hemen açılır. Liste 1 dk'dan eskiyse yalnız o yarış okunur (1 okuma). `saveRace` değişiklik yokken listeyi artık eskitmez; değişiklik varsa bellekteki kaydı günceller.
- Ölçüm (yerel üretim derlemesi + emülatör, 65 sn canlıda kaldıktan sonra geri): önce "Yarış yükleniyor" + 22 dinleyici + bütün liste; sonra yükleniyor yok, 4 dinleyici, 1 belge.

## Sıradaki işler
0. iPad'de dene: yarış sayfası › Canlı › kenardan geri kaydır; yarış sayfası beklemeden gelmeli, alt çubuk geri dönmeli. Canlı ekranın görünümü önceki gibi olmalı.
1. /canli/<id> içindeki başka yarışa geçiş bağlantıları ve "kaldırıldı" yönlendirmesi (/canli listesi) hâlâ uygulamanın dışına çıkabilir; gerekirse sonra bakılır.
