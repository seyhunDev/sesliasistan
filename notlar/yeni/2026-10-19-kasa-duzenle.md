## Nerede kaldım
- Hesaplar › Kasa ve Kişisel: elle yazılan kayda dokununca "Düzenle" var; aynı form değerleri dolu açılır (ad, tür, tutar, tarih, not, giriş/çıkış). Fiş/fatura ödemesinden ve bankadan nakite çevirmeden gelen kayıtlar kendi yerinden düzelir (`cashbook.canEditCash`), aidat kaydı Aidatlar'dan.
- Sesle düzeltme: "kasadaki 200 liralık çıkışın türünü yakıt yap", "Ahmet'in kasa kaydının adını Mehmet olarak değiştir", "son kasa çıkışının türünü malzeme yap" (`assistMore.cashEditCommand`, `isler/para.js` cashCmd). Hedef tutar/eski ad/eski tür/yönle bulunur, söylenmezse en son kayıt. Onay sormaz (para hareketi değil).
- Sesle "200 lira kasa çıkışı ekle" artık nota "Kasa Çıkışı" yazmıyor.
- Telefonda denenmedi.

## Sıradaki işler
- Banka/Kasa sekmelerinde tek ekleme düzeni (giriş/çıkış) örneği Seyhun'un onayında.
