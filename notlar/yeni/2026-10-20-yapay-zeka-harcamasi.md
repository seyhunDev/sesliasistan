## Nerede kaldım

- Seyhun Gemini faturalandırmasını açtı (250 TL yükledi). Ücretsiz katmanın günlük sınırları (Flash 20/gün) dolduğu için asistan yapay zekaya ulaşamıyordu.
- Harcama takibi: her Gemini yanıtındaki token sayısından (usageMetadata) tahmini dolar hesaplanıyor (`src/lib/aiPrice.js` fiyat tablosu, Netlify `GEMINI_PRICES` ile değişir) ve `usage/ai_{org}_{ay}` belgesine `usd`, `usdDay.{gün}`, `usdKind.{iş}` olarak yazılıyor (`src/lib/server/aiSpend.js`, istek kapsamı `withAiCool` içinde açılır, kişi `countAi` ile öğrenilir). Ses tanıma dakika fiyatıyla eklenir. Kur Netlify `USD_TRY` (varsayılan 42).
- Ayarlar › Yapay zeka kullanımı: Bugün / Bu ay (TL), aylık bütçe çubuğu (varsayılan 250 TL, bu telefonda değiştirilir), son 7 gün.
- Mikrofon: ham ses tamamen sıfır gelirse (iPhone'da okuma ya da otomatik mikrofondan sonra görülen "ses alınamadı") mikrofon ölü sayılır ve bir kez yeniden açılır (`micCheck.js` `pcmPeak`).

## Sıradaki işler

- Fiyat tablosu tahmini: Google faturasıyla karşılaştırılıp `GEMINI_PRICES` ayarlanmalı.
- Gemini TTS ve görsel istekleri token harcamasına girmiyor (ayrı sayaçları var).
