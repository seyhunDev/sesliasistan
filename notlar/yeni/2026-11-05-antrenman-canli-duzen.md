## Nerede kaldım
- Antrenman sayfası (/training/day) canlı ekranın düzeninde (Seyhun 2026-11-05, örnek /mnt/project-files/antrenman-canli/ornek.png onaylı). Arkada görüntü (Kamera'da seçilen YouTube kaynağı, Video'da oynatılan kendi videon, yoksa deniz), üstte süre kartı (geri, antrenman/yarış adı, büyük sayaç; sağda Yoklama ve Günlük), altta tek sıra Kamera · Parkur · Rüzgâr · Sıralama · Video · Start ve asistan küresi. Panel çubuktan yukarı açılır, aynı düğme kapatır, boş yere dokununca kapanır.
- Start: 5·4·2·1 dk, Kimler (yoklama), Parkur, "Yarış olarak say" (race.cnt; seçim telefonda `sa-ant-yaris`, sesle başlatmada da), Start ver. Geri sayımda −1/+1 dk, İptal. Startan sonra Bitiren kim? kareleri, DNF (sıradaki dokunuş), Sesle söyle, Yarışı bitir.
- Sıralama: Bugün (günün puanı; startlara dokununca yarış sayılır/sayılmaz) ve Genel (ayın yarış sayılan startları, `src/lib/trainRank.js` monthRank; gelmediği yarış DNC). Düzelt = eski Sonuçlar penceresi (Races).
- Video: canlı ekranın Video paneli aynen (`liveScreen/LiveVideos`, raceId ant-<plan>): yalnız telefonda, start start galeri, Düzenle, YouTube'a ekle → Kamera kaynakları. Eski buluttaki antrenman videoları Medya sayfasında duruyor.
- Parkur: `raceMedia/CourseTab` (yeni proplar wx=false, types = ILCA · Trapez, big = "Büyük göster" tam ekran kart). Rüzgâr: ortak RaceWx.
- Kızlar sekmesi yok: kulübün sporcu kaydında cinsiyet yok.

## Sıradaki işler
- Telefonda denenmedi. Kamera kaynağı yalnız YouTube linki (canlıdaki gibi). İstenirse sporcuya cinsiyet alanı eklenip Kızlar sekmesi açılır.
