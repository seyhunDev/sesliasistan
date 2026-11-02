## Nerede kaldım
- /canli/ornek (deneme yarışı) yeni tasarıma göre 12 adım: Yarış öncesi → Parkur kuruldu (parkur sahnesi kendiliğinden açılır) → Videolu bekleme (sol bilgi) → Turuncu bayrak (Start öncesi) → Start dizisi → Start → 1. şamandıra → Rüzgâr değişti → 2. → 3. şamandıra → Finiş → Gün sonu.
- Gerçek start videosu (Seyhun'un verdiği YouTube, demo.js DEMO_VIDEO): videonun 1:04'ünde start var. Start dizisinde video 0:00'dan açılır, sayaç 1:04'ten sayar; start adımı 40 sn sürer, sonra video kalkar, dönüşler ve genel sıralama gelir. Elle Start adımına atlanırsa video 1:04'ten açılır.
- YouTube bağlantısındaki `t=64s` / `t=1m4s` / `start=` artık gömülü videoda başlama saniyesi olur (raceRounds.js ytStart).
- Parkur ekseni (komitenin parkuru attığı yön): parkur sahnesinde start ortasından 1'e kesik açık mavi çizgi ve "PARKUR EKSENİ 300° KB"; videolu sol bilgide "Eksen 300° KB" + "Rüzgâr eksenden 5° sola"; alt şeritte "Parkur · Eksen 300°".
- Sol bilgide bayraklar yalnız start dizisinde (sayaç çalışırken), o sırada küçük parkur çizimi gizlenir.

## Sıradaki işler
- Bulutta YouTube açılmadı (ağ kapalı); video gömmeye izin veriyor mu telefonda/TV'de bakılmalı.
- Gerçek Optimist/ILCA sınıf işareti görseli bekleniyor.
