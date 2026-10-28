## Nerede kaldım
- Yarış takvimi (Seyhun 2026-10-28: "ortak yarışları sadece sporcular değil, kullanıcılar görecek… ileride üye olanlar da"; örnek /mnt/project-files/yaris-tasarim/takvim/ornek.png onaylı; telefonda denenmedi):
  `/races` (src/features/raceCal/RaceCalendar.jsx): giriş yapmış herkes; lacivertte arama + Yaklaşan | Geçmiş, ay ay ortak yarışlar.
  `/races/[id]` (SharedRaceView.jsx): kalan gün, Talimat (PDF indirme adresi) · Sonuçlar; altta talimat bilgileri (NoticeDetails). Yarışlar sayfası açık kulüp ana hesabında altta "Kulübüme ekle" (`addToClub`: kulüpte varsa onu açar, yoksa ortaktan yeni yarış).
  Sonuçlar: sınıf çipleri + Junior/Bambino/Kızlar (kendi içinde sıra), arama ad/kulüp/yelken no, altta sonuç PDF'i.
  Ana sayfa › Tümü › Kulüp: "Tüm yarışlar" (etiket 12 harf sınırı). Sesle "yarış takvimini aç", "tüm yarışları göster" (nav raceCalendar).
  Saf yardımcılar lib/sharedRace.js (calendarOf, shortRange, fleetsOf, filtersOf, rankView); test `test:yaris` › Yarış takvimi, `test:asistan` yönlendirme.
  Yönetim (sporcu, evrak) hâlâ NEXT_PUBLIC_SPORCU_EMAILS ile; başka kulüpler üye olunca "kulüp hesabı" olanlara açılacak.

## Sıradaki işler
0. Telefonda: Tümü › Tüm yarışlar; bir yarış, Talimat, Sonuçlar; çalışan/sporcu hesabıyla da açılıyor mu (Firestore kuralı yayınlandıysa).
