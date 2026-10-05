## Nerede kaldım
- Ana sayfada "Fişler" düğmesi "Fiş / Fatura" oldu (Seyhun: "ana sayfadaki fişler butonunu Fişler / Faturalar yapalım"; telefonda denenmedi): İşlemler › Yönetim'deki düğme ve ÖZET'teki fiş kartının başlığı "Fiş / Fatura" (`homeActions`, `HomeSummary`). Tam "Fişler / Faturalar" yazısı düğmeye sığmıyor (3 sütunda tek satır kuralı; 320 px'te taşıyor), bu yüzden tekil kısaltma kullanıldı; 320 px dahil her genişlikte tek satır ve diğer düğmelerle aynı boy. Sayfanın kendi başlığı "Fişler" kaldı. Testleri `test:elle` › "Ana sayfa kartları".

## Sıradaki işler
0. Ana sayfada "Fiş / Fatura" düğmesine bak; "Fişler / Faturalar" yazmasını istersen düğme iki satıra çıkar ya da Yönetim grubu 2 sütuna iner, hangisini istediğini yeni threade yaz.
