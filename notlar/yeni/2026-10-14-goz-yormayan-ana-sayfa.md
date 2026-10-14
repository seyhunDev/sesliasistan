## Nerede kaldım

- Göz yormayan ana sayfa (Seyhun: "ağırlıklı olarak yazı, yorucu olmayan yazı ve renkler, gerekli yerlerde kısaltma"; örnek onaylandı; telefonda denenmedi): ana sayfa `.calm` sınıfıyla sakin renkler (kırık beyaz zemin, yumuşak koyu gri yazı, kısık yeşil, kehribar uyarı; koyu modda da), gölgesiz ince çizgili kartlar, başlıklar küçük harfle ("Kulüp", "Notlar", "Kısayollar"). Başlık "Sal 14 Eki", hava tek satır "21° · Az bulutlu · 12 kn KB". Sırada'da saat sütunu ("16:00 / şimdi, bugün, yarın, Cum"), "N şey seni bekliyor" sade satır. Kulüp tek kartta yazı satırları: Sıradaki yarış (ad, "tarih · yer · 6 sp. · 2 iş eksik", kalan gün hapı), Aidat · Eki (18/30 %60), Hesap (bakiye), Fiş / Fatura, Instagram. Aidat halkası, hesap grafiği ve renkli simgeli kartlar kalktı. Notlar ayrı bölüm: başlık ve altında "Sabit / tarih · ilk satır". Hafta şeridinde yapılan gün açık yeşil, eksik günlük açık kehribar, bugün yeşil. Kısayollar aynı. Firestore'a ek okuma yok.

## Sıradaki işler

- Telefonda ana sayfaya bak (açık ve koyu): yazılar yorucu mu, bir şey eksik mi. Aidat halkası ya da hesap grafiği istenirse geri gelir.
- Aynı düzen diğer sayfalara (Planlar, Notlar, Hesaplar…) sırayla uygulanacak.

## Tasarım

- Göz yormayan düzen: sayfanın en dış öğesine `calm` sınıfı (globals.css; renk değişkenlerini yumuşatır), kartlar `CALM` (src/features/home/ui.jsx), başlık `SectionHead`. Kartın içi yazı satırları (solda ad fg2, sağda değer + ›), uyarı `text-warn`, hap `bg-accbg text-acc`; simge kutusu, gölge, büyük kalın sayı yok. Diğer sayfalara bu üçüyle uygulanır (2026-10-14).
