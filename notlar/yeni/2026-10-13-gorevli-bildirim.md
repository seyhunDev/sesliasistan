## Nerede kaldım

- Plana görevli atanınca bildirim gitmiyordu (Seyhun: "kim plan için görevli olursa onun telefonuna bildirim gitmiyor, bildirimler açık"; telefonda denenmedi). Yol kodda doğru, ama gönderim başarısız olunca kimse bilmiyordu: sunucu kişiyi yine "bildirildi" sayıyordu, bir daha denenmiyordu. Olası nedenler: görevlinin uygulamada hesabı yok (Kişiler'de hesapsız kişi), görevlinin telefonunda bildirim kaydı yok (uygulama kendi hesabıyla açılmamış ya da Ayarlar › Bildirimler kapalı), aynı telefon ana hesapta da kayıtlı, VAPID anahtarı.
- Artık sunucu nedeni kaydeder (`ack.{uid}.x` {why, msg, at}; `sendTo(..., out)`, `WHY`, pushSend.js; /api/notify `fail`), yalnız gerçekten gidene "bildirildi" yazar. Plan/görev ekranında Sorumlu altında kırmızı "Bildirim gitmedi", nedeni ve ne yapılacağı (`pushWhy`, people.js), "Yeniden gönder" düğmesi (`resendAssign`, DataProvider; `retry`). Kaydedince de kısa uyarı çıkar. Sorumlu seçerken hesapsız kişide "· hesapsız" yazar. Kural değişikliği yok. Testleri `test:elle` › "Sorumlu bildirimi gitmedi".

## Sıradaki işler

- Görevlinin telefonunda: ana ekrandaki uygulamayı kendi hesabıyla aç, Ayarlar › Bildirimler'i aç, "Dene". Sonra planı açıp "Yeniden gönder"; ekrandaki nedeni yaz.
