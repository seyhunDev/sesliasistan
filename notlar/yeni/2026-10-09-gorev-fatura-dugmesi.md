## Nerede kaldım
- Görevdeki "Faturalar" düğmesi kaldırıldı (Seyhun: "görevden faturalara gidilmesin, faturalar ayrı, ana sayfadan gideceğiz; tıklayınca açılmıyor, geri deyince fatura sayfası boş görünüyor"; telefonda denenmedi): "Fatura öde" görevindeki ödeme kartında yalnız bilgiler ve Kopyala kaldı (`TaskInvoice.jsx`). Hatanın nedeni: düğme arkadaki sayfayı Faturalar'a çeviriyordu ama tam ekran kayıt ekranı (görev) açık kalıp üstünü örtüyordu, bu yüzden "açılmıyor" gibi görünüyordu; ekran kapatılınca altında Faturalar sayfası çıkıyordu. Artık kayıt ekranı sayfa değişince kendiliğinden kapanır (açıldığı sayfa saklanır; bildirimden gelen `/?open=…` kapanmaz; `AddProvider.jsx`). Bu, kayıt ekranından başka sayfaya giden her yol için geçerli. Kural değişikliği yok.

## Sıradaki işler
0. Bir "Fatura öde" görevini aç: Faturalar düğmesi olmamalı, Kopyala çalışmalı. Faturalar'ı ana sayfadan aç, liste dolu gelmeli. Hâlâ boş görünürse ekran görüntüsüyle yaz.
