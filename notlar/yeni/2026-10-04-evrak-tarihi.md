## Nerede kaldım

- Yarış evrakında tek tarih (Seyhun: "evrak tarihleri hepsinde farklı mı, neden oluşturulma tarihini hepsinde almıyoruz"; telefonda denenmedi): önceden okul izni, kafile onayı, veli izni yarışın "Yazı tarihi"ni (yarışın açıldığı gün) kullanıyordu; kulüp izin yazısı ve otel izni ayrıca "Kulüp yazı tarihi" alabiliyordu; TYF antrenör ve katılım formlarındaki "Belge Basım Zamanı" her hazırlamada o anın saatiydi (Yenile'de değişiyordu). Artık tüm belgeler tek "Evrak tarihi"ni (`letterDate`) kullanır: yeni yarışta boş gelir, belgeler ilk hazırlandığında o gün yazılır ve kaydedilir (`docsAt` ilk hazırlama anı), Yenile'de değişmez; Bilgiler › Tarihler'den elle değiştirilebilir. TYF basım zamanı bu tarihten (saat yalnız tarih ilk hazırlama günüyse; `stamp(r)`, raceDocs.js). Kulüp izin yazısındaki ayrı tarih alanı kaldırıldı, eski `clubDate` artık sayılmaz (`clubInfo`). Eski yarışlarda evrak tarihi yarışın açıldığı gün olarak kalır; gerekirse elle değiştirilir. Testi `test:yaris` › "Yarış evrakı" › "tek evrak tarihi".

## Sıradaki işler

- Evrak tarihini dene: yeni bir yarışta Bilgiler › Evrak tarihi boş olmalı; Belgeleri hazırla, sonra bugünün tarihi yazılmalı; tüm belgelerde (TYF basım zamanı dahil) aynı tarih var mı bak; Yenile'de tarih değişmemeli.
