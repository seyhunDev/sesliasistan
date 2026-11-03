## Nerede kaldım

- Yayın yönetim sayfası yeni tasarım (Seyhun 2026-11-03, örnek yayin-tasarim/yonetim/ornek-A-B-video.png, A seçildi): büyük sayaç ve başlık kalktı; üstte ince çubuk (geri, yarış adı, YAYINDA, ⋯), hemen altında sekmeler.
- Süre sekmesi: her grubun satırında kendi süresi ve düğmesi. Geri sayımdaki grup pembe süre + Dur / Devam; start sonrası yarışta süre + Bitti; sıradaki grupta 5·4·2·1 dk seçimi + Başlat (`chooseDur`, Countdown.jsx). Satıra dokununca −1 dk / Eşitle / +1 dk / İptal (geri sayımda), Abandone (start sonrası). Büyük `Countdown` bileşeni Yayın'dan kalktı (başka sayfalarda duruyor).
- Video sekmesi: tek önizleme + "Ekranda: …" satırı; kaynaklar tek liste (küçük görüntü + ad + Yayında); Ekranda yazı ve Ekranda göster satıra dokununca açılır.
- Yayın ekran testine (yaris-ekran) satırdan başlat/dur/devam ve video sekmesi kontrolü eklendi (21/21).

## Sıradaki işler

- /canli yarış öncesi videosuz ekran: program, rüzgâr, geri sayım yerleşimi yeni tasarım (örnek, onay); videolu yarış öncesi kartta yarış adı tekrarı kalkacak; yarış adı geri düğmesinin hizası.
- Rüzgâr / pin avantajı / parkur ekseni sadeleştirme, /canli liste sayfası.
