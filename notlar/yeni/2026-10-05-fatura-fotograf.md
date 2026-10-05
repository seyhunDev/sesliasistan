## Nerede kaldım

- Fatura fotoğrafla da eklenir (Seyhun: "fatura niye fotoğrafla eklenemiyor, sadece PDF; fiş gibi hem yükleme hem fotoğrafını çekerek"; telefonda denenmedi): "Fatura yükle" düğmesi "Fatura ekle" oldu ve üç seçenek açar: Fotoğrafını çek (kamera doğrudan açılır, `capture="environment"`), Fotoğraflardan seç, PDF ya da dosya seç. Önceden tek dosya seçici vardı; iPhone onu çoğu zaman yalnız Dosyalar olarak açıyordu. Fotoğraf eskisi gibi telefonda küçültülür, yapay zeka okur (`prepFile`, `/api/invoice`). Kubbede Oluştur › "Fatura ekle". Kod: `useInvoiceDesk` (InvoicesView.jsx `choose`, `camRef`, `photoRef`). Kural değişikliği yok.

## Sıradaki işler

- Fişler ve faturalar › Fatura ekle › Fotoğrafını çek: kâğıt bir faturanın fotoğrafını çek; firma, tutar, son gün doğru okunuyor mu bak.
