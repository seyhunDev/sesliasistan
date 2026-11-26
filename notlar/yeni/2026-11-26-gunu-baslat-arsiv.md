## Nerede kaldım

- Günü başlat penceresi: ekran belgesi gelmeden gösterilmiyor (gün açıkken bir an görünüp kaybolma bitti). Günler listesi (`useKanallar`) bellekte ve telefonda (localStorage `sa-kanallar-<org>`) saklı; açılışta hemen gelir, yoksa aynı boyda iskelet satırlar.
- Önceki günlerde ⋯: "Arşive at" (5 sn Geri al) ve "Sil" (mevcut silme, 6 sn Geri al). Arşiv `bilgiKanal.arsiv: true`; Günü başlat listesinde görünmez, Günler penceresinde "Arşiv · N" ile açılır, oradan "Arşivden çıkar". Kural değişmedi.
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun denedikten sonra açılış hâlâ takılırsa ekran belgesi de önbelleğe alınabilir.
