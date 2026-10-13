## Nerede kaldım

- Ana sayfa Antrenman kartında fitness da var (Seyhun: "yalnız yelken varsa yoklama, yalnız fitness varsa fitness ve kimin olduğu, ikisi de varsa seçim"; telefonda denenmedi): haftanın günlerinde fitness antrenmanı olan günün altında turuncu nokta (hepsi yapıldıysa koyu), yalnız fitness olan gün turuncu halka. Güne dokununca: yalnız yelken (sporcu yetkisi, bugün/geçmiş) o günün yoklaması; yalnız sporcuların fitness'ı Fitness › Sporcular o günle açılır (`/fitness?sporcular=1&gun=…`, kimin olduğu orada); yalnız kendi fitness'ın Fitness › Benim; ikisi birden (ya da kendin + sporcu) seçim penceresi: "Yelken antrenmanı · Yoklamayı aç" ve fitness satırları (ad, antrenman, Yaptı/Bekliyor/Yapmadı/Atladı). Alt satırda "bu hafta 1/3 fitness". Sporcuların fitness'ı yalnız ana hesapta. `fitDays`, `dayTap`, `fitHref`, `trainingWeek(…, fit)` (homeTiles.js); `DayPick` (HomeSummary.jsx); FitnessHome `gun` parametresi. Ek okuma yok, kural değişikliği yok. Testi `test:elle` › "Ana sayfa kartları" › "fitness günleri".

## Sıradaki işler

- Telefonda dene: sporcuya fitness verilen bir günde ana sayfadaki Antrenman kartında güne dokun; yelken de varsa seçim penceresi çıkmalı, yalnız fitness varsa Fitness › Sporcular o günle açılmalı.
