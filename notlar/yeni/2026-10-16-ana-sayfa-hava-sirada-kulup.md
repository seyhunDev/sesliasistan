## Nerede kaldım

- Ana sayfa sadeleşti (Seyhun: "hava durumunun açılabildiği anlaşılmıyor; günün durumu ve rüzgâr grafiği, şu anki saatte nokta; takvim alanı kalsın ama alttaki yazılar çok yer kaplıyor; kulüp kısmı da"; telefonda denenmedi):
  - Hava satırı artık çerçeveli bir hap: simge, kalın sıcaklık, gökyüzü, rüzgâr ve sonda ›, dokunulabildiği belli (HomeHero.jsx).
  - Hava penceresi önce bugünü gösterir: büyük özet (simge, sıcaklık, gökyüzü · en düşük–en yüksek, rüzgâr kn · yön · sağanak), altında rüzgâr grafiği; grafikte şu anki dakikaya göre kırmızı nokta ve "şimdi" yazısı. Gün seçici altta (DaySheet.jsx `DayDetail` `cur`, `WindChart` `nowAt`).
  - Sırada kartındaki değişiklik geri çekildi: aynı kart #435'te (takvimde iki gün, sırada seni bekleyenler) yeniden yapıldığı için o sürüm kaldı.
  - Kulüp kartı: üstte sıradaki yarış (ad, kalan gün, iş eksik), altında iki sütun küçük kutular (Aidat, Hesap, Fiş / Fatura, Instagram; yalnız bilgisi olan). Tek kalan kutu tam genişlik (HomeSummary.jsx `RaceRow`, `Tile`).
  - Firestore'a ek okuma yok, kural değişikliği yok.

## Sıradaki işler

- Telefonda ana sayfaya bak: hava hapına dokun, grafikte nokta şu anki saatte mi; Kulüp kutuları okunuyor mu. Beğenmediğin yeri ekran görüntüsüyle yaz.

## Tasarım

- Kulüp: üstte yarış satırı, altında iki sütun kutular; bilgisi olmayan kutu görünmez (2026-10-16).
- Hava penceresinde önce bugün ve rüzgâr grafiği, grafikte "şimdi" noktası (2026-10-16).
