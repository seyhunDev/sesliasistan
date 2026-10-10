## Nerede kaldım

- Ana sayfa KULÜP alanı yeni düzen (Seyhun: "ne varsa onlar gösterilsin, fiş fatura varsa gösterilsin, yoksa gösterilmesin; sıradaki yarış önemli"; örnek `/mnt/project-files/ana-sayfa/ana-sayfa-sade-oneri-2.png` onaylandı; telefonda denenmedi): satır listesi yerine üstte tam genişlik "SIRADAKİ YARIŞ" kartı (tam ad, "17-19 Ekim · 6 sporcu · 2 iş eksik", sağda büyük kalan gün; yarış yoksa kart yok), altında iki sütun küçük kartlar yalnız bilgisi varsa: Aidat (ödemeyen ya da onay bekleyen varsa; herkes ödeyince gizlenir), Fiş / Fatura (ödenmemiş fatura varsa "2 fatura · … ödenecek" kehribar, yoksa bu ayın fiş harcaması, ikisi de yoksa gizli), Banka, Antrenman (bu ay antrenman varsa), Instagram (gönderi varsa). Tek kalan kart tam genişlik. Kurallar `clubDues`, `clubFis`, `clubTraining`, `clubPosts`, `clubRace` (homeTiles.js); yarış bilgisine tam ad, kısa tarih, sporcu sayısı, kalan gün eklendi (`nextInfo`, `shortRange`, raceHome.js). "N şey seni bekliyor" ayrı kart değil, Şu an kartının altında şerit (NowCard `WaitBar`; Inbox `WaitRow` silindi). Üst başlık ve kısayollar aynı. Firestore'a ek okuma yok. Testleri `test:elle` › "Ana sayfa kartları" › "kulüp kartları".

## Sıradaki işler

- Ana sayfayı telefonda aç: yarış kartı ve küçük kartlar doğru mu, bilgisi olmayan kart gizli mi (ör. aidatı herkes ödeyince). Aidat kartı görünmüyorsa Aidatlar sayfasını bir kez aç (ad listesi sunucuya yazılır).

## Tasarım

- Ana sayfa KULÜP: üstte büyük Sıradaki yarış kartı, altında iki sütun küçük kartlar; yalnız bilgisi olan kart görünür, bilgisi biten kendiliğinden gizlenir (2026-10-10).
