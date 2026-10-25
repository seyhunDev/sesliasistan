## Nerede kaldım

- Asistan yalnız bas-konuş (Seyhun 2026-10-25, örnek "A · Çubuğun sağ ucunda"): küre sekme çubuğunun sağ ucunda ve büyük (4.75rem), dört sekme solda. Basılı tut → dinler (kapalıysa açılır, arka bulanık, söylenen büyük yazıyla görünür), bırak → gönderir. Kendiliğinden dinleme yok.
- Kısa dokunuş (<300 ms) ve parmağı 90 px uzağa kaydırıp bırakma göndermez; asistan açık, altta Fotoğraf · "Yaz…" kutusu kalır. İş sürerken kısa dokunuş durdurur. `TabBar.jsx` (`usePress`, `press` / `release`, `AssistBox`, `OrbMain`).
- Dur, Gönder, Konuş, Konuşmaya devam düğmeleri kalktı. Mikrofon tarafı (act.press / act.release, kendiliğinden açılmama) Sesli asistan başlığında. Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: basılı tutarken iPhone'un büyüteç / metin seçimi çıkmıyor mu, bırakınca gönderiyor mu.

## Asistan

- Asistan yalnız bas-konuş: basılı tut konuş, bırak gönder; kendiliğinden dinleme yok; küre sekme çubuğunun sağ ucunda.
