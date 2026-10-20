## Nerede kaldım

- Asistan istek haritası: /mnt/project-files/asistan/istek-haritasi.md (69 iş, hangisi telefonda hangisi yapay zekayla, hazır cümle verisi, bulunan karışıklıklar, sıradaki veri işleri).
- Yoklama soruları telefonda cevaplanıyor (`src/lib/attQuery.js`, `isler/yoklama.js` attQueryCmd, `assistRoute.js` moreKind "attQuery"): "bugünkü antrenmana kimler katıldı", "dün kimler gelmedi", "Ali bugün geldi mi", "bu ay Ali kaç antrenmana katıldı", "bu hafta en çok kim gelmedi", "pazartesi kimler geldi". Önceden yapay zekaya gidip planları getiriyordu.
- Soru bekleme yazısı sorunun konusunu söylüyor (`assistTasks.js` queryTopic): "Yoklama kayıtlarına bakılıyor", "Aidatlara bakılıyor"… Plan sayısı ("bugün 2 plan görüyorum") yalnız takvim sorusunda (`precue.js`).
- Hazır cümle setine `attendance.read` eklendi (`brain/seedPhrases.js`).
- Telefonda denenmedi.

## Sıradaki işler

- Sesli durum cümleleri (sesli yanıt açıksa okunur, kapalıysa yazı): "hemen ilgileniyorum" → "şunu yaptım, şimdi bunu yapıyorum" → "tamam, hepsi yapıldı" / "onay bekliyorum".
- Telefonda cevaplanabilecek diğer sorular (aidat borcu, kasa, yarışa gidenler, sporcu sayısı).

## Asistan

- Yoklama SORUSU (kim geldi/gelmedi, geldi mi, kaç gün) yoklama ALMA değildir; telefondaki yoklamadan cevaplanır, yapay zekaya gitmez.
- Soru bekleme yazısı yalnız sorunun konusunu söyler; konu bilinmiyorsa "Bakıyorum".
