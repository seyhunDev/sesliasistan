## Nerede kaldım
- Tek gruba tehir (Seyhun 2026-11-04 "tek gruba tehir"; telefonda denenmedi): Tehir penceresinin başında "Kimin için": Tüm gruplar (eskisi gibi gün tehiri) ya da yalnız bir grup. Başka grup yarışırken geri sayımdaki grup varsayılan seçili. Yalnız grupta: o grubun geri sayımı sürüyorsa durur ve start programa döner; grubun bekleyen startları `plan.order[].ap { why, land, down, hours }` ile tehirde, sıranın sonuna gider (sıradaki tehirde olmayan grup). plan.status değişmez, öbür gruplar sürer. Süre'de satır "Tehir · sebep" (turuncu) + "İndir"; Başlat engelli. İniş zamanı gelince kendiliğinden iner (`grpDue`), inen grup sıranın başına döner, geri sayımı komite başlatır ("İnince" seçimi grup tehirinde yok). /canli: tehirdeki grup sol altta küçük satır "Kırmızı · Tehir", sağda AP (ScOthers). `lib/raceLive.js` cleanHold, grpHold, grpRelease, heldGrps, grpDue; dayRaces satır durumu "ap". Test yaris.mjs "Tek gruba tehir".

## Sıradaki işler
0. Telefonda: Sarı yarışta, Kırmızı geri sayımda → Tehir → Yalnız Kırmızı → sayaç durur, Sarı sürer, canlıda Kırmızı küçük satır "Tehir". İndir → Kırmızı sıradaki.
1. Aynı anda iki kişi Yayın'da: starts/plan alan alan yazma.
