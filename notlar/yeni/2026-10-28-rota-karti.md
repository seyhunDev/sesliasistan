## Nerede kaldım

- Parkur sekmesine kendi rota kartımız eklendi. Seyhun'un paylaştığı kağıt karta benziyor ve onun seçtiği "A · Rüzgâr yukarıda" ile çiziliyor (örnek: yaris-tasarim/parkur/rota-karti-a.png).
- Sekmenin en üstünde Kart · Harita seçimi var. Açılışta Kart geliyor, seçim telefonda hatırlanıyor (`sa-parkur-view`).
- Kartta Start var (komite sağda, pin solda). Kapılar ve şamandıralar: 4s/4p, 1 ve 1A, 2, 3s/3p. Bir de Finiş var.
- Açılar girilen ölçümlerden geliyor: parkur ekseni, son rüzgâr, pin'den komite hattı, orsadan apaza. Ayakların üstünde dereceler yazıyor.
- İşaretlenmeyen bot ve şamandıralar kesik çizgiyle çiziliyor. Rüzgâr hep yukarıdan geliyor, kuzey oku köşede. Hattın eğimi hangi ucun önde olduğunu gösteriyor.
- Kart kağıt kart gibi ölçeksiz bir şema. Gerçek konumlar Harita'da.
- Kod: `src/lib/courseCard.js` (`cardOf`, `cardSvg`), `CourseTab.jsx`. Test: yaris.mjs "rota kartı".

## Sıradaki işler

- Telefonda dene: rüzgâr, eksen ve hat söyleyince kart doğru dönüyor mu?
- Seyhun isterse kartta başka parkur tipleri (iç/dış yamuk, orsa-pupa) seçilebilir.
