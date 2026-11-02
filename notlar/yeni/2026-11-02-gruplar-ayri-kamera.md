## Nerede kaldım

- Yayın › Süre: her grup kendi satırında ayrı başlar ve biter (Sarı yarışta iken Mavi'nin satırındaki "Başlat" ile Mavi'nin geri sayımı başlar; yarışta olan grup satırındaki "Bitti" ile biter). Başka grubun geri sayımı sürerken yeni geri sayım başlamaz.
- Satırdaki ▶ o yarışı canlı ekrana alır (raceLive.onAir.sid); tekrar dokununca ya da üstteki pembe "Ekranda" kartındaki "Otomatik" ile en son başlayana döner. /api/canli `cur` = onAir, yoksa eskisi gibi.
- Kameralar bölümü: kaynaklar (şimdilik Kamera 1 = canlı yayın bağlantısı, Drone 1 = drone bağlantısı; drone sohbeti stream.sources listesini ekleyince o liste) ve çektikleri gruplar. Dokununca "Kamera X hangi grupları çekiyor?" penceresi. Kayıt raceLive.camBy { "Optimist|Sarı": "c1" }.
- Ekranda "Canlı yayın" gösterilirken ekrandaki yarışın grubunun kamerası varsa video o kameraya geçer (lib/raceCams.js liveUrl). Drone ya da belli bir kaynak elle seçildiyse o kalır.
- Canlı ekranda sayaç başka grubun startını sayıyorsa ekrandaki yarışın saati sayaçtan okunmaz.
- Testler: yaris.mjs "gruplar ayrı başlar…", test:yaris-ekran "Yayın" (Bahar Kupası r2), test:canli-ekran yarista (Sarı yarışta, Mavi geri sayımda, ▶ Sarı).
- Telefonda denenmedi.

## Sıradaki işler

- Rüzgâr / pin avantajı / parkur ekseni gösterimini sadeleştir; örnek yarışa (/canli/ornek) yeni özellikleri ekle (örnek tasarım, onay).
- /canli açık yarışlar sayfası yeni tasarım (örnek, onay).
- Drone sohbeti stream.sources'u ekleyince Kameralar listesi kendiliğinden o kaynakları gösterir; "Yayında" şimdilik bağlantı girildi mi demek.
