## Nerede kaldım
- Sporcudan Yönet'e bas-konuş (Seyhun 2026-11-17, örnek C "haritada konuşan tekne"). Sporcu ekranında altta ortada yuvarlak mikrofon (yatayda haritanın sağ altında): basılı tut, konuş, bırak. Kayıt `bilgiGelen/{cihaz}` belgesine yazılır (cihaz başına tek belge, üstüne).
- Yönet gelen sesi sırayla çalar; çalarken o teknenin haritadaki noktası yeşil atar, adının yanında ses dalgası. Teknenin konumu yoksa haritanın ortasında isim + dalga. Çalınan ses Kayıtlar'a "Gelen ses" olarak yazılır. 20 sn'den eski ses çalınmaz.
- Sporcu ekranında Yönet'ten ses/mesaj gelince üstte ortada mavi "Yönet" etiketi ve dalga çıkar.
- Bas-konuş kancası ortak dosyada: `src/features/bilgi/usePtt.js` (Yönet ve sporcu aynı). Dalga `Wave.jsx`.
- firestore.rules: yeni `bilgiGelen/{dev}` kuralı; Seyhun konsoldan yayınlamalı.

## Sıradaki işler
- Telefonda deneme (iPhone + Android): sporcu kaydı Yönet'te çalıyor mu, dokunmadan çalmazsa bildirim çıkıyor.
