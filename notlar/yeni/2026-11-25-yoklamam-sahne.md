## Nerede kaldım

- Yoklamam sayfası (`/my-attendance`, sporcu ve veli) koyu "Sahne" görünümüne geçti (örnek project-files/yoklamam-sahne/ornek.html, Seyhun "Yap"): ana sayfa, Fitness ve Takvim ile aynı dil, tek vurgu limon.
- Üstte bu ay kutusu: devam % büyük (izinli sayılmaz, `monthOf`), yanında Geldi / Gelmedi / İzinli, altında ayın günleri renkli kareler. Altında "Son antrenmanlar": ilk açılışta son 6, "Daha fazla göster" her basışta 10 daha; hepsi göründüğünde düğme kalkar.
- Veri: bir sporcunun bütün yoklaması tek belgede (`orgs/{org}/athleteAtt/{uid}`, `att` haritası); sayfa açılınca tek okuma. Sınır yalnız ekrana çizilen satır sayısında.
- Veli: her çocuk kendi adıyla alt alta, aynı düzen. iPad yatayda (64rem+) solda bu ay, sağda liste.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda ve iPad'de dene: kareler çok olunca satır kırılıyor mu, uzun çocuk adı.
- İleride yoklama belgesi çok büyürse (yıllarca kayıt) yıllara bölünebilir; şimdilik gerek yok (1 yıl yaklaşık 10 KB).

## Tasarım

- Yoklamam Sahne: `main.sh.ya-sh` + `src/features/athletes/yoklamaSahne.css` (`.ya-*`); uzun listeler önce son birkaç kayıt, "Daha fazla göster" ile açılır (Seyhun 2026-11-25).
