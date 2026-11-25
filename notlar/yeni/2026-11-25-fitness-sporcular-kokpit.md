## Nerede kaldım
- Fitness › Sporcular yeni tasarım (Seyhun 2026-11-25: "çok karma, yazılar okunmuyor", üç yönden "B · Kokpit"i seçti; örnek project-files/fitness-sade/ornek.html; telefonda denenmedi): `FitnessHome.jsx` Sporcular sekmesi artık `main.acik` (açık), üstte lacivert `.ck` (geri, Fitness, ⋯, + Program, sekmeler, bugünün tarihi, dev rakam, durum çubuğu), ortak `ScrollBar`. Altta duruma göre gruplar (`Group`, `AthRow`, büyük yazı): Yapmadı (Hatırlat) · Bekliyor · Yaptı · Atladı · Bugün antrenmanı yok · Programı yok. Eski `AthCard`, `SecHead`, `athLine` kalktı; "Gün gün" ⋯ içinde. Koyu sekmelerde seçili sekme beyaz.
- "Hatırlat": `fitnessData.nudgeFit` → `/api/notify` `event: "fitNudge"` (yalnız ana hesap; plan `fit.for` sporcusuna "Bugünkü antrenmanın bekliyor: …", gidince plana `fitNudgeAt`, antrenman başına bir kez).

## Sıradaki işler
0. Telefonda Fitness › Sporcular: lacivert üst, gruplar, Hatırlat bildirimi sporcuya gidiyor mu.
1. Benim ve Beslenme sekmeleri aynı "B · Kokpit" diline geçecek (örnek önce).

## Tasarım
- Fitness "B · Kokpit" (2026-11-25): açık sayfa + lacivert kokpit üst, dev rakam ve durum çubuğu; liste duruma göre gruplu, önce ilgilenilmesi gerekenler. Satır adı 17, alt yazı 15 punto.
