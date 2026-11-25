## Nerede kaldım
- Hazır program erkek fotoğrafları: "Örnek programı ekle" (ana hesap) kız fotoğraflarından sonra arka planda her hareketin erkek versiyonunu çizer (`seedMalePhotos`, /api/fitness-pic `male: true`, ref = kız fotoğrafı, aynı poz/ortam). Kütüphanede `g: "m"` işaretli (cleanMedia korur), `useFitLib.addMale` 5'te bir kaydeder; yarıda kalırsa yeniden seçince devam eder. Günlük çizim hakkı fitpic 60.
- Gösterim: `library.forSex(media, sex)`; FitWorkout/FitGuided'da sporcu programında programdaki cinsiyet (`prog.forSex` → plan `fit.sex`), kendi programında profil (`users.fit.sex`). Erkek "e" ise erkek fotoğrafı, diğerlerine kız.

## Sıradaki işler
- Yapay zekayla çizilen 5 hareketin (fotoğrafı olmayanlar) erkek versiyonu yok.
- Eski programlarda `forSex` yok: sporcu programı yeniden oluşturulunca gelir.
