## Nerede kaldım

- Yoklama sayfası sadeleşti (Seyhun: "üst tarafta çok alt alta şeyler var, sporcu listesi aşağı kayıyor; sayılara gerek yok, sadece tarih; filtre açık olmasın, tıklayarak seçelim"; telefonda denenmedi): üstte yalnız ince gün satırı (‹ gün ›, bugün değilse "Bugüne dön"). Geldi/Gelmedi/İzinli sayıları kalktı. Sınıf seçimi kapalı düğme ("Tümü 8 ⌄", dokununca liste), "Hepsi geldi" ve "Kalanlar yok" ile aynı satırda; sporcu listesi hemen başlıyor (`RollView.jsx`). Kural değişikliği yok.
- Düğmelerde gölge yok (Seyhun: "gölge kullanma, kenarlık ve iç gradyanla"): `.raised` (globals.css) artık ince kenarlık + içte üstten alta hafif gradyan, basınca gradyan ters döner. Ana sayfa kısayolları da aynı stili kullanır, onlar da değişti. Örnekler: `/mnt/project-files/yoklama/dugme-yoklama.png`, `dugme-ana-sayfa.png`.

## Sıradaki işler

- Telefonda Yoklama'yı aç: liste üstte mi, sınıf düğmesi açılıp seçiyor mu; ana sayfa kısayollarında gölge kalmadı mı bak.

## Tasarım

- Düğmeler gölgesiz: ince kenarlık + iç gradyan (`.raised`). Yeni düğmede dış gölge kullanılmaz (2026-10-13).
