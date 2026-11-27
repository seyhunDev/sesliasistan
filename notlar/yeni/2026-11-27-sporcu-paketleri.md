## Nerede kaldım

- Sporcu paketleri: 3 ücretsiz, 10/15/20 sporcu (aylık 149/199/249 ₺, yıllık 1490/1990/2490 ₺). Ödeme havale: Ayarlar › Paketim → paket seç → havale bilgisi + açıklama kodu (VLR-…) → "Ödemeyi yaptım" → Seyhun'a bildirim → Ayarlar › Admin › Paketler › Onayla → paket açılır. IBAN ve alıcı adı Admin › Paketler › Havale bilgisi'nden girilir (depoda yok).
- Sınır sunucuda: yeni sporcu yalnız /api/sporcu-ekle'den (402 dolu); firestore.rules istemciden yeni sporcu belgesini yalnız Velora ana hesabına bırakır; users.paket/paketIstek/dogrula istemciden değişmez.
- Kurallarda düzeltilen açık: `match /athletes/{aid}/{sub=**}` sporcunun kendisini de kapsıyordu (boş yol); `/{sub}/{rest=**}` yapıldı.
- Kayıt yarışı düzeltildi: AuthProvider kayıt sürerken boş profil açıyordu, kayıttaki spor ve via yazılamıyordu (yeniden "Hangi spor?"). lib/auth.js `kayitSuruyor`.
- E-posta doğrulama: kayıtla açılan hesap (users.dogrula) bağlantıya dokunana kadar DogrulaGate'te; sunucu doğrulanmamış hesaptan sporcu ve paket isteği almaz. Şifremi unuttum girişte zaten vardı, teste eklendi.
- Yeni uçtan uca test: `npm run test:yeni-kullanici` (32/32 geçti).
- Kayıt hâlâ kapalı (NEXT_PUBLIC_ALLOW_SIGNUP); açma kararı Seyhun'da.

## Sıradaki işler

- Seyhun firestore.rules'u Firebase konsolundan yayınlamalı.
- Admin sayfalarında önceden var olan geliştirme uyarısı: "Each child in a list should have a unique key" (OuterLayoutRouter; Kulüpler sayfasında da). Testte bilinen olarak geçiliyor.
- Kaydı açmadan önce: KVKK aydınlatma/onay metni; e-posta gönderen adı/şablonu Firebase konsolunda (Authentication › Templates) Türkçe ve "Velora" olarak ayarlanabilir.
- Paket süresi bitince hatırlatma bildirimi yok (sonra).
