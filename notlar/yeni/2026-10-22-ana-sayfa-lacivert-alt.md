## Nerede kaldım

- Ana sayfanın alt kısmı (Notlar, Takvim, Sporcular, Fitness, Kulüp) kokpitin devamı olarak lacivert: sarmalayıcı `data-theme="dark"` + `.navy` (globals.css), değişkenler lacivert tonlara çevrilir, kartlar `--card` #1c2248. Ana sayfadayken sayfa zemini de lacivert (`html:has(.home-navy)`).
- Gün penceresi (DayPick) lacivert: `Sheet navy`.
- Tonlar (`.tone-*`) lacivertte yarı saydam. Alt çubuk açık renk kaldı.
- Örnek: https://claude.ai/artifact/WrMCZTYqQ6g3QuNsiHHPMH. Telefonda denenmedi.

## Sıradaki işler

- Yoklama sayfası sadeleştirme (örnek hazırlanıyor).
- Alt çubuğun lacivert olup olmayacağı sorulabilir.

## Tasarım

- Lacivert bölüm için `.navy` sınıfı + `data-theme="dark"` kullan; renkleri tek tek yazma.
