# Ana sayfa iPad ve Mac: tek ekran

## Nerede kaldım
Seyhun (2026-11-05): "tek uygulama ekranı gibi, kaydırma gerekmeden; hava ve takvim ekranı kaplasın, sağda Kulüp ve Notlar; Takvim sayfasının birebir aynısı". Örnek onaylandı ("yap"): /mnt/project-files/ana-sayfa/ipad-ana.html.
- ≥48rem (iPad, Mac) `useWide()` ile ana sayfa `main.home-screen` olur (telefon <48rem eski düzen, DayTimeline ve gün şeridi telefonda kalır).
- Takvim sayfası bileşene ayrıldı: `src/features/calendar/CalendarView.jsx` (`embedded`, `sel`/`onSel`); sayfa `app/(app)/calendar/page.jsx` yalnız URL sarmalayıcı. Ana sayfada `.cal-emb` (solda lacivert ay, sağda seçili gün listesi, Plan/Görev/Doğum günü ekle).
- Yatay (≥64rem): sol sütun hava (kompakt) + takvim kalan yükseklik, sağ sütun sıradaki plan, yarış şeridi, iş düğmeleri, Kulüp, Notlar. Dik: hava, takvim, altta iki sütun (düğmeler | Kulüp); Notlar yalnız ≥80rem yüksekte.
- Geniş ekranda gün şeridi (HomeDays) yok: takvimdeki gün seçimi hava kartını da değiştirir. Hücre başlıkları yalnız yükseklik ≥58rem'de, aksi halde noktalar.
- Eski `home-wide` CSS bloğu silindi; test: ekran testinde "iPad tek ekran".
## Sıradaki işler
Telefonda/iPad'de denenmedi; gerçek cihazda boşluk ve yükseklik ince ayarı. Önceden kırmızı: "saat saat hava tablosu" (Tablo düğmesi yok), Hava 2/3 (hava thread'i).

## Güncelleme (aynı gün, ikinci tur)
- Gökyüzü kart değil: `.hs-sky` sayfanın üstünde kenardan kenara, altı soluklaşır (mask); yer adı sıcaklığın yanında, tarih başlıktan kalktı.
- Takvimde yan gün paneli kapalı başlar, güne dokununca açılır (aynı güne tekrar ya da × ile kapanır). Plan, Görev, Doğum günü ekle düğmeleri takvimin başlığında (ders programı simgesinin yanında).
- Gün hücrelerinde plan, görev, doğum günü adları her ekranda görünür.
