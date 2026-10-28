## Nerede kaldım
- Yarış sayfası sadeleşti (Seyhun: "her tekrar olmasın, göz yormasın"; "yarış başladığında rüzgâr, neticeler gelince neticeler, iş bitince sonuçlar ve ertesi gün"; harita ve öneri /mnt/project-files/yaris-tasarim/harita; telefonda denenmedi):
  - Yarış günü üstü günün evresine göre (`RaceDayTop.jsx`, saf hesap `src/lib/raceDay.js`): A yarışta (rüzgâr üstte, Multimedya · Parkur), B bugünün sonucu gelince (bizimkilerin sırası, dünden fark ↑2, "Tüm sonuçlar"), C son yarış bitip 90 dk ya da 18:00 sonrası (sonuç kısa, yarın: talimat programından ilk start, hava yarına açılır; son gün dönüş). Sonuç `results.day` ve `prev` (stampResults) tutar.
  - Sonuçların tek yeri Multimedya › Sonuçlar: Sporcu sekmesindeki sonuç bölümü kalktı; "Elle yaz" penceresi (RaceResults upload=false) orada. Biten yarışın Özet'inde tek satır.
  - Veli sekmesi kalktı: Evrak'ta "Veli bilgi notu" satırı, içi pencerede. Sesle "bilgi notunu hazırla" Evrak'ı açar.
  - Talimat Özet › Yarış'ta tek satır (aç, bilgiler, değiştir, sil); lacivertteki "Talimat yükle" ve ⋯ içindeki talimat satırları kalktı.
  - Otel izni oteli Yolculuk'taki otellerden seçer (tek otel varsa kendiliğinden); ad ayrıca yazılmaz.
  - Testler: test:yaris › Yarış günü, test:yaris-ekran güncellendi.

## Sıradaki işler
0. Telefonda yarış günü A/B/C, Multimedya › Sonuçlar › Elle yaz, Evrak › Veli bilgi notu denenecek.
1. Yarışlar sayfasında Kulübüm | Takvim; ana sayfada yarış günü Multimedya'ya tek giriş (ayrı PR).

## Tasarım
- Yarış sayfası = hazırlık (Özet · Sporcu · Evrak · Yolculuk · Bütçe), Multimedya = yarışın kendisi (Süre · Medya · Parkur · Sonuçlar). Sonuç PDF'i yalnız Multimedya'da yüklenir.
