## Nerede kaldım

- Velora herkese açılıyor (Seyhun 2026-11-27): kulüp hesabı yok, her kullanıcı kendi alanında kendi sporcularını yönetecek; kulüp yalnız etiket.
- 1. adım yapıldı: resmi kulüp listesi `clubs/{id}` (lib/club.js; herkes okur, yalnız Velora ana hesabı yazar). Kullanıcıda `users.clubId` + `clubAsked`.
- Serbest kulüp adı yok: listeden seçilir ya da "Kulüpsüz devam et" (ClubPick).
- Kulüp bir kez sorulur (ClubGate; yelken, ana hesap ve çalışan/aile/diğer; sporcu tarafı sorulmaz), yarış evrakı hazırlanırken kulüp yoksa sorulur (RaceEditor), Ayarlar › Kulübüm.
- Koda gömülü Dikili bilgileri kulüp kaydından okunuyor: evrak anteti (raceDocs CLUB, logo), bütçe/sporcu sayfası/veli PDF/gün kaydı başlığı, aidat ve "gelmedi" mesajı imzası (clubSign), fitness raporu başlığı, sonuçta "bizim kulüp" eşleştirmesi (clubMatch).
- Admin › Kulüpler (yalnız Velora ana hesabı): liste, ekle/düzenle/sil, "Listede olmayan kulüpleri bul" (ortak yarış sonuçlarındaki kulüp adları). Dikili kaydı ilk açılışta eklenir.
- Instagram görselleri ve /canli logo şeridi Seyhun'a özel, Dikili olarak kaldı.

## Sıradaki işler

- Seyhun: Firestore kurallarını yayınla (clubs bölümü), Admin › Kulüpler'i bir kez aç (Dikili eklenir), kulüp sorusunda Dikili'yi seç.
- Resmi kulüp listesini doldur (yarış sonuçlarından öneri + Seyhun onayı).
- 2. adım: Sporcular herkese (canSeeAthletes e-posta kapısı kalkar, her kullanıcı kendi alanında); sade menü; Admin'de kullanıcılar ve sporcu sayıları; KVKK onayı.

## Asistan

- Kulüp seçimi şimdilik elle (Ayarlar › Kulübüm); asistan komutu yok.
