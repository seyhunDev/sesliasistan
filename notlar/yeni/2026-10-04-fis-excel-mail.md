## Nerede kaldım
- Fiş Excel'ini mail atma (Seyhun: "bu Excel'i mail atabilmeliyim"; telefonda denenmedi): Fişler sayfasında Excel düğmesinin yanında zarf düğmesi. Gmail betiği kurulu ana hesapta "Kime gönderilsin?" açılır (Kendime + kayıtlı adresler, yeni adres eklenir; yarış evrakıyla aynı `MailTo`, `mailToMe`, `users/{uid}.mailTo`); ekrandaki filtreye göre hazırlanan `fisler-<ay>.xlsx` outbox'a bırakılır, betik 5 dakika içinde gönderir. Konu "Fişler · <ay>", metinde belge sayısı, toplam ve KDV. Betik yoksa (ya da çalışan hesabında) telefonun paylaşım menüsü açılır, Mail seçilir; paylaşım desteklenmezse dosya iner. Muhasebeciye başka adrese göndermek için betik sürümü 2 gerekir (Mail ayarlarından yeniden kopyala, `kur`). Kural değişikliği yok.

## Sıradaki işler
0. Fiş Excel'ini mail at: Fişler › zarf düğmesi › muhasebecinin adresini ekle › Gönder; birkaç dakika içinde ekli mail gitmeli. "Betiği yeniden kopyala" uyarısı çıkarsa Mail ayarlarından kodu kopyalayıp `kur`'u çalıştır.
