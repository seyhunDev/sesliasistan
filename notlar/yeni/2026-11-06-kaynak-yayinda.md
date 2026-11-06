## Nerede kaldım
- Kaynak yayında mı (Seyhun: "Start kamerası gibi sabit kaynaklar; canlı yayın başladığında yayının başladığını gösteririz"; telefonda denenmedi): `raceLive.srcLive = { <kaynak id>: son görülme ms }` (`src/lib/srcLive.js` cleanSrcLive, srcIsLive (6 dk sonra eskir), nextSrcLive (yalnız değişince ya da 4 dk'da bir yazılır)). Yazan: açık Yayın sayfası (BroadcastPage, /api/yayin-durum 45 sn; artık her sekmede), `raceLiveStore.saveSrcLive` (mergeFields). Okunur: loadRoundsOf, watchRounds, /api/canli `srcLive`. Ekran seçicisi ve Yayın masası `srcIsLive(L.srcLive, id)` ile kırmızı nokta gösterecek.

## Sıradaki işler
0. Yayın sayfası kapalıyken de "yayında" bilgisi gerekirse: sunucu zamanlayıcısı (plan-reminders gibi) srcLive yazabilir.
