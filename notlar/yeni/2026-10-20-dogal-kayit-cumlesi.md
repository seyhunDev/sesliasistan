## Nerede kaldım

- Doğal cevap kalıplarının ilk parçası yapıldı (`savedLine`, `src/lib/sayLines.js`).
  - Kayıt cümlesinin açılışı sırayla değişiyor: "Ekledim", "Tamam, ekledim", "Kaydettim".
  - Saatsiz tek plan: "Kaydettim: Antrenman, yarın, saatsiz. İstersen saatini söyle, hemen ekleyeyim." Bu durumda "Başka bir isteğin var mı?" sorulmuyor, mikrofon cevap için açılıyor.
  - Cevap "akşam 6'da", "17:30", "saat 10" ya da "5'te" (17:00 sayılır) ise yapay zekaya gitmeden plana yazılıyor: "Tamam, “Antrenman” saat 18:00."
  - "Gerek yok", "hayır", "kalsın" denirse: "Tamam, saatsiz kalsın." Başka bir istek söylenirse teklif düşüyor, istek normal yapılıyor.
  - Görev listesi sürerken teklif yapılmıyor.
- Ekran testi: saatsiz plan ve saat cevabı (Onaysız kayıt grubu 8/8).

## Sıradaki işler

- Diğer işlerde de eksik bilgi teklifi: görev için son tarih, mesajda alıcı yoksa.
- Hızlı kalıplar ölçme (Firestore kuralı).
- Fatura, harcama, okunmamış mesaj soruları telefonda.

## Asistan

- Doğal cümle yerelde kurulur; eksik bilgi soru olarak teklif edilir, cevap yerelde işlenir (Seyhun, 20 Ekim).
