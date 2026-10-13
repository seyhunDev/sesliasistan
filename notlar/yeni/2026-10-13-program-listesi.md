## Nerede kaldım

- Fitness programı liste olarak (Seyhun: "oluşturduğum tam programı liste halinde, kopyalayabileyim; kime yönelik, çocuk kaç yaş, ne için"; telefonda denenmedi): Programım ve Sporcular › sporcu ekranındaki program kartında "Liste olarak al". Düz yazı: kimin için, yaş, spor, hedef/seviye/yer, haftada kaç gün · hafta · başlangıç, sonra gün gün "Pazartesi 17:00 · Kuvvet (45 dk)" ve numaralı hareketler "Şınav — 3 × 12 · 20 kg", en sonda not. "Kopyala" panoya alır (`programText`, model.js; ProgramCard). Yaş sporcunun doğum tarihinden; yoksa programda saklanan yaş. Sporcu programına artık yaş, spor ve hedef/seviye/yer de kaydedilir (`forAge`, `sport`; fitnessData.js `saveProgram`); eski programlarda bu satırlar boş kalabilir. Sporcu ekranı değişmedi. Kural değişikliği yok. Testi `test:elle` › Fitness › "program listesi (kopyala)".

## Sıradaki işler

- Ana hesaptaki program ekleme ve takip ekranlarının sadeleştirilmesi: öneri thread'de, Seyhun'un onayını bekliyor.
