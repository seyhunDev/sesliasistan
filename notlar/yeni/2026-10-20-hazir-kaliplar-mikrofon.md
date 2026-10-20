## Nerede kaldım

- Hazır kalıplar: `src/data/hazir-kaliplar.json` (biçim: `{surum, kaliplar:[{is, soz, beklenen?}]}`). Seyhun GitHub'da bu dosyaya satır ekleyebilir; uygulamayla birlikte gelir, Firebase'e yazmak gerekmez. Okuyucu `src/lib/brain/readyData.js`.
  - Okuma işleri (bugün/yarın/hafta planları, notlar, görevler, gün özeti): sözler hızlı kalıp eşlemesine (seedMatch `SEED`) ve öğrenme modeline (store.js `guess`, hazır dersler + öğrenilenler) eklenir.
  - Kayıt işleri (plan/görev/not ekle): cümle birebir eşleşirse ve yerel çözümleme `beklenen` ile tutarsa yapay zekasız taslak (assistRoute `readyCreate`).
- Soru sorunca (saat, tarih, kim) mikrofon okumadan 700 ms sonra yine kendiliğinden açılıyor (`listenOnce`).
- Mikrofonun ikinci basışta ses alamaması (kapat-aç düzeltiyordu):
  - Elle basış her zaman temiz başlar: kendiliğinden açılmış bir dinleme sürüyorsa kapatılır.
  - Konuşan yanıt mikrofon açılmadan susturulur (önceden açıldıktan sonra susturuluyordu).
  - Okuma az önce bittiyse ya da susturulduysa mikrofon 0,6 sn bekleyip açılır (`src/lib/speech/playback.js`, `MIC_SETTLE_MS`).
- iPhone'da denenmedi.

## Sıradaki işler

- Seyhun telefonda denesin: soru sor, cevabı dinle, hemen Konuş'a bas. Hâlâ olursa ekrandaki hata yazısının tamamını göndersin.
- Sporculara mesajda onay kuralını Seyhun seçecek: okuyup sesle onay ya da 3 sn çubuk. Ayrıca "onayını bekliyorum" denmesinin nedenine bakılacak.

## Asistan

- Hazır kalıp verisi depoda tutulur (`src/data/hazir-kaliplar.json`), Firebase'de değil.
