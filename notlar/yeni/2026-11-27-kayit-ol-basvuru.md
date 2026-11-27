## Nerede kaldım

- Giriş ekranında artık her zaman "Hesabın yok mu? Kayıt ol" var (Seyhun 2026-11-27, kart: "Başvuru formu (Katıl ile aynı)").
- Kayıt kapalıyken (NEXT_PUBLIC_ALLOW_SIGNUP yok) `/register` tanıtımdaki "Velora'ya katıl" formunun aynısını açar: Antrenör / Kulüp / Sporcu / Veli, ad soyad, +90 cep, e-posta (Düzelt önerisi), kulüp ve şehir. Kurallar `src/lib/basvuru.js`, gönderim `/api/basvuru` (kaynak "Uygulama"), Ayarlar › Admin › Başvurular'a düşer. Bileşen `src/features/auth/Basvuru.jsx`.
- Velora Sailing'den gelen (?sailing=) için eski açık kayıt aynen duruyor.
- Telefonda denenmedi.

## Sıradaki işler

- İlk girişte kısa tanıtım (/tanitim/kisa uygulama içinde, Atla, sonda "Velora'da ayrıca" listesi), eski slaytların ve gereksiz "Hangi spor?" sorusunun kalkması: örnek https://claude.ai/artifact/VthKvT3KXJ2W7CkGYcsK3a, Seyhun'un "yap"ını bekliyor.
- Başvurular'dan tek dokunuşla hesap açma (şimdi "Kişilere ekle" ile elle).

## Asistan

- Kayıt modeli: kendi kendine açık kayıt yok; "Kayıt ol" ve tanıtımdaki "Hemen katıl" aynı başvuruyu bırakır, hesabı ana hesap açar.
