## Nerede kaldım
Hava grafiklerinde yağmur kuralı (#1210) bandı artık beklenen yağış miktarını (mm) da yazıyor: ana sayfa şeridi (WindRibbon) ve Hava sayfası / iPad ana sayfa grafiği (WxPanel WindChart) aynı `rainSpan` hesabını kullanır (mm = yağışlı saat aralığının toplamı). Radar yakında gösteriyor, burada yağış yoksa içi boş halka, mm yok.

## Sıradaki işler
- Derleme ve testler bu oturumda çalıştırılamadı (npm kurulumu 403); Mac'te `npm test` ile bak.
