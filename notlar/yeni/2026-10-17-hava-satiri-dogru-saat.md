## Nerede kaldım

- Ana sayfa hava satırı yanlış gösteriyordu: başlıktaki satır, hava verisinin alındığı andaki değeri (w.now) gösteriyordu. Uygulama sabah açılınca ya da yenileme gelmeyince dün akşamki ya da saatler önceki sıcaklık/rüzgâr yazıyor, altındaki rüzgâr grafiği ise bu saati gösteriyordu.
- Düzeltme: `nowOf(w)` (weather.js); veri 20 dakikadan eskiyse saatlik tahminden bu saatin satırı. Hava penceresi de dünden kalan veride gün listesine bugünden başlıyor. Rüzgâr grafiğine dokunulmadı. Telefonda denenmedi.
- Satırın yeni tasarımı için örnek gösterildi (/mnt/project-files/ana-sayfa/hava-satiri-oneri.png: büyük sıcaklık, yanında durum, rüzgâr adı ve en düşük/en yüksek); onay bekliyor.

## Sıradaki işler

- Hava satırı tasarımı onaylanırsa HomeHero'da uygula.
