## Nerede kaldım
- /sanal gerçekten tam ekran (Seyhun 2026-10-25: "full ekran gözüksün istiyordum ama şu an öyle değil"): çerçeve artık çentik ve alt çizgi dahil bütün ekranı kaplar (`absolute inset-0`), zemin lacivert. iPhone iframe'e safe-area vermediği için Velora payları gizli bir ölçüm elemanıyla ölçer ve `sanalLink(pad)` adrese `&st=…&sb=…` (px) ekler; Sanal (velora-sanal #13) üst/alt satırını o kadar içeride çizer. Geri düğmesi sol üstte kaldı (Sanal sol üst 56 px'i boş bırakır, #12).
- Test: elle "Sanal çentik payı". Telefonda denenmedi.

## Sıradaki işler
- Telefonda bak: üstte/altta şerit kalmamalı, Geri Sanal'ın düğmelerine binmemeli.
