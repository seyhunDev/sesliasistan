## Nerede kaldım

- Sporcunun zil penceresinde fitness programı tek satır (Seyhun: "fitness antrenmanı verildiyse 82 tane yapılacak oluyor, tek bildirim yeterli; önce bildirimler, sonra yapılacaklar gösterilsin"; telefonda denenmedi): "Yapılacaklar"da yeni verilen fitness planları artık her antrenman için ayrı satır değil, program başına tek satır: "Yeni antrenman programı · Seyhun · 4 haftalık, 82 antrenman"; dokununca Fitness açılır, sola kaydırıp gizlenir (`fitGroups`, `fitText`, src/lib/fitness/newProgram.js; ForYou.jsx). Telefona giden bildirim zaten tekti (`fitProgram`). "Senin için" penceresinde önce Bildirimler, sonra Yapılacaklar (Inbox.jsx). Testi `test:elle` › "Bildirim kutusu: fitness programı".

## Sıradaki işler

- Sporcu hesabıyla zile dokun: Bildirimler üstte, Yapılacaklar'da fitness programı tek satır olmalı.
