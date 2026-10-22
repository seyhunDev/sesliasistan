## Nerede kaldım

- Testler iş akışındaki üç kırmızı ekran testi zamanlama kaynaklıydı (GitHub makinesi yavaş), uygulama hatası değil:
  - Enerji (boşta) › ana sayfa: ölçüm sayfa yüklenirken başlıyordu. Artık ağ boşalıp 1 sn hiç değişiklik olmayınca ölçülüyor (en çok 8 sn bekler). Düşerse raporda süren animasyonlar ve en çok değişen öğeler yazar.
  - Ege'ye yaz → gönder: soru okunduktan sonra mikrofonun açılması 6 sn'yi geçiyordu, bekleme 12 sn.
  - Sekme çubuğundaki düğme › ana sayfa: düğme çizilmeden sayılıyordu, artık bekleniyor.
- Yerelde ekran testi 107/107.

## Sıradaki işler

- Testler iş akışı yeşil mi kontrol et (test-sonuclari dalı son.txt).
