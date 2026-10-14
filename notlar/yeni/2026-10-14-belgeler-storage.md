## Nerede kaldım

- Storage'a taşıma 4. adım (Seyhun: "devam"; telefonda denenmedi): envanter belgeleri/fotoğrafları, faturalar, yarış talimatı ve sonuç PDF'leri artık Firebase Storage'a yüklenir: `orgs/{org}/invFiles|invoiceFiles|noticeFiles/{id}`, künyede `path` + `url` (`putStored`, `getStored`, `dropStored`, src/lib/firebase/fileStore.js; `storedOf`, src/lib/storedFile.js). İnternet yoksa ya da yükleme olmazsa eskisi gibi Firestore'a parçalı yazılır. Eski dosyalar Firestore'dan okunmaya devam eder, taşınmaz. Storage'dan gelen dosya telefonda saklanmaz. PDF sınırı 4 MB kaldı (yapay zeka okuması için). Kural değişikliği VAR: `storage.rules` (yalnız ana hesap, 20 MB, görüntü/PDF).

## Sıradaki işler

- Firebase konsolu › Storage › Kurallar'a `storage.rules`'u yapıştır › Yayınla. Yayınlanmazsa yüklemeler eski yola (Firestore) düşer, bir şey bozulmaz.
- Telefonda dene: envantere bir fotoğraf ekle, bir fatura yükle, bir yarışa talimat yükle; aç, sil.
- 5. adım (Seyhun "devam" derse): banka maili ekleri (Gmail betiği değişir).
