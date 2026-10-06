## Nerede kaldım
- Alt sekmeler sabit (Seyhun: "sayfayı aşağı götürünce soluklaşıyor, zor tıklanıyor"; telefonda denenmedi): sayfa kaydırılınca sekme yazılarının soluklaşması (`mini`) kaldırıldı; sekmeler iPhone uygulamalarındaki alt sekme çubuğu gibi hep aynı. Her sekmenin dokunma alanı satırın tam yüksekliği (önceden yalnız simge + yazı), çift dokunma yakınlaştırması yok (`touch-manipulation`), seçili olmayanlar biraz daha net (white/70). Zor tıklanmanın olası nedeni: kaydırma sürerken ilk dokunuş iPhone'da kaydırmayı durdurur, ikinci dokunuş sekmeyi açar; dokunma alanı büyüdü (TabBar.jsx `NavTab`).

## Sıradaki işler
0. Bir sayfayı aşağı kaydırıp hemen sekmeye dokun: sekmeler soluklaşmamalı, tek dokunuşta açılmalı.
