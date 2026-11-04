## Nerede kaldım
- HATA (Seyhun 2026-11-04 "tehiri indirmem canlı yayına gitmedi"): karada (AP/H) ya da saatli (AP 1–9) tehir çekilince ekrana bir de işaret kartı (`plan.sig`) yazılıyordu; tehiri indirmek (elle "Tehiri indir" ya da zamanı gelince) yalnız tehiri kaldırıyor, işaret kartı ekranda kalıyordu. Şimdi BroadcastPage `apSigOff` iki iniş yolunda da tehir işaretini siler; canlı ekran tehir işaretini kartta hiç göstermez (ScSig), yalnız saatin altındaki tehir rozetinde (ScAp) ve tehir inince kalkar. AP/A (bugün yarış yok) kartta kalır.
- Bayraklar tek çizim: canlı ekranın `Flag` bileşeni (AP, FS, N, P, I, U, Z, Kara) artık Yayın › Bayrak penceresiyle aynı `flagSvg` (lib/raceSignals) çizimi; eski CSS çizimleri kullanılmıyor. Tehir rozeti ve Yayın üstündeki tehir kutusu çekilen bayrakların hepsini gösterir (AP üzeri H, AP üzeri 6) ve "6 saat tehir" yazar.

## Sıradaki işler
- Telefonda denenmedi. Ana sayfa / yarış sayfasında ayrıca bir tehir gösterimi bulunamadı; Seyhun'un gördüğü "yalnız Tehir" Yayın üstündeki kutuydu (düzeldi).
