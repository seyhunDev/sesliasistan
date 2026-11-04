## Nerede kaldım

- Canlı ekranda 03 Genel sıralama artık yarış öncesinde de çıkıyor: start'a 10 dakikadan fazla varsa (ya da saat yoksa), sıralama varsa 45 sn'de bir 15 sn 03 gösterilir. Gün bitince zaten 03 ↔ 06.
- Sıralama, Yarışlar › yarış › Sonuç yükle ile eklenen PDF'ten okunur (raceLive/{id}/sheets, /api/canli fleets). Resmî sonuçta sıra numarası boş geliyordu (r.place yoktu, rank var); düzeltildi.
- Yayın › Ekran'da 03'ü elle de seçebilirsin; Yayın, yüklü sonuç olup olmadığına bakar (loadSheets).

## Sıradaki işler

- PDF'in kendisini ekranda göstermek istenirse ayrı iş (şimdilik PDF'ten okunan tablo gösteriliyor).
