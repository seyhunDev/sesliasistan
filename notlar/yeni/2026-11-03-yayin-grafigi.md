## Nerede kaldım

- Canlı ekran yayın grafiği düzenine geçti (Seyhun 2026-11-03 14:35 SailGP ekran görüntüsü, örnekler /mnt/project-files/yayin-tasarim/yayin-grafik/, 14:41 "yap"). Videolu ve videosuz ayrımı yok: arka planda yayın varsa video, yoksa bulanık fotoğraf; üstüne aynı kartlar.
  - Üst orta: süre kartı (durum satırı + büyük saat + yarış · grup; start dizisinde ilerleme çizgisi, turuncu bayrakta turuncu, tehir/genel geri/abandone kırmızı).
  - Sol üst: yalnız sonuç varken (yarışta şamandıra sıralaması, yarış bitince sonucu, gün sonunda genel sıralama; dokununca tam liste). Start dizisinde varsa erken start yapanlar.
  - Sağ üst: duruma göre tek kart (bekleme ve ara: program; dizi: 5·4·1·0 bayrakları; tehir: AP + sebep; genel geri/abandone: bayrak + yarış; gün sonu: bugünün yarışları ve kazananı; yarışın ilk 10 dk erken start). Parkur Yayın › Video › Ekranda göster › Parkur ile elle açılır (`courseShow.one === "course"`), açıkken sağ kartın yerine geçer.
  - Sol alt: rüzgâr (şimdi; beklerken start'ta beklenen; gün sonunda yarının beklenen). Sağ alt: ‹ geri + yarışın adı, altında gün ya da yarış; yarışta "Canlı". Alt orta boş.
  - Telefonda kartlar alt alta (ad, süre, sağ kart, sonuç, rüzgâr).
- Kod: `Grafik` ve parçaları (GTop, GRows, GWind, GProg, GSeq, GBig, GCourse, GEarly) LiveScreen.jsx'te, `if (isCur)` dalı; CSS `.gr-*` liveScreen.css sonunda. Geçmiş yarış görünümü (?y=) eski düzende kaldı. Eski bileşenler (WaitHero, SeqBand, NearBand…) yalnız oradan kullanılıyor.
- Yayın › Ekranda göster sadeleşti: yalnız Parkur ve Genel sıralama (yarışta). "Starttan önce otomatik" ve "Sol bilgi (videoluyken)" kaldırıldı.

## Sıradaki işler

- Telefonda ve TV'de denenmedi; bulanık fotoğraf burada dış bağlantı kapalı olduğu için görülmedi.
- Seyhun'dan geri bildirim: kart boyları, rüzgâr kartında saatlik tablo isteyip istemediği, sağ kartta start animasyonu ayrı düğme mi.
- Sesli komutlar "sol bilgiyi kapat", "rüzgârı/programı göster" artık ekranda etkisiz; gerekirse temizlenecek.
