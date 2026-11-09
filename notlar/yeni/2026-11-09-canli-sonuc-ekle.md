## Nerede kaldım

- /canli Sporcular panelinde başlığın yanında küçük "+" (Sonuç ekle; Seyhun 2026-11-09 "sonuçları gösterdiğimiz her yerde artı"). Yalnız ana hesap, uygulama içinde. PDF ya da fotoğraf seçilir, LiveStart yükler, panelde kısa sonuç yazısı çıkar. Sonuç yoksa da Sporcular düğmesi çıkar ("Henüz sonuç yok" + "+").
- Tek ortak yükleme: `resultsImport.js` `addResults({ orgId, race, athletes, file, replace })` (okur, damgalar, yarışa kaydeder). Yarış sayfası `importFile` ve Yayın › Belgeler `takeResults` de artık bunu kullanıyor (kopya kod kalktı).
- Canlı genel sıralama /api/canli önbelleği yüzünden ~1 dk içinde güncellenir.

## Sıradaki işler

- Telefonda denenmedi. Yarış detayındaki "+" biçimi Yarışlar çalışmasında.
