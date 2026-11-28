## Nerede kaldım
- Gün (kanal) kendiliğinden kapanır (Seyhun 2026-11-28): Günü başlat'ta "Kendiliğinden kapanma" Kapalı · 1 · 2 · 3 · 4 sa (bu telefonda saklı `sa-kanal-saat`, varsayılan 1 sa; sesle açılan kanal da bunu kullanır). Açılışta `kanal.until` yazılır (bilgi/ekran).
- Yönet: 5 dk kala ortada küçük kart "Gün N dk sonra kapanacak" + "1 saat uzat" / "Vazgeç"; son 1 dk ortada kırmızı saniye geri sayımı + "1 saat uzat" + ✕ (gizler, kapanma sürer). Süre dolunca Yönet kanalı kapatır (Yönet kapalıysa sonra açıldığında kapatır).
- Sporcu ekranı süresi geçmiş kanalı kapalı sayar ("Kanal açık değil"), Yönet açık olmasa da.
- Kod: lib/bilgi.js KAPAN_SAAT, kapanAt, kanalLeft, kanalLive (cleanBilgi until'i taşır); bilgiStore readSaat/saveSaat/kanalUntil; YonetParts DayStart; BilgiAdmin .bzy-kapan.

## Sıradaki işler
- Telefonda deneme. Açık gün içinde süreyi değiştirmek istenirse ⋯ menüsüne eklenebilir.
