## Nerede kaldım

- Hata (#514 ekran testi): Planlar/Görevler/Notlar/Takvim sayfasında asistana söylenen ilk cümle, soru değilse hep yeni kayıt sanılıyordu (`assistRoute.js` "prefer" → createAs). "dişçi randevusunu sil" onay sormak yerine "Bunu kayda çeviremedim" diyordu; "Ege'ye yaz…" mesaja gitmiyordu.
- Düzeltme: silme/iptal/erteleme/tamamlama/değiştirme cümleleri (`CHANGE`) ve kişiye mesajla başlayan cümleler artık "prefer"e girmez; normal yoldan (yerel komut, onay, mesaj) gider.
- Test: `npm run test:asistan` › "Tür sayfasında ilk cümle". Telefonda denenmedi.

## Sıradaki işler

- Kasaya gelir ("kasaya 500 lira gelir yaz") onay istesin mi: Seyhun'un cevabı bekleniyor.
