## Nerede kaldım

- Fiş ve fatura nakit ödenince kasadan düşüyor (Seyhun: "nakit ödenirse bizim nakit hesabımızdan düşmesi gerekiyor, EFT'de sıkıntı yok"; telefonda denenmedi): Fişler'de "Öde"ye basınca "Nakit" / "EFT" seçilir (fiş ekranı, ödeme bekleyenler listesi, ana sayfadaki bekleyenler). Faturada "Ödendi (EFT)" ve "Nakit ödendi" düğmeleri. Nakitte Hesaplar › Kulüp › Kasa'ya çıkış yazılır (kategori Fiş / Fatura, kime: fişi ekleyen ya da faturanın firması, not: işletme + fiş no / fatura no; `incomes` kaydında `src` "rc:<fiş>" / "inv:<fatura>"; `cashOutFor`, `dropCashFor`, duesData.js). "Geri al" / "Ödenmedi yap" ya da fiş/fatura silinince bu kasa kaydı da silinir. EFT eskisi gibi, kasaya dokunmaz. Fişte ve faturada `paidVia` "cash" | "eft" (fatura: "hand" EFT sayılır). Asistan: "Turkcell faturasını nakit ödedim", "F-7 fişini nakit ödedim" kasadan düşer ("nakit/elden/peşin"; `cash`, invoiceCommand ve receiptPayCommand). Kural değişikliği yok. Testleri `test:asistan` › fiş ödemesi, `test:elle` › "Faturalar" › "asistan: nakit".

## Sıradaki işler

- Bekleyen bir fişte Öde › Nakit'e bas; Hesaplar › Kulüp › Kasa'da çıkış görünmeli. Geri al, kasadan kalkmalı. Bir faturada "Nakit ödendi"yi dene.
