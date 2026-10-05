## Nerede kaldım
- Ana sayfa aidat kartı kendisi güncelleniyor (Seyhun: "ana sayfada aidatta sıfır gözüküyordu, Aidatlar'a gidip dönünce bir oldu; ödeme geldiyse ana sayfa kendi güncellenmeli"): kart önceden yalnız Aidatlar sayfası açılınca bu cihaza yazılan özeti gösteriyordu, sunucunun bankadan kendiliğinden yazdığı ödeme sayfa açılana kadar görünmüyordu. Artık ana sayfa açılınca ve uygulamaya dönünce `dues/settings` (etkin sporcular, roster) ve bu ayın aidat kaydı okunur (2 okuma), ödeyen sayısı oradan hesaplanır (`duesLive`, homeTiles.js; HomeSummary.jsx). "N banka ödemesi bekliyor" sayısı yine Aidatlar sayfasında hesaplanır, son bilinen değer kalır. Testi `test:elle` › "Ana sayfa kartları" › "aidat canlı".

## Sıradaki işler
0. Ana sayfa aidat kartını dene: bankadan yeni aidat geldiğinde (bildirim "Aidat geldi: …") Aidatlar'a girmeden ana sayfaya bak, ödeyen sayısı artmış olmalı.
