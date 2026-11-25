# Yayın sayfası: herkese açık ekranın yönetimi tek yerde (2026-11-01)

## Nerede kaldım
- Seyhun: "çok karıştırdık, temiz kuralım; herkese açık multimedyayı ayrı sayfada yöneteceğiz: süre, parkur/rüzgâr, canlı yayın; yayın yoksa telefondan video (dikey/yatay)". Örnek onaylandı (project-files/samandira-donus/yayin-yonetim/ornek.png).
- Yeni sayfa `/athletes/races/<id>/yayin` (yalnız ana hesap): `src/features/broadcast/BroadcastPage.jsx`, `broadcastStore.js` (video eni boyu, telefondan seçilen videoyu yükleyip ekrana verme).
  - Lacivert üstte start sayacı (`Countdown dark mode="start"`, `useRaceFlow`, `useLiveSync`: sayaç diğer cihazlara ve herkese açık sayfaya gider; 0'da yarış açılır), Linki kopyala / Ekranı aç.
  - Ekranda: canlı yayın linki (geçerliyse kendiliğinden seçilir), bu yarışın videoları (Dikey/Yatay · süre · saat; "Ekranda" işareti), "Telefondan video seç" (yükler ve hemen gösterir), Ekrandan kaldır / Göster.
  - Parkur ve rüzgâr: son rüzgâr, parkur kartı (Parkur sekmesiyle aynı çizim, `course/{gün}`), Rüzgâr / Parkur ölçümü (CourseTab `AddSheet` artık dışa açık, `pick0`).
  - Dönüşler: sayacın yarışının dönüşleri, Kayıt listesi (EntriesView tam ekran), Sesle gir (RoundsScreen).
- Kaldırılanlar: yarış alt çubuğundaki Canlı sekmesi ve `LiveScreenSheet.jsx`; "Yarışı yönet" ve ⋯ › Yayın (eski adı Canlı ekran) yeni sayfaya gider.
- Video eni boyu kayda yazılır (`cleanMedia` w/h); herkese açık sayfa dikey videoyu dikey kutuda (9:16) gösterir, eskilerde oynarken ölçer (`lv-screen.tall`).
- Testler: elle.mjs "yayın sayfası", yaris.mjs "video eni boyu". Telefonda denenmedi.

## Sıradaki işler
- Yayın sayfasında "Telefondan video seç" yalnız yükleyip gösterir; MediaTab'daki yerel kopya / küçük resim kuyruğu burada yok (büyük video küçültülür).
- Genel sıralamada "Kulübüm" süzgeci yapılmadı.
