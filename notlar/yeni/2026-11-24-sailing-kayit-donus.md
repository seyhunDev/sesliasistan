## Nerede kaldım
- Velora Sailing bağlantısından gelen kişi Velora'ya kaydolup/girip aynı Sailing sayfasına döner (Seyhun 2026-11-24). Sailing giriş ekranı `/register?sailing=<yol>` ya da `/login?sailing=<yol>` açar; yol `src/lib/sailingReturn.js` ile 2 saat saklanır, oturum açılınca `/api/sailing-giris` anahtarıyla `velora-sailing.netlify.app<yol>#t=ANAHTAR&h=<asıl #>` adresine dönülür.
- `?sailing=` ile gelince kayıt `NEXT_PUBLIC_ALLOW_SIGNUP` kapalı olsa da açıktır, spor yelken seçili gelir, profile `via: "sailing"` yazılır. `/api/sailing-giris` bu hesaplara "sahip" değil "kayitli" verir.

## Sıradaki işler
- Kullanıcı telefon ve iPad'de çıkış yapıp deneyecek.
- Sailing'den kaydolan sporcu Velora'da kendi (boş) işletmesinin sahibi olarak açılıyor; ileride sporcuya sade bir Velora ekranı düşünülebilir.
