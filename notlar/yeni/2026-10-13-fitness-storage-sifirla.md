## Nerede kaldım

- Fitness fotoğraf ve videoları Firebase Storage'da (Seyhun: "storage'a geçelim"; telefonda denenmedi): yeni dosyalar `orgs/{org}/fitMedia/{id}` yoluna yüklenir (yükleme yüzdesi görünür), harekette künyeyle birlikte indirme adresi (`url`) durur; video oradan akarak oynar, tarayıcı önbelleğinde kalır. Video küçültülemezse en çok 80 MB. Eski Firestore parçalı düzen yalnız okunur (hiç dosya eklenmemişti). Kurallar `storage.rules` (ana hesap yükler/siler, aynı kulüpteki hesaplar okur; 90 MB, yalnız görüntü/video), `firebase.json`'a eklendi. Seyhun Firebase konsolunda Blaze + Storage'ı açıp kuralı yayınlamalı.
- Program silinince her şeyi silinir (Seyhun: "sildiğimde önceki yapılan antrenmanlar kalıyor"): programın bütün antrenmanları (geçmiş, yapılan, atlanan; `where fit.prog == id` tek sorgu), başka programda kullanılmayan fotoğraf/videoları ve program (`deleteProgram`, fitnessData.js).
- "Fitness'ı sıfırla" (Fitness sayfasının en altı, iki onay): bütün programlar (sporcularınki dahil), `src == "fitness"` bütün antrenmanlar ve Storage'daki bütün fitness dosyaları silinir; boy/kilo ve beslenme kalır (`resetFitness`, `dropAllMedia`). Asistan: "fitness'ı sıfırla" Fitness sayfasını açıp aynı onayı sorar (`fitLocal` op reset). Testleri `test:elle` › Fitness › "fitness sıfırla (sesle)", "hareket dosyası Storage adresi".

## Sıradaki işler

- Firebase konsolu: Blaze planı, Storage › Başlayın (europe-west1), Storage › Kurallar'a `storage.rules` yapıştır › Yayınla. Netlify'daki `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` konsoldaki kova adıyla aynı olmalı.
- Telefonda: Fitness › Fitness'ı sıfırla, sonra bir harekete video ekle, sporcu hesabında oynuyor mu bak.
