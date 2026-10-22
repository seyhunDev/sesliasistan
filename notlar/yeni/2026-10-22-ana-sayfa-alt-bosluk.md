## Nerede kaldım

- Ana sayfada en alta inince lacivertin bitip alt çubuğun üstünde siyah şerit görünmesi düzeltildi. Sebep: koyu modda `html[data-theme=dark] body:has(main.grouped)` kuralı lacivert gövde kuralından daha özgüldü, sayfanın alt boşluğunda gövde siyah kalıyordu. `body:has(.home-navy)` artık `!important` ile lacivert (globals.css). Açık ve koyu modda tarayıcıda denendi, telefonda denenmedi.

## Sıradaki işler

- Alt sekme çubuğu hâlâ koyu gri; istenirse lacivert yapılabilir.
