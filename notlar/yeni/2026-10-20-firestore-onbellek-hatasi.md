## Nerede kaldım
- Asistandan sporculara mesajda "FIRESTORE (12.19.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) … Failed to delete record from object store" (Seyhun, telefonda; düzeltme telefonda denenmedi). Telefondaki Firestore önbelleği (IndexedDB) bozulunca Firestore istemcisi bir daha çalışmıyor.
- iPhone/iPad'de önbellek artık tek sekmeli (`persistentSingleTabManager`, clientApp.js); çok sekmeli yönetici WebKit'te uygulama arkaya gidip dönünce bu hatayı veriyor. Bilgisayarda çok sekmeli kaldı.
- Hata yine olursa uygulama bir kez kendini yeniler (2 dakikada en çok bir; `healFirestore`, clientApp.js); bekleyen kayıtlar telefonda kalır, yenileyince gider. Mesaj ekranında ham hata yerine "Mesaj gönderilemedi, uygulama kendini yeniliyor; birazdan tekrar dene." (ChatProvider sendErrorText).
- Test: `npm run test:cevrimdisi` 19/19 (yeni: iç hata → yenileme, ikinci kez döngü yok; iPhone tek sekmede internetsiz kayıt bağlantı gelince gider).

## Sıradaki işler
0. Telefonda: sporculara asistandan mesaj gönder; hata görünürse uygulama birkaç saniyede yenilenmeli, sonra mesaj gitmeli.
1. Hata sık tekrarlarsa: firebase 13'e geçiş ya da bozuk önbelleği temizleme (bekleyen kayıtlar gider) düşünülür.
