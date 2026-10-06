## Nerede kaldım

- Envanter hareketleri silinebiliyor (Seyhun: "deneme amaçlı yaptığım ve sildiğim şeyler hareketlerde duruyor, onları silebilmem lazım"; telefonda denenmedi): Envanter › Hareketler'de her satırın sağında × düğmesi; onay sorulur ("Yalnız kayıt silinir, ürünlerin adedi değişmez"). Envanterde artık olmayan ürünlerin hareketi varsa listenin üstünde "Silinen ürünlerin hareketlerini temizle (N)" düğmesi hepsini birden siler (numarası olan harekette numarayla, olmayanda adla bakılır). Hareketler yalnız geçmiş kaydıdır, silmek stoku değiştirmez. Hareketlerin kimliği olmadığı için imzayla (zaman, işlem, no, ad, adet, ayrıntı, kim) bulunur, aynı imzadan yalnız biri silinir; silme diğer yazmalar gibi okuma + yazma işlemiyle (`logKey`, `dropLog`, `orphanLogs`, `dropOrphanLogs`, invModel.js; InventoryView.jsx). Kural değişikliği yok. Testleri `test:elle` › "Envanter" › "hareket silme", "silinen ürünün hareketleri".

## Sıradaki işler

- Envanter › Hareketler'de "Silinen ürünlerin hareketlerini temizle"ye bas; deneme ürünlerinin hareketleri gitmeli, kalan ürünlerin adedi değişmemeli. Tek bir hareketi × ile sil.
