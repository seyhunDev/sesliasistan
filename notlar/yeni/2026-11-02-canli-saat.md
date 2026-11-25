## Nerede kaldım
- Canlı ekran sayacı geri gidiyordu (57 56 57 55): her 4 sn'lik veri yanıtındaki sunucu saatiyle fark yeniden alınıyordu, yanıt CDN'den 2-4 sn eski gelebiliyordu. Şimdi NTP gibi: `/api/canli?saat=1` (önbelleksiz, Firestore okumaz) 3 kez sorulur, en kısa gidiş-dönüşlünün ortası alınır (raceLive bestOffset), 10 dk'da bir tazelenir, < 0,5 sn farka dokunulmaz. Sayaç performance.now ile sayar (cihaz saati değişse de geri gitmez).
- Start/bitiş anları veride bir kez gelir, saniyeler cihazda sayılır (zaten böyleydi). Veri hâlâ 4 sn'de bir sunucudan (sunucu kısa süre önbellekler).

## Sıradaki işler
- Okumaları azaltmak için yayın özeti belgesi + değişince itme (onSnapshot ya da sunucu tarafı), şu an ~45k okuma/gün.
