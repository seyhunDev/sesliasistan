## Nerede kaldım
- Yönet her çalışanda (Seyhun 2026-11-27): Antrenör işareti kalktı; `isCoach` = role staff + tür staff (aile, diğer, sporcu değil). Kural `isCoachSpace` aynı şeye bakar (users.role/kind). Kişi kartındaki "Antrenör" çipi ve `/api/staff` `coach` kaldırıldı (users.coach artık yalnız yarış evrakının antrenör bilgisi, AuthProvider profile.coach nesne).
- Normal kullanıcı ana sayfası: KULÜP bölümü, ana hesaptaki gibi kutular: Yönet (YonetTile, çalışanda; "normal gibi gör"de de görünür) ve Velora Sailing (`SailingTile`, ana hesapla ortak).
- Normal kullanıcı alt çubuk: Ana sayfa · Takvim · Mesajlar · İngilizce (`hesapGorunum.js` TABS). "Kulüp" sekmesi kalktı. İngilizce simgesi yeni `lang` (Icon.jsx), sporcuda da.
- Mesajlar başlığında "Beta" etiketi (ChatList.jsx).
- Sporcu iPad (dik ve yatay, ≥48rem): selamın altında grafikli ortak Hava kutusu + 7 gün (`SporcuHava` = SahneHava + Days, SahneHome.jsx), tek satır hava gizli; telefonda tek satır hava kalır (dokununca Hava sayfası).
- Örnek: https://claude.ai/artifact/EhTSDw8qX3S4ewvMv3fBaU (/mnt/project-files/velora-tarama/normal-ana-alt-cubuk.html).

## Sıradaki işler
- firestore.rules yayınlanmalı (isCoachSpace değişti).
- Telefonda ve iPad'de dene: bir çalışan hesabıyla Yönet › Kanal aç; sporcu hesabıyla iPad'de hava grafiği.
