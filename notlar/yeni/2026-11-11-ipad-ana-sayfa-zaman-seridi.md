## Nerede kaldım
- iPad / geniş ekran (≥48rem) ana sayfası yeni: "A · Zaman şeridi" (Seyhun 2026-11-11; örnek /mnt/project-files/ana-sayfa/sade-2026-11/ipad.html). Kod `src/features/home/IpadHome.jsx`, CSS globals.css "IPAD ANA SAYFA".
- Baştan sona lacivert (.navy), ince çizgili paneller, rakamlar Space Grotesk (layout.jsx `--font-num`, `.num`).
- Hava paneli: pusula (şimdiki rüzgâr, sağanak, yön) + seçili günün saat saat rüzgâr eğrisi, 3 saatlik rüzgâr/gök/sıcaklık. Dokununca /weather.
- Takvim paneli (havadan ayrı): seçili günün planları kendi saat çizgisinde (antrenmanda Yoklama · Süre), altında 7 gün: gök, en düşük/en yüksek, gün içi rüzgâr eğrisi, rüzgâr aralığı + yön, yağış mm + %, planlar. Güne dokununca hava ve plan çizgisi o güne geçer.
- Sağ sütun: yarış şeridi, Bekleyen (zil listesinin ilk 4'ü), Kulüp (HomeSummary), çalışan/sporcu kartları. Dik iPad'de sağ sütun alta iner, "Tümü" başlıkta.
- Telefon ana sayfası değişmedi. iPad'de eski iş düğmeleri ve Notlar kartı yok (sol menüde / Tümü'de).
## Sıradaki işler
- Gerçek iPad'de denenmedi. Seyhun bakınca: Notlar ve iş düğmeleri iPad'de gerekli mi, ana sayfa işleyişi gözden geçirilecek.
- Sonra telefona uyarlanacak.
## Tasarım
- iPad ana sayfa "A · Zaman şeridi": hava ve takvim ayrı panellerde (Seyhun "iç içe girmesin"), günlerde gün içi rüzgâr ve yağış görünür.
