## Nerede kaldım

- Fiş fotoğrafları Firebase Storage'da (Storage'a taşıma 2. adım; telefonda denenmedi). Yeni ya da değiştirilen fiş fotoğrafı `orgs/{org}/receiptImages/{ekleyen}/{fiş}_{zaman}.jpg` olarak yüklenir, fişe `imgPath` ve `imgUrl` yazılır (`receiptPhoto.js`; DataProvider `putPhoto`). Yükleme bitene kadar fotoğraf bellekte durur, fiş ekranı beklemeden gösterir. İnternet yoksa ya da yükleme olmazsa (ör. kural yayınlanmadıysa) eskisi gibi Firestore belgesine (`receiptImages/{id}`) yazılır. Fotoğraf değişince eskisi, fiş silinince fotoğrafı Storage'dan silinir. Eski fişlerin fotoğrafı Firestore'da kalır ve oradan okunur. Kural değişikliği VAR: `storage.rules` (receiptImages: ana hesap hepsi, çalışan kendi eklediği; en çok 5 MB, yalnız görüntü). Firestore kuralı değişmedi.

## Sıradaki işler

- Firebase › Storage › Kurallar'a `storage.rules`'u yapıştır › Yayınla. Sonra bir fiş fotoğrafı çek; Storage'da `receiptImages` klasöründe görünmeli, fişi açınca fotoğraf gelmeli. Çalışan hesabıyla da dene.
- İstenirse: eski fişlerin Firestore'daki fotoğraflarını da Storage'a taşıma düğmesi.
- Storage'a taşıma 3. adım: Instagram fotoğrafları.
