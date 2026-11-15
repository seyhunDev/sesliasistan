## Nerede kaldım

- Sporcu bilgi ekranı eklendi (Seyhun 2026-11-15; örnek /mnt/project-files/bilgi-ekrani/ornek.html, 2. örnek "güzel olmuş"). İki sayfa: `/bilgi` (gösterim) ve `/bilgi/yonet` (yönetim, yalnız ana hesap). Ana sayfada "Bilgi ekranı" paneli: Ekran (ana hesap + sporcu) · Yönet (ana hesap) (`features/bilgi/BilgiTile.jsx`, OwnerHome side.body).
- Gösterim (`features/bilgi/BilgiScreen.jsx`, `bilgi.css` `.bz-*`): başlıksız tek ekran, alt çubuk yok (layout `live`). Saat (saniyeli), pusula (telefonun baktığı yön, derece + K/KD…, kayan şerit), start sayacı (5·4·1·0, P bayrağı 4–1 dk, start sonrası +mm:ss), parkur çizimi (Trapez / Üçgen / İniş çıkış; rüzgâr şimdilik 0) + parkur durumu yazısı, gelen mesaj (60 sn görünür, sesli okunur, speechSynthesis tr-TR). Sol üstte soluk küçük geri oku. İlk açılışta bir kez "Başlat": pusula izni, ses, ekranın açık kalması (Wake Lock), tam ekran.
- Bas-konuş: yönetimde "Bas konuş" basılı tut → bırakınca ses kaydı (en çok 20 sn, 32 kbit/sn) `orgs/{org}/bilgi/ses` belgesine base64 yazılır; açık ekranlar 1-2 sn içinde çalar (kulaklık takılıysa kulaklıktan), çalarken sağ üstte soluk mikrofon. Telefon kilitliyken çalmaz.
- Veri `orgs/{org}/bilgi/ekran` (timer, label, course, state, msg). Ekranlar onSnapshot dinler (okuma yalnız değişince). Sayaç: ana hesabın ortak sayacı (Countdown; Yayın › Süre, antrenman, yönetimdeki sayaç aynı) `BilgiSync` (layout) ile yazılır, yalnız yönetimde Start "Ekranda" seçiliyse (bu telefonda saklı, `sa-bilgi-on`).
- firestore.rules: `match /bilgi/{id} allow read: if isStaff(orgId)` (sporcu, çalışan okur). Seyhun konsoldan yayınlamalı.
- Asistan: "bilgi ekranına yaz/söyle: …" (mesaj gönderir), "bilgi ekranını aç", "bilgi ekranını yönet" (`isler/bilgi.js`, `lib/bilgi.js` bilgiCommand, assistRoute "bilgi"). "sporculara söyle" Mesajlar grubuna gitmeye devam eder.
- Telefonda denenmedi.

## Sıradaki işler

- Android telefonda dene: Ekran › Başlat, yönetimden mesaj gönder ve Bas konuş.
- Parkurdaki rüzgâr: bizim ölçüm/cihaz gelince 0 yerine gerçek değer.
- Telefon kilitliyken ses (Xcode / yerel uygulama işi), istenirse canlı telsiz.
- Parkur durumu Yayın › Dönüş'ten kendiliğinden gelebilir.

## Tasarım

- Bilgi ekranı: lacivert, başlıksız, dokunulmaz tek ekran; dikeyde alt alta (saat·pusula, start, parkur, mesaj), yatayda solda saat·pusula·start, sağda parkur ve mesaj. Geri oku küçük ve soluk, yuvarlak yok.
