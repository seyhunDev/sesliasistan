## Nerede kaldım
- Yarış multimedya sayfasında start sayacı artık sayfada yürüyor (Seyhun: "diğer sekmeleri dolaşırken de süreyi göstermeliyiz... sesler de çalışmalı"; telefonda denenmedi): Countdown.jsx'te `useTimer` (telefondaki kaydı olayla okur) ve `useTimerRun` (saat, bipler, onZero, ekran açık) ayrıldı; RaceMedia `useTimerRun({ mode: "start" })` çalıştırır, Süre sekmesindeki Countdown `run={false}` yalnız gösterir. Sayaç sürerken diğer sekmelerde sekmelerin altında "Start sayacı 3:42" satırı (son 10 sn kırmızı, 0'dan sonra "Startan beri"); dokununca Süre. Sayaç 0 olunca yarış satırı yazma da sayfaya taşındı.
- Gün seçimi: bugün yarış günlerinden biriyse o gün açılır; yarıştan önce ilk gün, sonra son gün.
- Antrenman sayacı değişmedi (Countdown kendi yürütür).

## Sıradaki işler
1. Telefonda dene: Süre'de 5 dk başlat, Hava/Medya'ya geç; 4:00, 1:00 ve son 10 sn bipleri geliyor mu, satıra dokununca Süre açılıyor mu. iPhone sessiz modda ve uygulama arka plandayken ses çıkmaz.
