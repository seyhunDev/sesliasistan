## Nerede kaldım

- /canli alt çubukta "Sporcular" düğmesinin adı artık "Sonuçlar" (Seyhun 2026-11-09). Panelin başlığı "Sonuçlar"; yanında son güncelleme saati ("14:32 güncellendi" ya da başka günse "8 Kas 14:32") ve "+" (Sonuç ekle) var.
  - Saat resmî sonuçta sınıfın sonuç belgesinin geliş anından (`/api/canli` fleets `at`), geçici sonuçta son biten yarıştan alınıyor.
- Sade liste ("göz yoruyor"; örnek onaylandı):
  - Her satırda solda sıra, ortada ad, altında grup + yelken no + kulüp (açık adı, uzunsa "…") var.
  - Sağda puan, altında son 5 yarışın derecesi var.
  - Başlıkta bir kez "Yarının grupları · Optimist" yazıyor.
- Yarının grupları açıklanınca yalnız yarınki grup görünüyor; bugünkü grup gösterilmiyor.
- Sporcu ayrıntısında kartlar yerine düz satırlar var: Genel sıra, Puan, Yarın/Bugün. Altında dereceler yarış yarış, günüyle.
- Kod: LiveScreen.jsx içinde `ScAthPanel`, `athAt`, `scAth` (`at`). Stiller sahne.css içinde `.sc-athl` ve `.sc-athkv`. `/api/canli` fleets'e `at` eklendi.

## Sıradaki işler

- Telefonda denenmedi.
