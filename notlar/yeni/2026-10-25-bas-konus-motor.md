## Nerede kaldım

- Yalnız bas-konuş, motor tarafı (Seyhun 2026-10-25: "otomatik açılma falan yok, sadece bas konuş"). useAssistant `PUSH_TALK`:
  - Soru sorulunca ya da okuma bitince mikrofon kendiliğinden açılmıyor (listenOnce kapalı).
  - Yeni act işleri: `press()` okumayı kesip hemen dinler. `release()` bırakınca gönderir ve "sent" döner. 300 ms'den kısa basışta hiçbir şey göndermez, mikrofonu kapatır, eski konuşmayı silmez ve "short" döner.
  - Mikrofon açılmadan bırakılırsa açıldığı an aynı iş yapılır. Basılı tutarak açılış (seed listen) da release ile biter.
- Görünüm (küre sağda, büyük; basınca arka bulanık) tasarım ipliğinde, kendi dalında. Küre pointerdown/up'ı press/release/cancel'a bağlıyor.
- Ekran testleri:
  - "okuma bitince" artık mikrofonun açılmadığını denetliyor.
  - answer() bas-konuşla cevap veriyor.
  - Konuş/Gönder yardımcıları tasarımın dalında küre basılı tut / bırak'a çevrilecek.
- Telefonda denenmedi.

## Sıradaki işler

- Tasarım dalı birleşince bas-konuş telefonda denenmeli: ilk kelime kaçıyor mu, kısa dokunuş kutuyu açıyor mu, bırakınca hemen gidiyor mu.

## Asistan

- Mikrofon yalnız basılı tutarken açık (PUSH_TALK). Eller serbest (HANDS_FREE) ve kendiliğinden cevap mikrofonu kapalı.
