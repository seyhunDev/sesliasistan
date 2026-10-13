## Nerede kaldım

- Süreli harekette geri sayım ve kayıt (Seyhun: "süresi olan her harekette geri sayım muhakkak olsun, 5 dakika olanlarda da; hangi sürede geçildi, tamamlandı mı kaydedilsin"; telefonda denenmedi): adım adım antrenman ekranında süreli (sn) ve kardiyo (dk) hareketlerde büyük geri sayım halkası (0:30, 5:00). "Başlat" ile başlar, "Duraklat / Devam et", son 3 saniyede kısa bip, süre dolunca uzun bip + titreşim, set kendiliğinden tamamlanır ve dinlenme başlar; ekran kararmasın diye kilit alınır. Erken "Bitirdim" denirse kaç saniyede geçildiği yazılır. Sette yeni alanlar `took` (yapılan saniye) ve `full` (süre doldu mu) (`cleanRes`, `goalSec`, `clockText`, `setTimeText`, model.js; `useSetClock`, `Clock`, FitGuided.jsx). Listede süreli setin dairesine dokununca adım adım ekran o setten açılır (geri sayımsız işaretlenmez). Set altında "Tamamlandı · 0:30" (yeşil) ya da "0:18'de geçildi (hedef 0:30)" (kırmızı); sonuç satırında (ana hesabın gördüğü günlük liste dahil) "Plank 3 × 30 sn (2. set 0:18'de geçildi)". Testleri `test:elle` › "Fitness antrenman ekranı".

## Sıradaki işler

- Telefonda bir süreli hareketle (plank 30 sn, koşu 5 dk) dene: bip sesi iPhone sessizdeyken çıkmayabilir; ekran kararmadan sayıyor mu bak.
