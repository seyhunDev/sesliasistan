## Nerede kaldım

- Mail ekleri artık hiç saklanmıyor ve eskiler sunucuda siliniyor (Seyhun: "mail eklerini saklamaya gerek yok, var olanları da silelim; 6 silindi diyor, takılıyor"; telefonda denenmedi). Takılmanın nedeni telefonun büyük mail belgelerini ve Storage dosyalarını indirmesiydi. Ayarlar › "Mail eklerini sil" (yalnız ana hesap, Sürüm'ün altında): önce Storage'daki ekler (`mailFiles/`, mailde `rawFiles`), sonra maillerin içindeki ham ekler (`raw`) silinir; tablosu olmayan mailde önce tablo okunup yazılır. İş sunucuda yapılır (`/api/mail/clean`, kullanıcının kendi Firebase anahtarıyla; çağrı başına ~7 sn, telefon bitene kadar tekrar çağırır, ilerleme "N silindi"); durursa yeniden dokununca kaldığı yerden sürer. Yeni gelen mailde ek tablo okunduktan sonra hep silinir (Storage'a konmaz). "Telefondaki veriyi taşı"dan mail adımı çıkarıldı.

## Sıradaki işler

- Ayarlar › Mail eklerini sil'e dokun; Storage ve maillerden silinen sayılar gelmeli. Durursa yazan hatayı yaz. Firebase › Storage'da `mailFiles` klasörü boşalmalı.
