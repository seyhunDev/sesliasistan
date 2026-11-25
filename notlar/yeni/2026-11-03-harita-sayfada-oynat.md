## Nerede kaldım

- Seyhun 2026-11-03: saatlik tabloyu yana kaydırırken yanlışlıkla saate dokunup harita açılıyordu. Tablodaki saate dokunma (`onCol`, `openAt`) tamamen kalktı; tablo yalnız kaydırılır (ana sayfada tabloya dokunmak yine hava sayfasını açar).
- Harita artık tablonun altında sayfada ayrı alan (`RegionMap inline`): Rüzgâr | Yağış, İhtimal | Miktar, zaman çubuğu (−2 sa … +24) ve Oynat; geçmişe çekip Oynat'a basınca bugüne doğru oynar. Tek parmak sayfayı kaydırır, harita iki parmakla gezilir (`cooperativeGestures`); hava sayfasında dokunulan yer seçilen yer olur (Geri al). Yarış sayfası ve yarış günü tek ekran düzeni aynı inline haritayı kullanır. `/wind` hâlâ tam ekran (`startOpen`), `mini` yalnız eski önizleme için kaldı.

## Sıradaki işler

- Telefonda iki parmak gezinme ve sayfa kaydırma denenmeli.
