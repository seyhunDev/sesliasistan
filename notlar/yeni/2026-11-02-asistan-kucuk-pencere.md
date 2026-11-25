## Nerede kaldım
- Asistan artık tam ekran açılmıyor (Seyhun 2026-11-02 "A · İçeriğe göre büyür"): alttan içeriği kadar açılan koyu pencere, en çok ekranın ~%55'i (sohbet alanı `max-h` = vvh*.55-8rem), fazlası içeride kayar; yeni mesajda var olan otomatik kaydırma sürer.
- Arkadaki sayfa görünür, hafifçe kararır (`.adim`, `[data-adim]`); dışına dokununca kapanır (dinlerken ya da bekleyen söz varken değil). Aşağı çekip kapatma aynı.
- Kod: src/features/home/TabBar.jsx Dome (inner sabit boy yok, `afull-sm`), globals.css `.afull-sm`, `.adim`. Ekran testleri: "düğmeye bas" küçük pencere ölçer, kapanış `[data-adim]`a dokunur. Telefonda denenmedi.
- Renkler aynı kaldı (logo çalışması değiştirecek).

## Sıradaki işler
- Telefonda klavye açıkken pencerenin boyu denenmeli.
