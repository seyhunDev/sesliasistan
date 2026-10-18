## Nerede kaldım
- Yarış multimedya sayfasına üç ek (Seyhun: "3'ü ve 5'i de ekleyelim... video max 2 dakika, sıkıştırarak gönderelim muhakkak"; telefonda denenmedi):
  - Video kuralı: en çok 2 dakika (uzunsa "Video en çok 2 dakika olabilir"); her zaman 960 px, ~1,6 Mbit/sn'ye küçültülür; telefon küçültemezse kaydedilmez; sonuç 40 MB'ı geçerse kaydedilmez. Fotoğraf 1600 px JPEG (raceLiveStore.js `prepRaceMedia`).
  - Sporcu etiketi: Medya'da fotoğrafa/videoya dokununca "Kimler var" altında yarıştaki sporcular; dokun ekle/çıkar. Künyede `ath: [id]` (lib/raceLive.js `tagMedia`, `mediaOf`). Etiketli varsa üstte sporcu süzgeci (Hepsi · Ali …). Silme artık kalan listeyi yazar (arrayRemove eski künyelerle eşleşmiyordu).
  - Gün özeti: sayfanın sağ üstünde "Özet" → seçili günün kartı (1080×1350 PNG: yarış adı, yer/gün, rüzgâr aralığı + saat saat çubuk, yarışlar ve bayraklar, bizimkilerin sırası) "Resmi paylaş" (WhatsApp/Instagram) ve "Yazıyı paylaş". Rüzgâr elle yazılan kayıtlardan; yoksa start saatleri arası tahmin "(tahmin)". lib/raceLive.js `daySummary`, features/raceMedia/dayCard.js, DaySummarySheet.jsx.

## Sıradaki işler
1. Telefonda dene: 2 dakikadan uzun video reddediliyor mu, 1–2 dk video ne kadar sürede ve kaç MB'a iniyor; etiketle ve süz; Özet kartını WhatsApp'a ve Instagram'a paylaş.
2. Etiketli fotoğraflar kişi sayfasında ve Instagram gönderisi hazırlarken seçilebilsin (yapılmadı).
3. Karta günün fotoğrafı eklemek için Storage CORS ayarı gerekir (yoksa tuval kirlenir); şimdilik fotoğrafsız.
