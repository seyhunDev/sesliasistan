## Nerede kaldım

- Yayın: sekmelerin iş düğmeleri (Süre: + Yarış/Bayrak/Günü bitir, Ekran: Kaldır/Ekrana al, Program, Parkur, Sporcu, Dönüş) artık alttaki sekme çubuğuna bitişik. Sebep: MasaBar sekme içeriğiyle aynı `space-y-6` kabının içinde; Tailwind 4'te space-y son olmayan çocuğa `margin-bottom: 1.5rem` veriyor, sabit (fixed) çubukta bu 24 px çubuğu yukarı itiyordu. #1173/#1176 yalnız `bottom` değerini düzelttiği için boşluk kalmıştı. `.masa-bar { margin: 0 !important }` (masa.css).
- Sekme çubuğu yüksekliği artık border-box ölçülüyor (ResizeObserver), ev çizgisi payı değişince de doğru.
- Emülatörlü tarayıcıda telefon (390), iPhone ev çizgili (393 + 34 px), iPad (820) ve Mac (1366) boyutlarında 7 sekmede ölçüldü: çubuğun altı = sekme çubuğunun üstü. Gerçek telefonda denenmedi.

## Sıradaki işler

- Sayfanın başka yerinde `space-y-*` içindeki `fixed` öğeler aynı kaymayı yaşayabilir; görülürse aynı düzeltme.
