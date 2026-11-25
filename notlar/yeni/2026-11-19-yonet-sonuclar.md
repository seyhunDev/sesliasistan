## Nerede kaldım

- Canlı'nın Sonuçlar, Gruplar ve Program'ı Bilgi Yönet'te ve sporcu ekranında (Seyhun 2026-11-19 örnek "Yönet ve ekranda sonuçlar" onaylandı):
  - Ortak dosya `src/features/liveScreen/sonuclar.jsx`. Canlı ekran da buradan alıyor (tek bileşen).
  - Yönet'in üst haplarında Sonuçlar, Gruplar ve Program var; yalnız canlı ekranı açık bir yarış varken görünür. Yarış o gün süren yarış, yoksa en yakını (`useCanliRace`, /api/canli).
  - Sonuçlar'daki "+" ortak `addResults` ile sonuç PDF'i ekler.
  - Sporcu ekranında start öncesi pusulanın altında Genel sıra / kişi sayısı, Grup (yarınki açıklandıysa "Yarın") ve grubun start saati gösteriliyor (`mineOf`, yelken numarasıyla).
- Telefonda ve gerçek yarışla denenmedi.

## Sıradaki işler

- Canlı sayfasının kalanını (Video, Ekranda) Yönet'e taşıma, Seyhun isterse.
