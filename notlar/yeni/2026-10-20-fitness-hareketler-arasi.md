## Nerede kaldım

- Fitness: hareketin yeni alanı `gap` = sonraki harekete geçmeden dinlenme (sn). Boşsa setler arası (`rest`) kullanılır, o da boşsa 60 (`gapOf`, `restAfter`; model.js).
- Antrenmanda (FitGuided, FitWorkout) aynı hareketin setleri arasında `rest`, son setten sonra `gap` sayılır.
- Programı düzenle: "Dinlenme · bütün hareketler" kartında "Setler arası" ve "Hareketler arası" (toplu, `setRestAll` / `setGapAll`); hareketin içinde "Setler arası" ve "Sonraki hareketten önce" (tek tek).
- Yapay zeka PDF'te ayrıca yazıyorsa gap'i okur. Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: toplu 20 / 60, bir harekette tek tek 90.
