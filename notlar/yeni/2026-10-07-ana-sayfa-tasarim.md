## Nerede kaldım

- Ana sayfa tasarımı (Seyhun: "daha kullanıcı dostu, profesyonel bir tasarım"; seçilen öneriler 1, 2, 4, 6; telefonda denenmedi): (1) Sağ üstte, Ayarlar düğmesinin yanında zil; üstündeki sayı Senin için'deki satır sayısı, dokununca "Senin için" penceresi açılır: önce yapılacakların hepsi, altında son 30 bildirim (okunanlar soluk). Sayfa artık Bugün ile başlar. (2) "Bildirimler" ve "Senin için" tek kutu oldu (Bugün'ün altında, en çok 3 satır, "Tümü" pencereyi açar): önce yapılacaklar (silme isteği, mesaj, fatura, yeni verilen, ödenecek fiş), sonra okunmamış bildirimler; kaydırınca gizlenir. Bildirimler eskisi gibi sayfa görülünce okundu yazılır (`useInbox`, `InboxBell`, `InboxBox`, `InboxSheet`, src/features/home/Inbox.jsx; Notifications.jsx kaldırıldı). (3) Özet kartlarında dikkat isteyen kart (bekleyen banka ödemesi, eksik yarış işi, yazılmamış günlük, geciken fatura) kehribar çerçeve ve noktayla öne çıkar, diğerleri sade; aidat kartında ödeyenlerin doluluk çubuğu (`duesTile` `bar`). (4) Bütün ana sayfa kartları ve bölüm başlıkları ortak görünümde: `CARD`, `TAP`, `SectionHead` (src/features/home/ui.jsx). Sıra: Bugün › Senin için › doğum günü › Yoklamam › Özet › Notlar › Kısayollar. Firestore'a ek okuma yok, kural değişikliği yok. Örnek: `/mnt/project-files/ana-sayfa/yeni-tasarim-ornek.png`. Testi `test:elle` › "Ana sayfa kartları" › doluluk çubuğu.

## Sıradaki işler

- Yeni ana sayfayı telefonda dene: zil sayısı ve penceresi, Senin için kutusu (3 satır, Tümü), kehribar kartlar, koyu görünüm. İstenirse kalan öneriler: başlıkta selam + rüzgâr kartı (3), Notlar kısaltma (5), boş gün mesajı (7), belirgin kısayollar (8).

## Tasarım

- Ana sayfa kartları ve bölüm başlıkları `src/features/home/ui.jsx` (`CARD`, `TAP`, `SectionHead`) ile çizilir; yeni bölüm elle kart sınıfı yazmaz. Bildirimler başlıktaki zilde, sayfa Bugün ile başlar (2026-10-07).
