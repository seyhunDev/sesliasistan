## Nerede kaldım

- Kayıt listesi PDF'i (Seyhun 2026-11-03, 9 sayfa 217 teknelik TYF Yelken Ligi Optimist sporcu listesi): yazılı PDF'lerin yazısı telefonda pdf.js ile satır satır çıkarılır (`src/lib/pdfLines.js`), başlık satırlarıyla 45'er satırlık parçalar halinde aynı anda 4 parça yapay zekaya gider (`readEntryFile`, `src/features/rounds/roundsStore.js`). Tek seferde 200+ satırı okumak süre aşımına düşebiliyordu. Taranmış (yazısız) PDF ve fotoğraf eskisi gibi tek seferde.
- Listede renk grubu sütunu varsa (MAVİ/SARI/KIRMIZI) gruplar yüklendiği günün grupları olarak kaydedilir (eski davranış).

## Sıradaki işler

- Gerçek yüklemede denenmedi (burada Gemini anahtarı yok).
