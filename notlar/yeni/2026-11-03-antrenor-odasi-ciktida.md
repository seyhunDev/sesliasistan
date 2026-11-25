## Nerede kaldım

- Bütçede "Antrenör" için seçilen otel odası artık çıktılarda ayrı anlaşılıyor (Seyhun 2026-11-03: sporcu çıktısında iki "Otel odası" satırı karışıyordu).
- Sporcu bütçesi / veli bilgi notu: satır "Otel odası (antrenör)" (adında antrenör yoksa eklenir), altında küçük yazı "Antrenörün odası, N sporcu arasında bölüşüldü" (N = kalem yalnız bazı sporculara yazıldıysa onların sayısı, yoksa yarıştaki sporcu sayısı).
- Yarış bütçe çıktısı ve Bütçe sekmesindeki kalem açıklaması (`howText`): antrenör odasının sonunda "· N sporcuya bölünür" (kulüp karşılıyorsa yazmaz).
- Kod: `athleteSheet.js` `sheetData` (`note`), `budget.js` `howText`. Test: yaris.mjs "antrenör odası yazısı". Telefonda denenmedi.

## Sıradaki işler

- Seyhun bir sporcunun Çıktı'sını açıp antrenör odası satırına bakar.
