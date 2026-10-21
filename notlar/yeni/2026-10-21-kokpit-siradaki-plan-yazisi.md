## Nerede kaldım

- Ana sayfa kokpitindeki sıradaki plan (Cockpit.jsx NextPlan): solda büyük yazı bugünse saat (saatsizse "Bugün"), sonraki günlerde "Yarın" ya da "3 gün"; altta bir kez tam gün adı, tarih ve saat ("Cuma 24 Eki 10:00 · yer"). Eskiden "Cum" + "Cuma · 10:00" tekrar ediyordu.
- Kokpitte gösterilen plan aşağıdaki takvim listesinde tekrar yazmıyor (skip); Seyhun yeni eklediği planı listede göremeyince sordu, büyük ihtimalle bu.
- Kendi kendine yenilenme olası nedenleri: yeni sürüm yayınlanınca eski sayfa parçası bulunamazsa (crash.js isChunkError → reloadOnce), Firestore iç hatası (healFirestore), iOS'un arka plandaki PWA'yı bellekten atması.
- Telefonda denenmedi.

## Sıradaki işler

- Yenilenmenin nedenini kaydetmek (hangi yol yeniledi) gerekirse çevrimdışı thread'iyle konuşulacak.
