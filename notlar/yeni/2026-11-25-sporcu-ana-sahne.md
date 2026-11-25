## Nerede kaldım

- Sporcu ana sayfası baştan: "Sahne" (Seyhun 2026-11-25 A seçti; örnek /mnt/project-files/velora-tarama/sporcu-ana-yeni.html). `features/home/SporcuHome.jsx` + `sporcu.css`. Artık HomeFrame/IpadHome kullanmıyor; koyu zemin, Barlow Condensed (liveScreen/fonts liveHead), limon vurgu. Sıra: selam, tek satır hava (şimdi + antrenman saatindeki rüzgâr), BUGÜN dev kartı (bugünkü antrenman, Tekne ekranı düğmesi), Fitness ve İngilizce kartları, kayıtlı yarış, kutular (Velora Sailing, Ders programı `DersCard tile`, Yoklamam, Görevler), Bekleyen. iPad 48rem+ iki sütun.
- İngilizce sporcuda da açık (Tümü + ana sayfa kartı). Sporcunun destesi kendi cihazında (wordData: ana hesap dışı localStorage).
- Velora Sailing sporcunun Tümü'sünde ve kutusunda; giriş /api/sailing-giris ile kendi hesabıyla ("kayitli").
- Yarışlar: sporcuya genel Yarışlar yok. `/api/my-races` (sunucu, athleteAtt/{uid}.athleteId; veli için bağlı sporcular → races where athleteIds array-contains-any) yalnız ad/tarih/yer döner. Sayfa `/my-races` "Yarışlarım"; ana sayfada en yakın kayıtlı yarış ve kaç gün kaldı. Kural değişikliği yok.
- MyAttendanceCard silindi (yerini Yoklamam kutusu aldı).

## Sıradaki işler

- Telefonda dene (Ayarlar › Sporcu gibi gör ile düzen; yarış kartı yalnız gerçek sporcu hesabında dolar).
