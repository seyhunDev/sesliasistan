## Nerede kaldım

- Seyhun (2026-10-21): "bugün plan var mı" deyince aynı şeyi iki kez okudu, "notları da oku" dediğinde notları okumadı, ikinci basışta "ses algılanamadı". Sade ve istikrarlı sistem istedi, kartta "Evet, yeni sade sistem"i seçti.
- Yapay zeka önce: her istek yapay zekaya gider. Yerelde kalanlar yalnız kapat, evet/gönder/iptal, bekleyen taslak ve onaylar, cihaz işleri (fiş kamerası, toplantı kaydı, sayfa açma) ve özel akışlar (yoklama, envanter, yarış, günlük…).
  - Hızlı özet cevapları (`briefOf`), hazır kalıplar (`readyCreate`) ve yerel kayıt/tamamlama artık yalnız Ayarlar › Öğrenme › **Hazır cevaplar** açıkken (`src/lib/quickMode.js`, bu cihazda saklanır, varsayılan kapalı). Öğrenme ve hızlı kalıp ölçümü kapalıyken de sürer; seviye yeterli olunca düğmeyle açılır.
- Cevap bir kez okunur: ön bilgi (precue `info`, ör. "o saatlerde X planın da var") artık söylenmiyor ve sohbete yazılmıyor; yapay zekaya "TELEFONUN ÖN TAHMİNİ (kullanıcıya söylenmedi)" olarak gidiyor, gerekirse yapay zeka cevabında bir kez söylüyor.
- Mikrofon: kayıt yolunda (iPhone ana ekran uygulaması) asistan açık kaldığı sürece aynı mikrofon tutuluyor (`useSpeech({ hold: true })`); her turda yeniden açılmıyor. Asistan kapanınca bırakılıyor (`sp.release()`). Ölü mikrofon yakalanırsa tutulan da bırakılıp yenisi isteniyor.
- Testler: ekran testi 95/95 (bugün plan var mı → 1 yapay zeka isteği, 1 okuma; ikinci turda mikrofon yeniden istenmiyor; kapanınca mikrofon izi bitiyor). Telefonda denenmedi.

## Sıradaki işler

- Seyhun iPhone'da denesin: soru sor, cevabı dinle, Konuş'a yeniden bas; ikinci turda ses alınıyor mu? Hâlâ hata olursa ekrandaki yazının tamamını göndersin.
- Asistan açıkken iPhone'da turuncu mikrofon işareti sürekli yanar (beklenen). Okuma sesi kısık gelirse söylesin: tutulan mikrofon kapatılabilir.
- Hızlı kalıp ölçümü yeterli seviyeye gelince Hazır cevaplar açılıp denenir.

## Asistan

- Varsayılan: her istek yapay zekaya gider; yerel hazır cevaplar yalnız Ayarlar › Öğrenme › Hazır cevaplar açıkken.
- Sesli okunan tek şey yapay zekanın cevabıdır; telefon ön bilgi söylemez.
- Asistan açıkken mikrofon turlar arasında kapatılmaz (kayıt yolu), kapanınca bırakılır.
