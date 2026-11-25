## Nerede kaldım

- Parkur sekmesinde asistan önce parkurla çalışıyor (Seyhun 2026-10-30 "öncelikli olarak parkurla, muhtemel insan konuşmaları, yapay zekadan hızlıca"):
  - Açık Parkur sekmesi `src/features/raceMedia/courseView.js` ile bildirilir; asistan o yarışın o GÜNÜNE yazar (önce hep bugüne yazıyordu, başka gün açıkken değişiklik görünmüyordu).
  - Sorular yerelde, anında (`courseAsk`): hangi taraf avantajlı / pin mi komite mi, rüzgâr ne kadar döndü, son rüzgâr, eksen kaç, rüzgâr eksene göre.
  - Göreli cümleler (`courseRelative`): "rüzgar 10 derece sağa döndü" (sağa = saat yönü), "2 knot düştü", "eksen 10 derece sola alındı"; dayanak yoksa sorar.
  - Anlaşılmayan parkur cümlesi /api/course-parse (≤5 sn, çoklu `items`, son rüzgâr ve eksen bağlamıyla) → yazılır.
  - Parkur açıkken rüzgâr cümlesi parkura gider (rüzgâr kaydına değil). "orta şamandırası" = orsa (ses hatası).
- Tarayıcıda emülatörle uçtan uca denendi; yapay zekâ yolu anahtarsız denenemedi. Telefonda denenmedi.
- asistan-ekran testinde "Yarış multimedya sayfası" artık alt çubukta tek küre bekliyor (#899'dan beri kırmızıydı).

## Sıradaki işler

- "Son ölçümü sil" sesle yok (silme onaylı kalmalı).

## Asistan

- Parkur sekmesi açıkken sayılı ya da parkur sözlü her cümle önce parkura (courseCmd); sayaç komutu önce kalır.
