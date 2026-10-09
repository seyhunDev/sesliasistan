## Nerede kaldım

- Hesaplar › Ödemeler iki sekme (Seyhun: "en çok ödeyenler tüm ödemelerden olsun, sekme gibi; eklediğim isim eklenmedi; isim açıklamada da hesap adında da olabilir"; telefonda denenmedi): "Tüm ödemeler" (arama, Tümü/Gelen/Giden, 20'şer "Daha fazla göster") ve "En çok ödeyenler" (banka defterinin başından bugüne bütün gelen TL paralar gönderene göre, toplam büyükten; gönderen adı okunamamışsa açıklamadaki adla; `topPayers`, payee.js). Ödeyene dokununca Tüm ödemeler'de o kişinin gelen paraları açılır. Özet artık yalnız gelen/giden toplam. Defterin başlangıç ayı meta.first ile en eski ay belgesinden hangisi önceyse (`ledgerStart`).
- Eklenen isim görünmüyordu: profil (AuthProvider) yalnız belli alanları taşıyordu; `payeeNames`, `payee` (Gelen ödemeler adı/hesabı), `ledgerCard` (Banka defteri kartı anahtarı) ve `coach` (yarış evrakı antrenör bilgisi) hiç gelmiyordu, kaydedilse de sayfa görmüyordu. Dördü de eklendi; isim eklenince hemen görünür. Eklenen adın ödemeleri artık ad hesap adında YA DA açıklamada/notta geçince sayılır (`nameMoves`).

## Sıradaki işler

- Hesaplar › Kişi ekle ile bir isim ekle, hemen satırda görünmeli; dokununca o isimle ilgili ödemeler ve toplam gelmeli. Ödemeler › En çok ödeyenler sekmesinde sıralama Excel'in başından itibaren mi bak. Ayarlar › Banka defteri kartı anahtarı ve yarış evrakındaki antrenör bilgisi de artık kaydedilenle gelir; kontrol et.
