## Nerede kaldım

- Ana sayfa sade düzen (Seyhun: "daha kullanıcı dostu, daha sade, daha güzel"; "üste merhaba gerek yok, eski başlık kalsın, kulüp alanı kısayolların üstüne"; telefonda denenmedi). Sıra: başlık (gün, tarih, hava; sağda zil ve baş harfler) › Şu an kartı › "N şey seni bekliyor" › doğum günü › (sporcu/veli: Yoklamam) › KULÜP (ana hesapta; diğerlerinde ÖZET) › KISAYOLLAR.
  - Zil: sayı bekleyenlerin sayısı; dokununca "Senin için" penceresi (yapılacakların hepsi + son 30 bildirim). Bildirimler eskisi gibi ana sayfa görülünce okundu yazılır (`useInbox`, `InboxBell`, `InboxSheet`, `WaitRow`, Inbox.jsx; Notifications.jsx kaldırıldı).
  - Şu an kartı (koyu yeşil): bugünün süren ya da sıradaki planı (saat, yer, antrenman/yarışta rüzgâr; eşik geçilirse kırmızımsı), altında "Sonra" ile bir sonraki plan; bugün kalmadıysa yarının ilki, hiç yoksa "Plan yok · Plan ekle"; sağ üstte Planlar (`NowCard.jsx`, `nowPlans` homeTiles.js). Eski Bugün listesi (TodayCard) ve sabah/akşam özet kartı ana sayfadan kalktı; bildirimleri değişmedi.
  - "Seni bekleyen" satırı: geciken ve bugünkü görevler (sağda bitir dairesi), mesajlar, silme istekleri, faturalar, ödenecek fişler, yeni bildirimler tek satırda sayı + ilk başlıklar; dokununca aynı pencere (`due:` öğesi, ForYou.jsx).
  - KULÜP: 6 ayrı özet kartı yerine tek kartta satırlar (Aidat, Sıradaki yarış, Banka, Fiş / Fatura, Antrenman, Instagram; simge, ad, açıklama, sağda değer). Dikkat isteyen satır kehribar; aidatta doluluk çubuğu (`duesTile` `bar`, alt satır "3 ödeme onay bekliyor").
  - Kısayollar: 4 sütun, kutusuz büyük simgeler; 7 kısayol + "Tümü" (pencere, düzenleme orada). Varsayılana Fiş / Fatura eklendi (`SHORTCUT_MAX` 7).
  - Notlar listesi ana sayfadan kalktı (HomeNotes.jsx silindi), Notlar kısayoldan açılır.
  - Ortak kart görünümü: `CARD`, `TAP`, `SectionHead` (src/features/home/ui.jsx). Firestore'a ek okuma yok, kural değişikliği yok. Örnek: `/mnt/project-files/ana-sayfa/sade-yeni.png`. Testleri `test:elle` › "Ana sayfa kartları" (şu an kartı, doluluk çubuğu, kısayollar).

## Sıradaki işler

- Yeni ana sayfayı telefonda dene: Şu an kartı doğru planı gösteriyor mu, "seni bekliyor" penceresinde görev bitirme, zil sayısı, Kulüp satırları, koyu görünüm. Sabah/akşam özet kartını ana sayfada istersen yeni threade yaz.

## Tasarım

- Ana sayfa sade düzen (2026-10-07): başlık (gün, tarih, hava, zil, baş harfler; selam yok) › Şu an kartı › seni bekleyen satırı › Kulüp satırları › 4 sütun kısayollar. Kartlar `src/features/home/ui.jsx` ile çizilir.
