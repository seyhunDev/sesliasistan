## Nerede kaldım
- iPad dikeyde (48–64rem) ana sayfa ızgarası `height:100%` olduğu için içerik taşınca alt padding sayılmıyor, sekme çubuğu Kulüp ve Notlar'ın üstüne biniyordu. `.home-ck.hs` artık `height:auto; min-height:100%` (globals.css), alt boşluk 6,5 rem + güvenli alan korunuyor. Yatay iPad ve Mac (≥64rem) aynı kalır.
## Sıradaki işler
- Telefon ve diğer sayfalarda alttaki boşluk `body[data-dock] main` kuralıyla geliyor; gerçek cihazda bakılmalı.
- Hava üst alanı sabit yükseklik: veri yokken WindRibbon aynı boyda boş durum gösterir, hava yok bloğu ve özet cümlesi yer ayırır (zıplama yok).
