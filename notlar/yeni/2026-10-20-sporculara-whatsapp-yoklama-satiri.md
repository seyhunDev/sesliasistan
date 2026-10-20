## Nerede kaldım

- Sporcular kartında "Sporculara mesaj"ın yanında WhatsApp düğmesi (Seyhun 2026-10-20): alttan "Sporculara WhatsApp" penceresi açılır; üstte değiştirilebilir metin, altında Kalıplarım (users.waTemplates, en çok 20, × ile silinir) ve Hazır kalıplar (src/lib/waTemplates.js: sıradaki antrenman "Yarın 09:30 antrenman var, yer: …", iptali, sıradaki yarış, malzeme, fitness hatırlatması). "WhatsApp'ı aç": metin panoya kopyalanır; Ayarlar › WhatsApp gruplarında Sporcular grubu varsa grup açılır, yoksa WhatsApp metin hazır açılır, grup orada seçilir. "Kalıp olarak kaydet".
- Ana sayfa listesinde bugünün antrenman satırının altında "Yoklama al" ya da yeşil "✓ Yoklama alındı" (users.attLast), dokununca o günün yoklaması.
- Neden bazı planlarda Antrenman sayfası/günlük çıkıyor: plan antrenman (türü Antrenman ya da adında antrenman/idman), iptal değil ve günü bugün ya da geçmiş olmalı (canLog); gelecek günün antrenmanında yoklama/günlük yok.
- Telefonda denenmedi.

## Sıradaki işler

- Asistan kalıpları kullansın ("sporculara yarınki antrenmanı WhatsApp'tan at"): waTemplates'i asistanın mesaj işine (isler/mesaj.js) bağla.
