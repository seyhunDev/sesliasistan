## Nerede kaldım

- Asistan dosyası bölünüyor, 1. adım (Seyhun: "asistan dosyasını revize edelim", önerilen yapı onaylandı: Ekran, Beyin, İşler): `AssistantSheet.jsx` 3.682 → 2.056 satır. Asistanın işleri (kayıt, mesaj, kişi, yarış, yoklama, günlük, etkinlik, envanter, fitness, para/aidat/fatura, alışveriş, ders, sporcu, arama, yerel komutlar) artık iş başına ayrı dosyada: `src/features/assistant/isler/*.js`. Her iş bileşenin durumunu ve yardımcılarını `ctx` ile alır; AssistantSheet'te aynı adla kısa sarmalayıcı kaldı. Davranış değişmedi: `npm run test:hizli` 2000/2000, `npm run test:hepsi -- --yzsiz` önceki çalıştırmayla birebir aynı, derleme geçti. Telefonda denenmedi (kod taşındı, mantık aynı). Kural değişikliği yok.

## Sıradaki işler

- 2. adım: asistanın "beyni" (yönlendirme, yapay zekaya sorma, görev listesi zinciri, cevap ve konuşma sırası) `useAssistant.js`'e taşınacak.
- 3. adım: `AssistantSheet.jsx` yalnız ekran (sohbet, kartlar) kalacak.
- Yeni bir asistan işi eklenirken ilgili `isler/<iş>.js` dosyasına yazılır.
