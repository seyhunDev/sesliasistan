## Nerede kaldım

- Fitness hareketlerinde örnek fotoğraf ve tarif (Seyhun: "kendi fotoğrafımı ekleyene kadar her hareketin nasıl yapıldığını gösteren bir fotoğraf ve açıklama lazım"; telefonda denenmedi): yapay zekanın uydurduğu bağlantılar kırık çıkacağı için fotoğraflar sabit bir katalogdan: free-exercise-db (kamu malı), jsDelivr üzerinden sabit sürüme bağlı, her harekette başlangıç ve bitiş karesi. 98 hareketin 86'sında fotoğraf var (burpee, yoga, ısınma gibi 12'sinde yalnız tarif). Her hareketin 4 adımlı Türkçe tarifi yazıldı. Fotoğraf hareketin altında "Örnek" etiketiyle, "Nasıl yapılır" ekranında iki kare sırayla değişir; harekete kendi fotoğrafı ya da videosu eklenince örnek görünmez. Kaydedilmez, Firestore'a ve Storage'a yük yok; telefon fotoğrafı internetten açar. `src/lib/fitness/exerciseGuide.js` (`stockPhotos`, `guideSteps`), `stockMedia` (ExerciseMedia.jsx). Testi `test:elle` › Fitness › "hareket tarifi ve örnek fotoğraf".

## Sıradaki işler

- Telefonda bir antrenmanı aç: hareketlerin altında örnek fotoğraf görünüyor mu, "Nasıl yapılır"da kareler değişiyor mu. Yanlış fotoğraf düşen hareket olursa adını yaz.
