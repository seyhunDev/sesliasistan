## Nerede kaldım

- Asistan ekranı yeni tasarım (Seyhun "Yap" dedi; örnek /mnt/project-files/asistan-ekrani/asistan-yeni.html): eski kayan renk bulutları ve nefes alan logo kaldırıldı, zemin sabit lacivert.
- Canlı logo `src/features/home/LogoRing.jsx` (TabBar'daki eski ProgressRing'in yerine): Velora halkasının 24 çubuğu. Açılışta bir kez büyür; dinlerken sesle uzar (`--lvl`, ListenWave kubbeye yazar); çalışırken işler bittikçe çubuklar yanar, iş sayısı belli değilse üzerinde ışık döner; konuşurken atar; bitince çubuklar içeri çekilir ve onay çizilir. Durum `data-tone` (listen/work/speak/ok/idle), ilerleme `data-fill`.
- Kenar ışığı `.aedge`: dinlerken ekran kenarı mor-turkuaz, sesle güçlenir; çalışırken soluk kehribar. Geniş ekranda (34rem+) yok.
- İş adımları listesi yeni görünüm (`.astep-dot`: süren adımda dönen kehribar halka, biten adımda yeşil daire + çizilen onay). Kaydedildi kartı düz ince çizgili.
- Tekrar eden yapay zeka yazısı motor başlığında çözüldü (#697).
- Ekran testleri güncellendi (halka rengi `data-tone`'dan, zemin testi "sabit + kenar ışığı"), 107/107.

## Sıradaki işler

- iPhone titreşimi: iPhone başlığının ortak `haptic()` parçası main'e girince asistan ekranında dinleme başı `haptic("light")`, iş bitince `haptic("success")` bağlanacak. iPhone uygulaması Xcode'dan yeniden kurulmalı.
- Telefonda denenmedi.

## Tasarım

- Hareket kuralı: boşta hiçbir şey oynamaz; yalnız transform/opacity; açılış animasyonu bir kez. `.claude/skills/velora-tasarim/SKILL.md` "Hareket" bölümü.
