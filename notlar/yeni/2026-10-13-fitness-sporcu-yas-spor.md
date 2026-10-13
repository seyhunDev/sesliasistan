## Nerede kaldım

- Sporcuya program hazırlarken yaş ve spor (Seyhun: "sporcunun doğum tarihi var, yaşını alalım, yapay zekaya öyle gönderelim; spor seçmeli olsun, yelken seçili"; telefonda ve gerçek Gemini ile denenmedi): Fitness › + › Kimin için'de sporcu seçilince iki yeni kutu: "Yaşı" (doğum tarihinden; önce Kişiler kaydı `birth`, yoksa kulüp kartı `studentBirthDate`, cinsiyet de karttan; − / + ile değişir; doğum tarihi yoksa yaş grubu seçilir: 8-10, 11-12, 13-14, 15-17, 18+) ve "Sporu" (Yelken seçili; Kano, Yüzme, Koşu, Futbol, Basketbol, Voleybol, Tenis, Genel). Yapay zekaya "Sporcu 13 yaşında" / "11-12 yaş grubunda" ve "Spor: Yelken" gider (adı gitmez). İstemde spora özel kurallar (yelken: gövde, sırt, hiking için izometrik bacak, kavrama, denge) ve yaşa uygun yük (18 altı en çok ağırlık yok, 12 altı yalnız vücut ağırlığı, omurgaya ağır yük yok). Profilde yeni alan `sport` (`SPORTS`, `ageFrom`, `ageGroupOf`, `sexFrom`, model.js). Testleri `test:elle` › "sporcu yaşı", "sporcu sporu".

## Sıradaki işler

- Fitness › + › bir sporcu seç: yaşı doğru geliyor mu, Yelken seçili mi; Dayanıklılık/Güç seçip hazırla, hareketler yelkene uygun mu bak.
