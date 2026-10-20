## Nerede kaldım

- Asistan motoru 1. adım (plan: /mnt/project-files/asistan/motor-plani.md, örnek /mnt/project-files/asistan/motor-ornek/ornek.png, Seyhun onayladı):
  - Dinlerken "Dinliyorum" yazısının solunda nokta: mikrofondan gerçekten ses verisi geliyorsa yeşil, gelmiyorsa gri (`src/features/speech/MicDot.jsx`, `meter.js` setMicFlow/readMicFlow, `micCheck.js` artık ses gelir gelmez "ok").
  - Geliştirici bilgisi: asistan sayfasında her cevabın altında küçük gri satır: yazıya çevirme, yerel süre, yapay zeka süresi (ilk parça), model, bugün bu telefondan kaç istek; hata olursa nedeni (`assistTiming.js` devLine/timingInfo/aiCount, `cevap.js` turn.dev, `AssistantSheet.jsx`). Sunucu yanıtı artık `model` alanı da döndürüyor (`gemini.js` modelOf).
  - Ayarlar › Diğer ayarlar › Asistan süre kaydı içinde: "Asistan sayfasında süreleri göster" anahtarı (varsayılan açık) ve "Örnekleri dene": yapay zeka işlerinin örnek cümleleri (assistTasks.js, ~17) sırayla ana asistana gider, kayıt yapılmaz; doğru tür, süre, ilk parça ve model listelenir, Kopyala ile alınır (`src/lib/aiProbe.js`).
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun: Ayarlar › Diğer ayarlar › Asistan süre kaydı › Örnekleri dene › Başlat; sonucu Kopyala ile thread'e yapıştır. Birkaç sesli komut sonra cevap altındaki gri satırlara bak.
- Asistan motoru 2. adım: süre sınırları (Netlify ~10 sn; asistan ve iş listesi uçları 9 sn içinde bitsin).

## Asistan

- Geliştirici bilgisi geliştirme süresince açık; bitince Ayarlar'dan kapatılır ya da varsayılan kapalı yapılır.
