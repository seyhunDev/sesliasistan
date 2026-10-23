## Nerede kaldım

- Velora Yemek kurye hesabı: giriş ekranında "Kurye olarak kayıt ol" (`/kurye-kayit`): ad, telefon, kullanıcı adı, şifre. Hesabı sunucu açar (`/api/kurye`, action register), kayıt yalnız Yönetim › Kuryeler'de "Kurye kaydı" açıkken açık (sunucu `yemekKayit/acik` belgesine yazar).
- Kurye profili `users/{uid}` = { role: "courier", orgId: uid, courierOf: işletme }. Kendi boş işletmesi olduğundan diğer sunucu işleri ana hesabın verisine ulaşamaz.
- Kurye girince uygulamada yalnız kurye ekranı açılır (`(app)/layout.jsx` → `CourierSelf`; alt çubuk, asistan ve diğer veriler yok). Ekran açıkken konumu ayardaki kurye satırına (dakikada bir), yoldaki siparişine (10 sn'de bir) sunucu üzerinden yazılır.
- Kurye Firestore'da yalnız okur (yemekSiparisler, yemek/ayar); teslim alma, teslim etme ve konum `/api/kurye` ile. Adımların yaması ortak: `src/yemek/steps.js`.
- Yönetim › Kuryeler: "Kurye kaydı" anahtarı; hesaplı kurye silinince hesabı da kapanır.
- firestore.rules değişti: kurye okuma kuralı ve users güncellemesinde courierOf kilidi. Konsoldan yayınlanmalı.

## Sıradaki işler

- Telefonda dene: kayıt aç, ikinci telefonda kurye ol, sipariş ver, kare kodla teslim al, teslim et.
- Konum yalnız uygulama açıkken paylaşılır (PWA arka planda konum veremez); iPhone uygulamasında arka plan konumu ayrı iş.
