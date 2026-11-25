## Nerede kaldım

- Velora Sailing'e Velora hesabıyla tek dokunuşla giriş (Seyhun 2026-11-13: "Velora hesabıyla giriş yaptıysam ve Velora'dan bu sayfaya geliyorsam kendi hesabımla açılmalı"; telefonda denenmedi). Professional Sailing'in adı ve adresi Velora Sailing oldu: https://seyhundev.github.io/velora-sailing/ (`SIMULATOR_URL`). Ana sayfadaki kartın adı "Velora Simülatör" → "Velora Sailing".
- Yöntem Velora Sanal ile aynı: yeni `/api/sailing-giris` kimliği doğrular, 1 saatlik özel giriş anahtarı (custom token) döner; anahtarda `vs` (işletmenin ana hesabı "sahip", diğer hesaplar "kayitli") ve `ad` bilgisi var. `externalLinks.openSailing` sekmeyi dokunuş anında açar (iPhone engellemesin), anahtarı adresin `#t=` kısmında gönderir; anahtar alınamazsa site yine açılır. Uygulama kabuğunda (Capacitor) anahtar gelince Safari'de açılır.
- Velora Sailing tarafı (`seyhunDev/velora-sailing`, `src/js/velora-auth.js`) aynı Firebase projesine (sesliasistan-3e95a) bağlanır; Firebase web ayarları (apiKey, appId) oraya yazılınca çalışır.

## Sıradaki işler

0. Netlify'a yayınladıktan sonra ana sayfada "Velora Sailing" kartına dokun: Velora Sailing giriş ekranı çıkmadan senin hesabınla (Sahip) açılmalı.
0. Google Cloud'da Firebase tarayıcı anahtarında web sitesi kısıtı varsa `seyhundev.github.io/*` eklenmeli (yoksa Sailing'de giriş "Giriş yapılamadı" der).
