## Nerede kaldım

- Yeni açılan sayfa en üstten başlıyor (Seyhun: "bir sayfada aşağı kaydırdıysam diğer sayfa kaydırılmış, üstü kesik geliyor; her sayfa yukarıdan başlamalı"; telefonda denenmedi): sayfa değişince pencere en üste alınır; geri/ileri (tarayıcı geçmişi, geri tuşu) ile dönülen sayfada önceki konum korunur (`navArrived`, `navPopped`, src/lib/navProgress.js; NavProgress.jsx). Testi `test:elle` › "Sayfa geçişinde kaydırma".

## Sıradaki işler

- Telefonda dene: bir sayfada aşağı kaydır, ana sayfadan başka bir sayfaya git; yeni sayfa en üstten açılmalı. Geri basınca önceki sayfa bıraktığın yerde olmalı.
