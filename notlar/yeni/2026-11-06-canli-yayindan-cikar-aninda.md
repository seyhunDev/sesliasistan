## Nerede kaldım

- "Yayından çıkar" / Yayın masası "Ekrandan kaldır" artık anında keser (Seyhun 2026-11-06 "listenin tamamlanması bekleniyor, anında kesilsin"). Kök neden: ekran boşalınca (1) o evreye atanmış görüntü (`evreScreen`) geri geliyordu, (2) günün kayıtları kendiliğinden sırayla oynuyordu (`autoOn` / `autoRecs`). Şimdi boşaltma `screen.off = <evre>` yazar (`cleanScreen` her zaman yazar, merge'de eski kalmaz): o evrede atanmış görüntü gelmez, kayıtlar kendiliğinden oynamaz. Yeni görüntü verilince `off` kalkar; başka evreye geçince evrenin görüntüsü yine çalışır.
- Test: `test:yaris` "yayından çıkar anında keser".

## Sıradaki işler

- Telefonda denenmedi.
