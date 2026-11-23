## Nerede kaldım

- Antrenman sayfası (`/training/day`) kalktı (Seyhun 2026-11-23 "antrenmanın bilgi ekranı burası olacak; yarış ve start kısmını tamamen kaldırıyoruz"). Eski adres Bilgi › Yönet'e gider (`?id=` → `?ant=`).
- Yönet'te Antrenman (`src/features/bilgi/BilgiAntrenman.jsx`): soldaki Antrenman düğmesi (yarış günü değilse ya da antrenmandan gelindiyse) Yoklama (sporcular; "+ Sporcu" ortak NewAthlete, sporcu yoksa ekleme), Günlük, Start sayısı ve "Antrenman olarak kaydet". Kanal kapatılınca "Antrenman olarak kaydet?" özeti (gün, saat, katılanlar, start, tekne izi).
- Kaydet: o günün antrenman planına (yoksa açılır) `ant: { at, end, starts, crew, kanal }`; plan saati boşsa kanalın saati; kanal kaydına `plan`. Kanala katılan tekneler sporculara eşlenir (`src/lib/antKayit.js`: yelken no, tam ad, tek eşleşen ad) ve yoklamada "geldi" olur. Sonra Günlük açılır. Günlük listesinde satır: "15:10–17:05 · 6 sporcu · 4 start".
- Yönet'teki Başlat her starta açık kanalın kaydına `starts` yazar (`bilgiStore.noteStart`).
- Sesle (`isler/antrenmanSes.js`): "2 dakika başlat" (Yönet'in sayacı, 3·2·1), "sayacı bitir", "antrenmanı kaydet" (Yönet `?kaydet=1` kaydetme penceresi). Antrenman sonucu sesle ("birinci Ali …") ve antrenman yarışları kalktı (raceVoice, trainRank, antrenmanYaris, Races, TrainWind, useTrainingFlow silindi).
- Seyhun "Hepsini sil" dedi: `src/features/training/AntTemizle.jsx` ana hesapta her cihazda bir kez (açılıştan 8 sn sonra) planlardaki `races`'i, `raceLive/ant-*` belgelerini (buluttaki video/fotoğraf dosyalarıyla) ve telefondaki antrenman videolarını siler. iPhone Fotoğraflar'daki asıllar silinmez. Geri alınamaz.
- Testler: yeni testler `yaris.mjs` "Antrenman Yönet'te", "antrenmanı kaydet sesle"; yönlendirme trainVoice güncel. Telefonda denenmedi.

## Sıradaki işler

- Telefonda ve iPad'de dene: Yönet › Antrenman penceresi, Yoklama, + Sporcu, kanal kapatınca kaydetme, Günlük.
- Kaydedilen antrenmanın tekne izini günlük listesinden açma (şimdilik Yönet › Kanallar'dan).
- Velora Sailing (ayrı site) içinde sporcu ekleme istenirse o deponun sahibine sorulacak (bu oturumda o depoya erişim yok).

## Asistan

- Antrenman sesle Yönet'in sayacını yönetir; yarış sonucu komutu yok. "antrenmanı kaydet" onayı Yönet'teki pencerede.
