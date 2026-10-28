## Nerede kaldım

- Sonuç PDF'inde ILCA 4 Junior (Seyhun: "2011 doğumlu ve sonrası junior; başlıkta yazıyor, oradan alıp; şimdi ILCA 4 için yapalım, Optimist ve bambinoları sonra söyleyeceğim"; gerçek PDF ile denenmedi): sınıf belgedeki başlıktan okunur ("ILCA 4", "ILCA 4.7", "Laser 4.7" → ILCA 4; `clsName`). ILCA 4'te Junior doğum yılından hesaplanır: yarışın yılında 15 yaş ve altı (2026 yarışlarında 2011 ve sonrası; her yıl kendiliğinden bir yıl kayar). Doğum yılı okunamayan satırda belgedeki "J/Junior" işareti kullanılır. Sonuçlar sekmesinde ILCA 4 için Genel · Junior · Kızlar süzgeci çıkar, Junior kendi içinde sıralanır; Bizimkiler'de "ILCA 4 genel 5. / 40 · Junior 2. / 12". Daha önce yüklenen listelerde Genel sekmesindeki Junior süzgeci hemen çıkar; Bizimkiler'deki Junior sırası için PDF yeniden yüklenir. Kurallar tek yerde: `CAT_RULES` (resultSheet.js; `withCats`, `bornYear`, `raceYear`); Optimist Junior/Bambino yaş kuralı gelince buraya eklenir (şimdilik Optimist'te belgedeki işaret geçerli). Testleri `test:yaris` › "Yarış sonuç belgesi" › "ILCA 4 Junior …".

## Sıradaki işler

- ILCA 4 sonuç PDF'ini yükle: Sonuçlar › Genel'de Junior süzgeci çıkıyor mu, Junior'lar 2011 ve sonrası doğumlular mı bak. Optimist (Junior, Bambino) ve diğer sınıfların doğum yılı kurallarını yaz, `CAT_RULES`'a eklenir.
