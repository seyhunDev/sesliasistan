## Nerede kaldım

- Velora herkese açık, 2. adım (Seyhun 2026-11-27): sporcu işleri artık e-posta listesine (NEXT_PUBLIC_SPORCU_EMAILS) değil, hesaba bağlı.
- Her ana hesap kendi alanındaki (orgs/{uid}/athletes, sailingClasses, coaches, takim) sporcuları yönetir: ekle, sınıf, antrenör, A/B takım, sporcu girişi, yoklama, yarışlar, Yönet, aidat.
- İstemci: `features/athletes/access.js` canSeeAthletes(email) = oturumdaki ana hesabın e-postası (AuthProvider setAthleteAccount, profil belgesi okununca). Sunucu: `lib/server/athleteAccess.js` ownsAthletes(au) (rolü owner olan hesap); 14 sunucu adresi buna geçti.
- Çalışan, sporcu, veli, kurye görmez (değişmedi). Kurallar değişmedi: her ana hesap yalnız kendi alanını okur.
- Velora sahibine özel (isVeloraAdmin, lib/hesapGorunum.js): Hesaplar (Gmail, banka), Instagram menüsü, Ayarlar › Admin ve "Gmail ve banka mailleri". Diğer ana hesaplarda gizli.
- NEXT_PUBLIC_SPORCU_EMAILS artık yalnız yapay zekâ harcama sınırı dışı tutulan hesaplar (lib/server/auth.js trustList).

## Sıradaki işler

- Admin'de kullanıcılar listesi: kim katıldı, kulübü, sporcu sayısı (T.C./sağlık yok).
- Kayıtta KVKK aydınlatma ve onay; kayıt şu an kapalı (NEXT_PUBLIC_ALLOW_SIGNUP), açmak Seyhun'un kararı.
- Firestore maliyeti: kullanıcı gelince ücretli plan ve bütçe uyarısı.
