## Nerede kaldım

- İş bitince düğmenin beyaz kalması düzeldi: sebep `--vl-a: var(--brand)` idi (--brand gradyan, renk değişkenine yazılamayınca beyaz başlangıç değeri kalıyordu). Boşta renkler artık #8b5cf6 → #4f7cf3.
- "Kaydedildi" / "Tamam" yazısı üstte görünmüyor (ekran okuyucu için duruyor); yerine düğme yeşile dönüp ✓ çiziyor ve bir kez hafifçe büyüyüp oturuyor.
- Cevabın altındaki süre satırı (Yazıya çevirme… Söz…) varsayılan kapalı; Testler › Süre kaydı'ndan açılır (`sa-dev` = "1").
- İstenmeden görevlendirme/mesaj denemesi motor işi: "Sesli asistanın çalışma sistemi" konusunda.
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda yeşil ✓ geçişi denenmeli.

## Tasarım

- `@property` ile tanımlı renk değişkenlerine (--vl-a, --vl-b, --vl-h) gradyan değişken (--brand) yazma; düz renk yaz.
