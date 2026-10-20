## Nerede kaldım

- Geri düğmeleri ortak sisteme alındı: yeni çeşit `back` (kabarık yuvarlak, 44 px) ve `src/components/ui/BackButton.jsx` (`href` → BackLink ile gelinen sayfaya; `onClick` → sayfa içi geri).
- Kullanılan yerler: PageHeader (bütün sayfa başlıkları), Fitness ana ve Değerlendirme alt ekranları, sohbet başlığı, kişi sayfası ("‹ Geri" yazısı yerine), fiş detayı ("Fişler" yerine; yanındaki Düzenle ortak ikincil küçük düğme).
- Önceki/sonraki ay-gün okları ve ekleme ekranındaki kapat (x) geri düğmesi sayılmadı; alan geçişlerinde simge düğmesi olur.

## Sıradaki işler

- Sayfaları alan alan ortak düğmeye geçirmek; asistan dosyaları en sonda.

## Tasarım

- Her geri düğmesi `BackButton`; sayfada kendi geri düğmesi yazılmaz.
