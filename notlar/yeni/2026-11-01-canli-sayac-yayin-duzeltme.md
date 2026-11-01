# Canlı ekran: sayaç ve canlı yayın görünmüyordu (2026-11-01)

## Nerede kaldım
- Seyhun deneme yarışında süreyi başlattı, YouTube linki yapıştırdı; herkese açık /canli sayfasında ikisi de görünmedi.
- Nedenler ve düzeltmeler:
  - Sayfa sayacı ve ekrandaki yayını yalnız "canlı start" varken gösteriyordu (`isCur`); start kaydı yokken ikisi de gizleniyordu. Şimdi önceki yarış (?y) seçilmediyse her zaman canlı görünüm (LiveScreen.jsx).
  - Canlı sekmesinde link yazmak yetmiyordu: "Canlı yayın" satırı seçilip Göster'e basılmalıydı, tanınmayan link için uyarı yoktu. Geçerli link yazılınca Canlı yayın kendiliğinden seçilir; tanınmayan linkte uyarı yazar (LiveScreenSheet.jsx).
  - Yalnız YouTube video/live/youtu.be linkleri tanınıyordu; kanal linki (`youtube.com/channel/UC…`) eklendi (`ytChannel`, `ytEmbed`, `ytSrc` lib/raceRounds.js). `@ad` linkleri çözülemez, başka siteler gömülemez.
  - Sayaç başka sayfada (ana sayfa şeridi) başlatılıp yarış sayfası sonra açılırsa belgeye hiç yazılmıyordu; açılışta bu sayfanın süren sayacı belgedekinden yeniyse yazılır (useLiveSync.js).
- Test: yaris.mjs "Canlı ekran: dönüşler" › "kanal yayını".

## Sıradaki işler
- Yayın görünümü (Seyhun onayladı, 2026-11-01): az renk, parkur kartı (lib/courseCard.js, gerçek ölçümlerden) arkada soluk, sıralama ve sayaç ön planda.
