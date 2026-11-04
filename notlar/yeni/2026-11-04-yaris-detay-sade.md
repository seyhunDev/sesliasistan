## Nerede kaldım

- Yarış detay sayfası (yarıştan önce) sadeleşti (Seyhun 2026-11-04 "yarış detay sayfasını sadeleştirelim"); özellik kaybolmadı:
  - Üstte ilerleme çubuğu ve "Hazırlık · N bölüm eksik · N iş" satırı kalktı (eksik bölüm sekmede sarı nokta, işler Özet'te).
  - "Yayına git" üstten kalktı; ⋯ › Yayın'da (yarış günü sayfasında altta duruyor).
  - Yolculuk ve Bütçe tek sekme "Yolculuk" (altında BÜTÇE); dört sekme tek satıra sığar. `setTab("budget")` (asistan, Özet, ⋯ Bütçe) Yolculuk'u açıp Bütçe'ye kaydırır.
  - Evrak: 20 alanlı antrenör formu sayfada değil, satıra dokununca alttan pencerede (`coachOpen` Sheet).
  - Açıklama yazıları kalktı (Eksikler altı, hazır evrak notu, Evrak ekle alt yazısı, otel, yapay zekâ "getir", bütçe asistan örnekleri).
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun başka bölüm (Özet'teki Yarış kartı, Evrak belge grupları) için de sadeleştirme isterse.

## Tasarım

- Yarış sayfası başlığı (Seyhun 2026-11-04): geri · ad / yer · tarih · sağda kalan gün ("5 / gün", "Yarın") ya da yanıp sönen "Yarışta", bittiyse "Bitti" (`page.jsx` `Left`) · ⋯. Ayrı "5 gün kaldı" satırı yok.
- Yarış havası (`RaceWx`): yer, ölçüm istasyonu, gün seçimi ve yenile grafiğin ALTINDA; üstte doğrudan sıcaklık ve tablo.
