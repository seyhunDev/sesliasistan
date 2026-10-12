## Nerede kaldım

- Numaralı işlerin kalanları da alanlardan doğrudan (Seyhun: "kalanları da bu yapıya alalım"; telefonda ve gerçek yapay zekayla denenmedi): görev listesinde yapay zeka bir işi numarasıyla verince uygulama artık cümleyi yeniden okumaz, komutu alanlardan kurar. Aidat nakit (4), nakit gelir/bağış (5), alışveriş (7), arama (8), fatura ödendi (10), sporcu ekle (11), aidat hatırlatması (14), "kim ödemedi" (15) için komut hazır gelir (`routeFromAct`, `ymFrom`, `withAct`, src/lib/actRun.js; işlerde `pre`: `incomeCmd`, `duesCmd`, `callCmd`, `athleteCmd`, `runMore`). Gönderi (6), günlük (12) ve fitness (13) yine yapay zekayla yazılır ama doğrudan kendi yollarına gider; sayfa açma (9) zaten yapay zekasız. İzin denetimi aynı: işin adayı kişinin yol listesinde yoksa hazır komut kullanılmaz. Alan eksik ya da okunamazsa (ör. ay adı bozuk) eski yol (cümle). Tek işli listede de numara kullanılır. Kullanıcının yeni sözünde eski numara silinir. Testi `test:asistan` › "Numaralı iş: hazır komut". Kural değişikliği yok.

## Sıradaki işler

- Mac'te `npm run test:hepsi` ile gerçek yapay zekalı görev listesine bak; telefonda "Enes aidatını nakit verdi, listeye süt ekle, Turkcell faturası ödendi" gibi çok işli bir cümle dene.

## Asistan

- Görev listesindeki numaralı iş akışa hazır komutla gider (cümle yeniden okunmaz); emin olunamayan durumda cümle yoluna düşer (2026-10-12).
