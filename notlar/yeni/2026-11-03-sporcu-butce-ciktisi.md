## Nerede kaldım

- Yarış › Bütçe › Sporcu ödemeleri: her sporcunun satırında "Çıktı" düğmesi. Yalnız o sporcunun bütçe payı (kalem kalem, ödenecek toplam, kulübün karşıladıkları) tek sayfa PDF olarak uygulama içinde açılır; yazdırma ve Paylaş (WhatsApp, posta) oradan. Başlıkta "SPORCU BÜTÇESİ".
- Neden kaybolmuştu: sporcu sporcu bütçe payı "Veli" sekmesindeki bilgi notundaydı. 2026-10-28 (b2c2ccb1) Veli sekmesi kaldırıldı, bilgi notu Evrak › Veli bilgi notu satırına taşındı; Bütçe sekmesinde sporcu başına çıktı hiç yoktu. Özellik silinmedi, ama yeri gizli kaldı ve yolculuk/program ile birlikte geliyordu.
- Sesle (yarış sayfasındayken): "Ali'nin bütçesini gönder / çıkar / yazdır", "herkesin bütçesini hazırla" → Bütçe sekmesi açılır, yalnız bütçe payı PDF'i hazırlanır.
- Kod: `BudgetView.jsx` `onePdf`, `athleteSheet.js` `BUDGET_ONLY`, `assistMore.js` `raceHereCommand` (`only: "budget"`), `RaceEditor.jsx` `makeSheet(list, money)`, `isler/yaris.js`. Testler: asistan.mjs (3 cümle), yaris.mjs "yalnız bütçe".
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun telefonda dener: Bütçe sekmesinde bir sporcunun "Çıktı"sı, Paylaş ile WhatsApp'a gönderme.
