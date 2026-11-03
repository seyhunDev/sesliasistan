## Nerede kaldım

- Günlük grup listeleri (Seyhun 2026-11-03 16:16: ilk gün sporcu listesi açıklanır, sonra her gün gruplar değişir, liste her gün yüklenir). Kayıt listesi › Yükle üç biçimi okur:
  1. grup sütunlu tek liste (sütun başlığı tarih ya da "Grup"; TYF örneği),
  2. "MAVİ GRUP", "Sarı Grup Listesi" başlıklı bölümler (`tableOf` başlığı sonraki satırlara grup olarak verir),
  3. her grup ayrı dosya: tek grup yüklenince yalnız o grubun tekneleri değişir, günün diğer grupları kalır; birden çok grup gelince günün listesi tümüyle değişir (`dayGroups`, `src/lib/roundScore.js`).
- Sınıf sütunu olmayan grup listesindeki satır, aynı numaralı tek kayda eklenir (`mergeEntries`).
- Gruplar yüklendiği günün grubu olarak yazılır. Final grupları (Altın, Gümüş, Bronz; Seyhun 16:17: genelde 2 gün renk grubu, sonra final listesi kalan günlerde aynı): o güne liste yoksa önceki son liste final listesiyse geçerli (`groupsOn`, `src/lib/roundScore.js`; dönüş ekranı, Yayın, canlı ekran, geçici sıralama). Renk grupları ertesi güne geçmez. Örnek TYF Altın/Gümüş/Bronz listesi (03.11.2025) 216 sporcuyla okundu.

## Sıradaki işler

- Seyhun örnek sonuç listesi gönderecek; onun biçimine bakılacak.
- Telefonda yükleme denenmedi.
