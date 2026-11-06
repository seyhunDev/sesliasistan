## Nerede kaldım

- Canlı ekranda açık panel (Ekranda, Parkur ve rüzgâr, Sıralama, Program, Video, Yayın masası) artık ekranda boş bir yere dokununca ya da aşağı çekince kapanıyor (Seyhun 2026-11-06). Dokunuş yalnız paneli kapatır, alttaki şeye tıklanmaz. Start penceresi ve ekran dışındaki pencereler (Ölçüm ekle vb.) etkilenmez. Kod: `ScView` `drag` ve pointerdown etkisi.
- Yayın masası › Kaynaklar'ın sonunda "Kaynakları sıfırla" (iki dokunuş): bütün kaynaklar, gruba bağlı kameralar (`camBy`), yayında işareti (`srcLive`), `onAir` silinir; kanaldan gelen süren yayınlar `stream.gone`'a yazılır, ekranda kaynak varsa ekran boşalır.

## Sıradaki işler

- Telefonda denenmedi.
