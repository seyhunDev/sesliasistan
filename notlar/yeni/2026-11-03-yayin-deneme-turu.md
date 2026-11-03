## Nerede kaldım

- Deneme turu (Seyhun 2026-11-03 12:00 "denemeler yaparak eksikleri bul, birleştir, beğenmezsem tek tıkla geri alırım"): /canli örnek yarışın 12 adımı TV (1600×900) ve telefonda (390×844), mock verilerle tehir, genel geri, son dakika (videolu + videosuz) ekranda denendi.
- Düzeltilenler (yalnız telefon görünümü, liveScreen.css sonundaki tek blok): start çubuğu sağdan taşıyordu (1 ve 0 bayrakları kesik; `.lv-band > div { width: 100% }` + kenar boşluğu); videolu şeritte rüzgâr tablosu rüzgâr bloğunun yanında 2 sütuna sıkışıyordu (artık altında, tam genişlik); videolu üstte yarış adı ile "Yarış günü · tarih · yer" tek satırda kesiliyordu (iki satır).
- Geri alma: bu turun tamamı tek PR; GitHub'da PR › Revert.
- Kontrol edilip sorun bulunmayanlar: Başlat'ın açtığı yarış kaydı (at = planlanan start) geri sayımda start şeridini gösteriyor (#1072), tehir/genel geri/son dakika TV ve telefon, gün sonu, yarışta sıralama ve parkur.

## Sıradaki işler

- Videosuz start dizisi ekranında hâlâ rüzgâr (tahmin olabilir) ve start hattı avantajı var; videolu gibi sadeleşsin mi Seyhun'a sorulacak.
- Örnek yarış verisi (demo.js) eski: hazırlık bayrağı P (artık varsayılan U), r1/r2'de grup yok (sıradaki Mavi "3. yarış" görünüyor). Yalnız örnek.
- Yayın yönetim sayfası giriş istediği için bu ortamda tıklanarak denenemedi.
