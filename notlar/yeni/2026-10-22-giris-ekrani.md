## Nerede kaldım
- Giriş ekranı iki adım oldu (Seyhun: "klavye açılınca logo yukarı kayıyor… önce mail, doğru yazılınca yeşil, devam, sonra şifre"; telefonda denenmedi). Tüm ekran lacivert kokpit (`.ck`), logo + Velora üstte sabit (ortalanmaz, klavyede kaymaz). Adım 1: tek kutu e-posta ya da kullanıcı adı, yazarken küçük harfe çevrilir, doğru yazılınca yeşil çerçeve + ✓, Devam mor olur. Adım 2: hesap satırı (Değiştir), şifre (Göster), Giriş yap, Şifremi unuttum (adım 1'deki e-postaya gönderir; kullanıcı adında ana hesap yeniler yazısı). Kayıt sayfası lacivert içinde açık kartta. Dosyalar: `src/app/(auth)/layout.jsx`, `login/page.jsx`, `register/page.jsx`, `globals.css` (`.auth-in`), `src/lib/kinds.js` (`cleanLogin`, `validEmail`, `validLogin`; "ILAY" artık "ılay" olmuyor, Türkçe harfler kullanıcı adında sadeleşir). Test: `test:elle` › Giriş ekranı.

## Sıradaki işler
0. Telefonda giriş: klavye açıkken logo yerinde mi, yeşil ✓, Devam'dan sonra şifre kutusunda klavye kendiliğinden açılıyor mu, iPhone şifre doldurma çalışıyor mu.

## Tasarım
- Giriş ekranı (2026-10-22): lacivert tam ekran, logo üstte sabit, adım başına tek kutu + tek düğme. Doğru yazılan giriş kutusu yeşil çerçeve + ✓ (Seyhun istedi). Hesabın varlığı şifreden önce denetlenmez (hesapları ele vermesin).
