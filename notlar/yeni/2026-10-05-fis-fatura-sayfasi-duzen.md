## Nerede kaldım

- Fişler ve faturalar sayfası sadeleşti (Seyhun: "Tümü'de toplam sıfır görünüyor, bir fatura ödenmedi iki kez çıkıyor, sayfayı kullanıcı dostu yeniden tasarla"; telefonda denenmedi): üstte tam genişlik seçim Tümü / Fişler / Faturalar (Faturalar'da ödenmemiş sayısı). Tümü'de özet iki kutu: "Fişler · <ay>" toplam ve fiş sayısı, "Ödenecek faturalar" toplam, fatura ve gecikme sayısı (gecikme varsa kırmızı, hiç yoksa "Yok · Hepsi ödendi"); kutuya dokununca o seçim açılır. Altında "Fiş ekle" ve "Fatura yükle" düğmeleri (Fişler'de yalnız Fiş ekle). Ödenmemiş faturalar Tümü'de yalnız bir kez, listenin başında "Ödenecek faturalar" bölümünde (son güne göre, ay seçiminden bağımsız); gün listesinde fişler ve ödenmiş faturalar (FİŞ/FATURA etiketiyle). Eski "N fatura ödenmedi" şeridi kaldırıldı. Kategori çipleri ve kategorili toplam yalnız Fişler seçiliyken. Fatura satırlarında da simge kutusu var (geciken kırmızı, ödenmemiş sarı, ödenen gri). Kod: `ReceiptBook.jsx` (`invOpen`, `invMatch`), `InvoiceRow` (InvoicesView.jsx). Kural değişikliği yok.

## Sıradaki işler

- Fişler ve faturalar sayfasını aç: Tümü'de iki özet kutusu doğru mu, ödenmemiş fatura bir kez mi görünüyor, Fiş ekle / Fatura yükle çalışıyor mu. Beğenmediğin yer olursa yeni threade yaz.
