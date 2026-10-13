## Nerede kaldım

- Ana sayfa kartları ve düğmeler (Seyhun: "aidat, hesap, antrenman, Instagram daha profesyonel; Instagram'da son tasarım; düğmeler buton gibi; tıklanma duygusu"; örnek `/mnt/project-files/ana-sayfa/kartlar-dugmeler-oneri.png` onaylandı; telefonda denenmedi):
  - Aidat kartı: yüzde halkası, "18/30 ödedi", altta durum hapı (bekleyen/eksik varsa sarı).
  - Hesap kartı: bakiye, son 7 özetin küçük çizgi grafiği, "▲ +fark · son 7 özet" (düşüşte kırmızı). Grafik banka maillerinden, ek okuma yok (`spark`, `diff`, TeamMoney.jsx).
  - Antrenman tam genişlik kart: bu haftanın 7 günü (yapıldı ✓, günlüğü yazılmadı !, bugün, planlı), "3/4", altta bu ayın antrenman sayısı, ortalama rüzgâr, yazılmayan günlük; "Günlük yaz ›" (`trainingWeek`, homeTiles.js).
  - Instagram tam genişlik kart: son gönderinin küçük görseli (dokununca gönderi açılır), başlık, ne zaman, toplam; "+ Yeni gönderi" ve "Tümü". Görsel Instagram sayfası açılınca bu cihaza yazılan özetten (`sa-home-sum` › posts.last.thumb), ek okuma yok.
  - Kısayol düğmeleri kabarık (alt gölge, kenar), basınca içeri göçer (`.raised`, globals.css).
  - Dokunma hissi yalnız ana sayfada: kart ve düğmeler basılıyken hafif küçülür; kaydırırken çalışmaz (`usePress`, src/hooks/usePress.js; `data-press`). Diğer sayfalarda dokunma vurgusu yok kuralı (#220) aynı.
  - Kural değişikliği yok. Testi `test:elle` › "Ana sayfa kartları" › "antrenman haftası".

## Sıradaki işler

- Telefonda ana sayfaya bak: kartlar örnekteki gibi mi, düğmeye basınca göçme hissediliyor mu, kaydırırken kartlar küçülmüyor mu. Instagram kartında görsel yoksa Instagram sayfasını bir kez aç.
- Dokunma hissi beğenilirse diğer sayfalara da yayılabilir (#220 kuralı Seyhun'un onayıyla değişir).
