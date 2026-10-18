## Nerede kaldım

- Antrenman sayfası (Seyhun: "antrenman sayfası tasarlayalım… geri sayım… yarış sıralaması… yelken yarış kuralları"; örnekler /mnt/project-files/antrenman-sayfasi/; telefonda denenmedi): `/training/day?id=<plan>` (id yoksa bugünün antrenmanı; plan yoksa "Ekle"). Açılış: antrenman planı penceresinde "Antrenman sayfası" satırı, Antrenman günlüğü sayfasında "Bugün" düğmesi, sesle "antrenman sayfasını aç / geri sayımı aç" (nav.js `trainingDay`).
- Sayaç (`src/features/training/Countdown.jsx`): 2/5/10 dk + Ayarla (dakika/saniye), +30 sn, +1 dk, Sıfırla; son 5 sn her saniye kısa bip, 0'da uzun bip (WebAudio), sonra "Startan beri" ileri sayar. Bitiş zamanı telefonda (`sa-sayac`), Wake Lock ile ekran açık; iPhone arka planda ses çalmaz.
- Yoklama ve Günlük pencerede, mevcut ekranların aynısı: yoklama `src/features/athletes/RollPanel.jsx` (Yoklama sayfası da bunu kullanır), günlük `TrainingLog` (`startOpen`).
- Yarışlar (`src/features/training/Races.jsx`, puanlama `src/lib/raceScore.js`, plan kaydının `races` alanı, kural değişikliği yok): günde istenen kadar yarış, ad değiştirilir; bekleyen sporcunun adına dokun → sıradaki yer; sıradakine dokun → DNF/DNS/BFD/OCS/RET/DSQ, Yukarı/Aşağı, Sıradan çıkar. Sayaç 0'a ulaştıysa ilk bitişte start sayılır, süreler yazılır; sayaçsız da çalışır. Testler `npm run test:yaris` (Antrenman yarışları).

## Asistan

- Antrenman yarışı puanı (RRS Ek A düşük puan): katılan = o günün yoklamasında "geldi" + yarışa eklenen herkes; yarışa eklenmeyen katılan DNC; tüm kodlar katılan + 1 puan; 4 yarış ve üstünde herkesin en kötü sonucu atılır (Seyhun'a önerildi, cevap gelmedi, varsayılan); eşitlik A8 (iyi derece, sonra son yarış).

## Sıradaki işler

0. Telefonda dene: sayaç bipleri (sessiz modda çalmayabilir), ekran açık kalması, kilitleyip dönünce süre; yarış girip puan durumunu kontrol et.
1. Ses eşliği: "5 dakika sayaç kur", "Ali birinci, Ayşe ikinci", "Can DNF" sesle (isler/ görev dosyası + yönlendirme testi).
2. Ana sayfada bugünkü antrenmana dokununca antrenman sayfası açılsın mı, Ana sayfa sohbetiyle konuşulacak.
