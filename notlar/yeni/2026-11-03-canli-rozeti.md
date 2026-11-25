## Nerede kaldım

- /canli: alt şeritteki "Canlı" ve yarışın adı kalktı (şeritte yalnız "3. yarış · Sarı" ve sınıf). Yarışın adı geri düğmesinin yanında soluk (`lv-rname`, yarış öncesi büyük başlık varken gizli).
- Sağ üstte "Canlı" rozeti (`LiveBadge`, `lv-onair`): ekrandaki yarış sürerken nabız atan nokta; 40 sn'de bir 6 sn "3. yarış · Sarı grup" yazarak açılır, kapanır (yalnız CSS animasyonu, `lv-onairw`). Yarış değişince anahtar animasyonu baştan başlatır. Yarış sürerken diğer yarışların çipleri (ProgramChips) gösterilmez; sıradaki start alt şeritte.
- Gruplar ayrı başlatma (Yayın › Süre) dün #1022'de yapıldı; ekrandaki yarış ▶ ile seçilir.
- Dikkat: `.lv-live` adı LiveHome'daki "Canlı" etiketiyle çakışıyordu, rozet `.lv-onair` olarak ayrıldı.
- Telefonda denenmedi.

## Sıradaki işler

- Yayın yönetim sayfası yeni tasarım (üst alan, Süre ve Video sekmeleri; önce örnek, onay).
- Rüzgâr / pin avantajı / parkur ekseni sadeleştirme, örnek yarış güncellemesi, /canli liste sayfası (önce örnek).
