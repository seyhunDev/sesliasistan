## Nerede kaldım

- Aynı adlı iki hareket sebebi: kütüphane anahtarı listedeki hareketin id'si ("pushup") ya da elle yazılanın adı ("c:sinav"). PDF'ten okunan hareket bazen listeye eşlenip bazen "kendi hareketi" kalınca aynı ad iki kayıt açıyordu.
- Önlem: `libKey` (lib/fitness/library.js) aynı adlı kayıt varsa onu kullanır; birleştirilmiş eski anahtar `alias` ile kalana yönlenir. Programlar değişmeden kalanı kullanır.
- Temizlik: Fitness › Hareketler › "Aynı adlı hareketler" listesi (`libDupes`): fotoğrafı/videosu çok olan "Kalacak". "Birleştir" / "Hepsini birleştir" onay sorar (`libMerge`). Fotoğraf/video silinmez: hepsi kalana geçer, 3'ten fazlası `spare`'de saklanır ve program silinince de korunur (`libMediaIds`).
- Gerçek veride birleştirmeyi Seyhun kendisi yapacak (listeyi görüp). Telefonda denenmedi.

## Sıradaki işler

- Seyhun listeyi kontrol edip birleştirsin; yanlış eşleşme olursa bildirsin.
