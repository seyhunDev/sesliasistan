## Nerede kaldım

Yayın sayfasına "Program" sekmesi eklendi (Süre · Program · Video · Parkur · Dönüşler).

- **Her gün:** her günün ilk start saati (`plan.daily`) ve ekranın yeni güne geçtiği saat burada.
- **Günler:** yarışın her günü bir satır, ör. "1. gün · Pzt 2 Kas · 11:00 · 2 yarış". Satıra dokununca şunlar açılır:
  - O güne özel ilk start saati (`plan.times`).
  - "Bu gün yarış yok" düğmesi (`plan.off`).
  - O günün startları. Yanlış açılan start "Sil" ile siliniyor (bir daha soruyor). Sonraki yarışların numaraları yenileniyor.
  - Bugünün bekleyen startları ("Çıkar" ve "Bekleyenleri çıkar").
- **Yeni gün:** plan eski bir günde kaldıysa `rollPlan` bugünün planını kuruyor. İlk start günün saatinden geliyor, bekleyenler düşüyor, yarış olmayan günün durumu "none" oluyor. /api/canli da aynısını yapıyor, bu yüzden Yayın açılmasa bile canlı ekran bugünün saatine göre sayıyor.
- **Kaldırılanlar:** Süre sekmesindeki eski "Program" bölümü (Bugün/Yarın ilk start) kaldırıldı. Günü bitirince yarının saati, günün saatinden alınıyor.

## Sıradaki işler

- Telefonda denenmeli.
- Yeni canlı ekran düzeni, ardından yayın özeti belgesi.
