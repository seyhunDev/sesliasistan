## Nerede kaldım

- Bütçe çıktısı düzenlendi (Seyhun: "kulüp ödemesi sıfırsa gösterilmesin; çıkış, dönüş gibi planı tahmini plan diyelim, ayrı bir şey gibi gösterelim, okunaklı değil"; telefonda denenmedi): yarış bütçesi PDF'inde yolculuk artık başlığın altındaki gri satırlar değil, ayrı "TAHMİNİ PLAN" kutusu (sağda "Gün ve saatler değişebilir"): Çıkış (gün · saat), Çıkış yeri, Buluşma noktası (çıkış yerinden farklıysa), Dönüş; etiket solda, değer kalın (`tripRows`, races.js; budgetDoc.js). Kulübün karşıladığı tutar sıfırsa "Kulüp karşılar" kutusu ve alttaki kulüp açıklaması çıkmaz, iki kutu sayfayı doldurur. Testleri `test:yaris` › "tahmini plan satırları", "bütçe PDF: tahmini plan".

## Sıradaki işler

- Bir yarışta Bütçe › çıktı al: Tahmini plan kutusu ve kulüp payı yoksa iki özet kutusu doğru mu bak.
