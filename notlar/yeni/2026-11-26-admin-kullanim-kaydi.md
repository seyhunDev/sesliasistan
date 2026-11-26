## Nerede kaldım
- Admin sayfası ve kullanım kaydı (Seyhun 2026-11-26 "yap", örnek project-files/admin-sayfasi/ornek.html; telefonda denenmedi):
  - Ayarlar › Kişiler ve hesaplar › **Admin** (yalnız ana hesap; yanında yeni başvuru sayısı) → `/settings/admin` (`src/features/admin/AdminPage.jsx`): üstte Yeni başvuru / Bugün giren / 7 gün; Başvurular (dokununca telefon, e-posta, Ara / Mail / Kişilere ekle, durum Yeni / Arandı / Hesap açıldı, Sil) ve Kullanım (son 14 gün giren kişi grafiği, kişi kişi son görülme; dokununca cihaz, sürüm, 7 günün sayfa süreleri, giriş-çıkış saatleri).
  - Başvuru: `POST /api/basvuru` (girişsiz; `{ rol, ad, tel, mail, kulup, kaynak, web }`, `web` gizli bot alanı). Kontroller `src/lib/basvuru.js` (telefon yalnız Türkiye cep: +90 sabit, başında 0 yok, 5 ile başlar, 10 hane; e-posta biçimi, yazım hatası önerisi). Kayıt `orgs/{ana hesap}/basvurular` (yalnız sunucu yazar), ana hesaba bildirim `cat: "basvuru"`. Ana hesap: Netlify `TANITIM_ORG` (isteğe bağlı) ya da tek ana hesap. Aynı yerden saatte 5, aynı numaradan günde 1.
  - Kullanım kaydı: izin sorusu (bir kez, ana sayfada 15 sn sonra; yalnız "Kaydedilen" listesi, kaydedilmeyenler gösterilmez) ve Ayarlar › Hesap › Kullanım kaydı anahtarı (herkeste). Yalnız "Kabul" diyen hesap: sayfa ADI ve süresi, giriş-çıkış, cihaz, sürüm (`src/lib/kullanim.js`, `src/features/kullanim`). Telefonda birikir, 5 dakikada bir ve arka plana geçince tek toplu yazma: `orgs/{org}/kullanim/{uid}` (+ `gunler` haritası) ve `.../gun/{gün}`. 90 günden eskisi silinir; izin geri alınınca o hesabın kayıtları silinir. Çocuk sporculara da sorulur.
  - firestore.rules: `orgs/{org}/kullanim/{uid}` (+ `gun`) kişinin kendisi yazar/okur/siler; ana hesap hepsini okur. Seyhun konsoldan yayınlamalı, yoksa ana hesap dışındakilerin kaydı yazılamaz.
  - Testler: `npm run test:elle` "Başvuru ve kullanım kaydı" 17/17.

## Sıradaki işler
0. Telefonda: izin sorusu çıkıyor mu, Kabul sonrası Admin › Kullanım'da 1-2 dakikada görünüyor mu; tanıtımdan deneme başvurusu ve bildirim.
1. Tanıtım sayfası (/tanitim) formu `/api/basvuru`'ya bağlanacak (tanıtım işi).
