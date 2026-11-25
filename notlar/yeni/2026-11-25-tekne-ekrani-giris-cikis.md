## Nerede kaldım

- 2026-11-25 Tekne (bilgi) ekranı girişi ve çıkışı (Seyhun "isim/yelken no sormasın, geri yerine Çıkış, çıkınca Yönet'te Offline ve konum görünmesin"):
  - Hesapla girişte katılma kartı isim sormaz: isim hesabın adı, yelken no sporcu kaydından (`athleteAtt/{uid}.sailNo`, `mirror.js` syncAthleteAtt yazar; ana hesap Sporcular'ı açınca eşitlenir). Yelken no yoksa yalnız o yazılır ve hesaba kaydedilir (`users/{uid}.bilgiKim`), sonra sorulmaz. Hepsi `bilgiStore.js` `useTekneKim` / `saveTekneKim`. Girişsiz link (`/ekran/{key}`) eskisi gibi (bu telefonda saklı, Değiştir).
  - Ayarlar › Tekne ekranı (`Groups.jsx` `TekneKimRow`): yelken no ve isim değiştirilir; boş bırakılan alan hesaptaki/kayıttaki değere döner. Sporcu, öğrenci ve ana hesapta görünür.
  - Ekranda geri düğmesi yerine sol üstte "Çıkış" (iki dokunuş: "Çıkılsın mı?" 3 sn). GPS, iz, pusula kaydı, ses, ekran kilidi durur; `bilgiTekne/{cihaz}` konumsuz ve zamanı LIVE_MS geriye alınmış yazılır (`offPos`, kural değişmeden) → Yönet'te hemen Offline. Arka plana atılınca ya da sayfa kapanınca da aynısı yazılır, öne gelince yeniden konum gider; yazı gitmezse 90 sn sonra yine kapalı sayılır.
  - Yönet haritası yalnız açık (son 90 sn) tekneleri çizer (`BilgiAdmin` `liveBoats`); Tekneler listesinde kapalı olan "Offline".
  - firestore.rules değişmedi. Telefonda denenmedi.

## Sıradaki işler

- Seyhun sporcu hesabıyla telefonda dene: katıl (isim/yelken no hazır mı), Çıkış, Yönet'te Offline ve konumun kaybolması.
- Yelken no gelmezse ana hesap Sporcular sayfasını bir kez açsın (kopya eşitlenir).
