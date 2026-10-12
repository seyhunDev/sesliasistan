## Nerede kaldım

- Kasa "Kime verildi / Kimden" (Seyhun: "sporcular listeleniyor, yanlış; çalışanlar, Kişiler'deki kişiler olabilir; kişilerde olmayan birine verildiyse eklensin, istersem silebileyim"; telefonda denenmedi): Hesaplar › + penceresindeki ad alanının altında artık seçenek düğmeleri var: Kişiler'deki kişiler (çalışan, aile, diğer, veli; sporcu ve öğrenci yok, ayrılan çalışan yok) ve daha önce elle yazılan adlar. Yazdıkça süzülür. Listede olmayan bir ad yazılıp kaydedilince seçeneklere eklenir (`cash/meta.names`); elle eklenen adların yanında × ile silinir (`whoOptions`, `newWhoName`, cashbook.js; `saveCashName`, `dropCashName`, duesData.js). Sesle "kulüpten Usta Mehmet'e 500 lira nakit verildi" denince ad yine yazılır ve seçeneklere eklenir. Kulübün verdiği borçlar formundaki ad önerileri de aynı listeden (sporcular çıktı). Aidat türünde sporcu seçimi eskisi gibi. Kural değişikliği yok.
- Toplam bakiye yalnız kullanılan hesap (Seyhun: "3 hesap gösteriliyor, bir tanesi aktif, sonu 3378 olan; diğerlerini istersek seçenekte gösterelim"; telefonda denenmedi): Bakiye kartında seçim yapılmadıysa yalnız bakiyesi sıfır olmayan hesaplar görünür (hepsi sıfırsa hepsi). Kartın altında "N hesap gizli · göster" ile pencere açılır, hesaplar işaretlenip gösterilir/gizlenir; seçim `cash/meta.accts`'e yazılır, her cihazda aynı (`shownAccounts`, mailBoard.js). Toplam yalnız görünen hesaplardan.

## Sıradaki işler

- Hesaplar › + › Nakit çıkış: "Kime verildi" altında sporcu adı olmamalı, çalışanlar ve Kişiler görünmeli. Listede olmayan bir ad yazıp kaydet, bir daha açınca seçeneklerde olmalı, × ile sil.
- Bakiye'de yalnız ·3378 görünmeli; "2 hesap gizli · göster" ile diğerlerini açıp kapat.
