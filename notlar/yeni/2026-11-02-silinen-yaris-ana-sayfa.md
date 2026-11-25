## Nerede kaldım
- Silinen yarış ana sayfada kalıyordu (Seyhun 2026-11-02). İki sebep: ana sayfa yarış özeti (raceHome.js) 5 dk bellekte ve telefonda (`sa-race-home`) tutuluyordu, silinince tazelenmiyordu; yarışın planı ("Yarış" planı ve "Ad: son tarih" planları) silinmiyordu, Sıradaki kartında duruyordu.
- Düzeltme: `deleteRace` (races.js) `sa-race-gone` olayı atar; `useRaceHome` silinen yarışı hemen düşürür, saklanan özeti yazar, belleği sıfırlayıp yeniden okur. `wipeRace` (raceWipe.js) `dropRacePlans`: plans'tan cat/category "Yarış" olanları okur, `racePlansOf` ile o yarışınkileri siler (plan listesi canlı, ana sayfa ve takvim kendiliğinden güncellenir).
- Test: yaris.mjs "yarış silinince planları ve ana sayfa satırı da gider". Telefonda denenmedi.
- Daha önce silinmiş deneme yarışının planı yeni sürümde kendiliğinden silinmez; Planlar'dan elle silinmeli.
- Ekran testinde "Antrenman yarışı sesle › 3 sn sonra" kırmızıydı, bu değişiklikle ilgisiz.

## Sıradaki işler
- Yok.
