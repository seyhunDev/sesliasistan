## Nerede kaldım
- Velora'dan Velora Sanal'a (market) tek dokunuşla giriş (Seyhun 2026-10-24: "markete tıklayınca Velora Sanal'a gider, kullanıcı olarak girer"; telefonda denenmedi): `/api/sanal-giris` kimliği yönetici SDK'sıyla doğrular, ana hesap / çalışan / aile için 1 saatlik özel giriş anahtarı (custom token) verir. `src/lib/sanal.js` `openSanal()` anahtarı alır ve `https://velora-sanal.netlify.app/giris#t=…` adresine geçer (anahtar # kısmında, sunucuya gitmez); olmazsa site yine açılır, orada şifreyle girilir. Market düğmesi henüz buna bağlı değil (Market sohbeti bağlayacak).

## Sıradaki işler
0. Market düğmesi `openSanal()`'ı çağırınca telefonda şifresiz açılıyor mu dene (iPhone uygulamasında başka siteye geçiş Safari'de açılabilir).
