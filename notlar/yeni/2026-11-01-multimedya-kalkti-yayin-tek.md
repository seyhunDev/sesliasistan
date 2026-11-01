# Multimedya sayfası kalktı, yarış yönetimi tek Yayın sayfasında (2026-11-01)

## Nerede kaldım
- Seyhun: "yarışın multimedyasını kaldır, tek bu yayın olanı kullanacağız; Yayın düğmesi her yarışın ana sayfasında; orada yarış seçilir (Mavi grup 1. yarış, Altın grup 5. yarış…), süresi, rüzgârı, parkuru, neticeleri girilir; genel sıralama PDF yüklenince; boşken gösterimler de güzel olsun".
- Yarış sayfası yarış günü artık multimedyaya atlamıyor, alt çubuk sekmeleri (Saha · Start · Sonuç) kalktı; "Yayına git" düğmesi (yarıştan önce üstte, yarış günü RaceDayTop'ta, biten yarışta Sonuçlar satırında) Yayın sayfasına gider. Yarış listesi "Yayın", ana sayfa özeti "Yayını aç", ana sayfa yarış şeridi ve asistan sayacı da `/yayin`'a bağlı (sayaç sahibi yol değişti).
- `/athletes/races/<id>/media` rotası duruyor ama bağlantısı yok (Medya kitaplığı fotoğraf/video için oraya gider); ⋯ › Çekim ayarları / Gün ekle / Denemeleri sıfırla hâlâ o sayfada.
- Yayın sayfası: üstte grup çipleri (sıradaki startın grubu; Başlat'ta `rounds[start].grp` yazılır; sayaç sürerken onun yarışının grubu değiştirilir), "Yarışlar" listesi (günün startları, seçileni Dönüşler ve Sesle gir kullanır; `RoundsScreen startId`), en altta "Sonuçlar" (ResultsTab: sonuç PDF'i yükleme, genel sıralama).
- Herkese açık sayfa boş durumlar: "Start bekleniyor", "Rüzgâr henüz girilmedi", "Parkur ölçümü girilince burada çizilir", "İlk şamandıra dönüşüyle sıralama burada başlar", Genel sıralama kartı "Yarışlar bittikçe geçici, resmî sonuç yüklenince kesin".
- Testler elle.mjs güncellendi (TabDock yok, media yönlendirmesi yok). Telefonda denenmedi.

## Sıradaki işler
- Multimedya sayfası dosyaları (`src/features/raceMedia/RaceMedia.jsx`, TimerTab, MediaTab, CourseTab) duruyor; Yayın sayfası onların parçalarını kullanıyor (Countdown, useRaceFlow, useLiveSync, CourseTab AddSheet, ResultsTab). Tamamen silmek için ⋯ işleri ve Medya kitaplığı bağlantısı Yayın'a taşınmalı.
- Genel sıralamada "Kulübüm" süzgeci yapılmadı.

## Tasarım
- Yarış sayfası yarış günü de yarış sayfasıdır; yönetim tek düğmeyle Yayın sayfasında.
