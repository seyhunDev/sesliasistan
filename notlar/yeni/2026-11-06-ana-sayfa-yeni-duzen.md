## Nerede kaldım
- Ana sayfa yeni düzen (telefon + iPad/Mac tek ekran; Seyhun "Yap" 2026-11-06, örnek ana-sayfa/ana-tum.html): hava üst alanı kenardan kenara (sıcaklık, rüzgâr, tek cümle, saatlik sayılar `HeroStrip`, sayıların altında eğri; yağmurda yağış sütunları, rüzgâr artışında kehribar "sert" bölge), altı soluklaşır (`ck-fade`), tablo/panel yok. Hava sayfası aynen (grafik, tablo, harita orada).
- Hava altında: süren yarış (RaceLive) + en yakın plan (NextPlan) hemen altında, sonra 8 düğme iki satır (`HomeGrid` QuickRow: Yarışlar, Antrenman, Yoklama, Plan, Not, Fiş, Mesaj, Tümü; yetkiye göre eksilir), sonra takvim, sonra Kulüp (tek liste, renkli simgeli satırlar `ClubIcon`), Notlar.
- Takvim = `CalendarView embedded` (açık zeminde, çerçeve ve köşe yok, kenara kadar; üstü hava soluklaşmasından başlar). Telefonda `flat`: hücrede noktalar, altında seçili günün planları alt alta (üst üste binme yok). iPad/Mac'te hücrede en çok 2 renkli şerit (Antrenman yeşil, Yarış/Toplantı mavi, diğer turuncu) + "+N daha"; güne dokununca yan panel.
- Telefondaki gün şeridi (HomeDays), DayPick penceresi ve çizelge (DayTimeline) ana sayfadan kalktı; gün listesi takvimin altında. Plan "Yapıldı" işareti ana sayfa gün penceresinden kalktı (Takvim sayfası ve plan penceresinde duruyor).
- Testler: ekran testi "iş düğmeleri" 4 sütun, "yarış günü havası" takvimle; "güne dokun: pencere" ve "gün penceresi Yapıldı" kaldırıldı (özellik yok); yerel "saat saat hava tablosu" / "şu an satırı" / "Kulüp kutuları" yeni yapıya uyarlandı.

## Sıradaki işler
- Web (Mac, geniş) için ayrı düzen (Seyhun: önce iPad ve telefon).
- Dik iPad: şimdilik mevcut `home-screen` ızgarası (hava, takvim, sağ sütun altta); örnekteki "yarış + plan yan yana" düzeni gerekirse ayrı iş.
- Telefonda denenmedi.
