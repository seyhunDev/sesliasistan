## Nerede kaldım
- Planlar, Takvim ve yarış bağı tek kurala bağlandı (Seyhun 2026-11-05: "plana tıklıyorum, yarışa götürmesi gerekiyor, plana götürüyor"). Telefonda denenmedi.
  - TEK KURAL (`raceLinks.planRaceHref`, kanca `features/athletes/usePlanOpen.js`): yarışa bağlı plan (yarışın kendi planı ve "Yarış adı: son tarih" planları) Planlar, Takvim, ana sayfa Sıradaki plan, günün listesi ve gün penceresinde dokununca YARIŞ SAYFASINI açar; diğer planlar planı açar. Sporcu yetkisi olmayan (çalışan) planı görür. Yarışın planını düzenlemek: yarış sayfası › Plan satırı ya da ana sayfa satırındaki "Plan" düğmesi.
  - Yarıştan eklenen plan artık yarışın kimliğini taşır (`raceId`; addRacePlan, addNoticePlans, saveDrafts). Önceden bağ yalnız adla kuruluyordu: yarışın adı değişince bağ kopuyor, "Plana ekle" yeniden çıkıp ikinci plan açılıyordu; geçen yılın aynı adlı planı bu yılın yarışına sayılıyordu (artık adla eşleşen plan yarışa 200 günden uzaksa sayılmaz).
  - Yarış sayfası açılınca eski planlara `raceId` yazılır; yarışın adı ya da tarihi değişince planı (ad, gün aralığı) ve son tarih planlarının adı kendiliğinden eşitlenir (RaceEditor `onSyncPlan`, `racePlanSync`; yazarken durunca 1,5 sn sonra). Yarışın planının günleri yarıştan gelir.
  - Çok günlü plan (ör. 3 günlük yarış) ana sayfada yalnız ilk gününde görünüyordu; artık gün listesinde, gün penceresinde ve hafta şeridi noktalarında her gününde (saat yalnız ilk gün; `agenda.onDay`, `timeOn`). Takvim ve Planlar zaten doğruydu.
  - Ana sayfa satırında yarış planına dokunmak yarışı açtığı için "Yarış sayfası" düğmesi yerine "Plan" düğmesi var; son tarihte "Yapıldı" kaldı.
  - Test: `test:yaris` › Plan ve yarış bağı (5).

## Sıradaki işler
0. Telefonda: Planlar, Takvim ve ana sayfada bir yarış planına dokun, yarış sayfası açılmalı; yarış sayfasında adı değiştir, Planlar'da plan adı da değişmeli; 3 günlük yarışın 2. gününde ana sayfa listesinde yarış görünmeli.
- Asistan kartındaki plan (show plan) hâlâ planı açar; istenirse aynı kural oraya da.
