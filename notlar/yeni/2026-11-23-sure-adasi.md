## Nerede kaldım

- Sayaç süresi artık üstte ortada küçük siyah ada (Seyhun 2026-11-23 "B · Üstte küçük siyah ada", örnek /mnt/project-files/sure-gostergesi/ornek.html). `src/features/training/TimerChip.jsx` (app layout'ta, TabBarHost yanında; asistan küresinin üstündeki mavi hap kalktı). Kırmızı nokta + süre (start geçince +mm:ss), geniş ekranda "Starta", çarpı. CSS globals.css `.tisl*`; sol menü varken içerik ortası; telefonda sayfa 2.5rem aşağı kayar.
- Çarpı yalnız o sayacı gizler: localStorage `sa-timer-hide` {own, dur, end}; bitiş süreden fazla kayarsa (yeni sayaç) yine çıkar. Sayacın kendi sayfasında görünmez.

## Sıradaki işler

- Telefonda gerçek sayaçla dene (yarış Süre ve antrenman günü).
