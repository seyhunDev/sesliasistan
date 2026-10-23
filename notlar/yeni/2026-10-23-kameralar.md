## Nerede kaldım

- Yeni sayfa Kameralar (`/cams`): halka açık canlı kameralar, Windy Webcams API v3 ücretsiz katmanı (seçilen yerin 100 km çevresi, en çok 50). Ana sayfada yok; Tümü › Kulüp › Kameralar (sporcu/veli hariç).
- Düzen (Seyhun onayladı, örnek /mnt/project-files/kameralar/ornek.png): lacivertte en yakın kamera büyük, altta 6 kamera, kalanı "Daha fazla". Kameraya dokununca Windy oynatıcısı ve "Windy'de aç". Sağ üstteki yer düğmesi: arama (Open-Meteo, yurt dışı da), Konumum, Dikili, Ayvalık, Bergama, Foça, İzmir, Midilli.
- Sunucu `/api/cams` anahtarı Netlify `WINDY_WEBCAMS_KEY`'den okur (telefona gitmez), aynı yeri 5 dk bellekte tutar. Anahtar Windy'de "Webcams API", alan kısıtı boş, proje https://sesliasistan.netlify.app.
- Ücretsiz katman şartları: düşük çözünürlük, görüntü bağlantıları ~10 dk geçerli, her kamera Windy'ye bağlanır, sayfada "Kameralar: Windy.com" yazar.
- Sesle: "kameraları aç", "Ayvalık kameralarını aç", "Midilli'deki kameralar" (yol `cams`, isler/kamera.js). Tekil "kamerayı aç" hâlâ fiş kamerası.
- Dikili'nin kendisinde herkese açık kamera bulunamadı; İzmir Büyükşehir kent kameralarının açık API'si yok.
- Bulutta Windy'ye erişilemedi: gerçek kamera listesi denenmedi, ekran testi taklit veriyle geçti. Telefonda denenmedi.

## Sıradaki işler

- Anahtar Netlify'a eklenince telefonda: Dikili çevresinde kaç kamera çıkıyor, oynatıcı pencerede açılıyor mu.
- Kamera az çıkarsa yarıçapı (lib/cams.js CAMS_RADIUS) büyütmek.
