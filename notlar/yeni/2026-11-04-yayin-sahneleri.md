## Nerede kaldım

- Canlı yayın ekranı (/canli/<yarış>) 6 sahneye geçti (Seyhun 2026-11-04 "hepsini yap"; örnekler https://claude.ai/artifact/MWmT63Sb1mmtJ4s6izg82N):
  - 01 Yarış öncesi: ortada tek kart, Süre · Program · Rüzgâr · Sporcular 10 sn'de bir sırayla; start dizisi, tehir, abandone ve genel geride yalnız Süre. Bayrak yok (İşaret kartı yalnız Yayın'dan çekilen bayrakta, Süre'nin altında).
  - 02 Yarışta (video varken yarış öncesi de): sol üstte tek kart; start'a kalan / geri sayımda o an çekili bayrak / geçen süre + OCS; altında tek satır rüzgâr; şamandıra dönüşünden sonra 60 sn sağ üstte ilk 3. Rota şeridi yok.
  - 03 Genel sıralama (ilk 10, sınıf sınıf 15 sn), yarış yeni bittiyse önce yarış sonucu; 04 Tekrar (Yayın'da kayıt ekrandayken); 05 Parkur (Ekranda göster › Parkur ya da elle); 06 Sıradaki yarış.
  - Her sahnede sağ üstte Canlı (tekrarda beyaz Tekrar) + saat, sağ altta yarışın adı + Velora.
- Otomatik seçim `sceneAuto` (LiveScreen.jsx): kayıt → 04, parkur elle → 05, gün bitti ve yarış bitti → 03 ↔ 06 (15 sn), yarışta → 02, yarış öncesi videolu → 02, videosuz → 01.
- Elle seçim alanı hazır: `courseShow.scene` ("" otomatik, "01"…"06"; lib/raceRounds.js `SCENES`, `cleanCourseShow`). Yayın sayfasında düğmesi henüz yok.
- Eski Grafik düzeni (sol sütun, çekmece, G* kartları) kaldırıldı; CSS `src/features/liveScreen/sahne.css`.

## Sıradaki işler

- Yayın › Video sekmesi "Ekran" olacak: üstte ekrandaki sahne, 6 sahne kutusu (dokununca o sahneyi ekrana al), Otomatik geçiş anahtarı, her sahneye önceden video seçimi (bulanık foto, Drone, grubun kamerası, tekneler, kayıt). Örnek: artifact'taki "Yönetim" görseli.
- 04 Tekrar'da tekne izleri yalnız tekne konumu kayıtlıysa çizilebilir; şimdilik kart + video.
- Telefonda denenmedi.

## Tasarım

- Yayın ekranı tek dil: lacivert panel, tek mavi vurgu (#2f7bff), kırmızı yalnız Canlı, sarı yalnız uyarı/sağanak. Rüzgâr eski tasarım (halkalı ok, büyük kn, yön sağda, sarı sağanak, beklenen grafik).
