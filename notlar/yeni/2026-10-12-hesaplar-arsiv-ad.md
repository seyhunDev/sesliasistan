## Nerede kaldım

- Ana sayfa › Kulüp'teki "Banka" kartının adı "Hesaplar" oldu (Seyhun: "artık her şeyi oradan yönetiyoruz, nakitler de var"; HomeSummary.jsx). Hesaplar › Kulüp › Kasa › "Önceki nakit girişleri"nde her satırda "Arşivle" ve "Kasaya ekle", altta "Hepsini arşivle" (Seyhun: "bunlar kullanıldı, kasada değil, orada kalmasın"; telefonda denenmedi). Arşivlenen girişler kasaya sayılmaz, kartın altındaki "Arşiv (N)"de durur, "Geri al" ile döner (`cash/meta.skip`; `archiveCash`, `unarchiveCash`, duesData.js; `kasaOf(...).archived`, cashbook.js). Asistan: "önceki nakit girişlerini arşivle". Kural değişikliği yok. Testleri `test:elle` › "kasa: eski girişleri arşivleme".

## Sıradaki işler

- Hesaplar › Kulüp › Önceki nakit girişleri › "Hepsini arşivle"; liste kalkmalı, "Arşiv (N)" görünmeli. Ana sayfada kartın adı "Hesaplar" mı bak.
