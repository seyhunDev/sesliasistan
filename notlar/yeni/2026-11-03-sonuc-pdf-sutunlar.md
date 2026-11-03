## Nerede kaldım

- Sonuç PDF'i (Seyhun 2026-11-03 16:21, TYF "GEÇİCİ SONUÇLAR · ALTIN 03.11.2025", 73 sporcu, Q1…Q6 eleme + F1, F2 final): yazılı PDF'lerde sütun başlıkları (Rank, SINIF, tarih başlıklı grup sütunu ya da "ALTIN" başlığı, Y.NO, AD SOYAD, CİNSİYET, D.TARİHİ, KULÜP, Q1/R1/F1…, Total, Nett) tanınırsa sonuç yapay zekasız okunur (`resultTableOf`, `src/lib/pdfLines.js`; `readResults`, `src/features/athletes/raceResultsRead.js`). Alt satıra taşan ad ve kulüp, "(74.0" + "RET)" gibi bölünen puan üstteki sporcuya eklenir; puanlar "1", "(61)", "(RET)", "UFD" biçiminde.
- Her gün yeni Altın/Gümüş/Bronz PDF'i yüklenir: aynı grubun yenisi eskisinin yerine geçer, diğer gruplar kalır, genel sıra Altın'dan Bronz'a (`joinGroups`, `fleetsOf`; eski davranış). Grupların tümünü içeren genel sıralama PDF'i de aynı yoldan.
- Tanınmayan biçim eskisi gibi yapay zekaya gider. PDF yazısı ortak `src/lib/pdfText.js` (pdf.js).

## Sıradaki işler

- Genel sıralama PDF'i örneği gelince biçimi denenecek. Telefonda denenmedi.
