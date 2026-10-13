## Nerede kaldım

- Bildirim haritasındaki kopukluklar kapatıldı (Seyhun: "eksiklikleri sırasıyla düzeltelim"; telefonda denenmedi):
  - Çalışanın aldığı yoklama da "alındı" sayılır. Yoklama kaydedilince uygulama `/api/notify` `attTaken` ile sunucuya haber verir. Sunucu ana hesabın kaydına `attLast` yazar (`markAttTaken`, athletes/attTaken.js).
  - Kulüp sitesinden girilen yoklama: uygulama sporcuları okuduğunda bugüne yoklama yazılmışsa "alındı" sayılır (`attTakenIn`, attRemind.js; athletes/data.js). Bunun için uygulamanın o gün sporcuları okuması gerekir (Sporcular, Yoklama, Aidatlar, asistan…). Hiç açılmadıysa hatırlatma yine gelebilir. Hatırlatmaya dokununca yoklama sayfası açılır, alınmış görünür.
  - Velilere giden aidat hatırlatması artık ana sayfaya değil zil penceresine gider (`/?bildirim=1`, OwnerHome); zilde dokununca tam metni açılır (`inboxLink`).
  - Plan hatırlatması zamanlayıcı bir turu kaçırınca kaybolmuyor. Saatli planda plan başlayana kadar (en çok 60 dk) geç de gider; geç giderse kalan gerçek süreyi yazar ("30 dk sonra"). Tüm gün ve "1 gün önce" hatırlatmasında pencere 60 dk (`remindWindow`, `reminderText(…, { tz })`, reminders.js).
  - Kural değişikliği yok. Testleri `test:elle` › "Plan hatırlatmaları", "Yoklama hatırlatması".

## Sıradaki işler

- Telefonda dene: bir çalışan hesabıyla bugünün yoklamasını al; antrenman bitince ana hesaba "Yoklama alınmadı" gelmemeli.
- Bilerek değişmeyenler: özetler Ayarlar'dan açılmadan gelmez, zil 30 bildirim tutar, telefon kaydı olmayan cihaza yalnız zile yazılır.
