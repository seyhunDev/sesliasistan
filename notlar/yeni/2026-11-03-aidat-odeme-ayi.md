## Nerede kaldım

- Aidatlar karışıklığı (Seyhun: 1 Ekim'de alınan ödeme Kasım ödemesi gibi görünüyordu). Neden: sayfada banka ödemesini eşleştirirken ve elle ödeme girerken ödeme "en eski borçlu aya" yazılıyordu ve bu aramaya ödeme tarihinden SONRAKİ aylar da giriyordu; Ekim zaten ödenmişse 1 Ekim ödemesi Kasım'a yazılıyordu. Sunucu (duesAuto) zaten geldiği aya kadar bakıyordu.
- Düzeltme: sayfa da artık ödeme tarihine kadarki aylara bakar; borç yoksa ödeme ayına yazar. Sonraki aylar için ödeme elle ay seçilerek girilir.
- Gösterim: satırda "Son ödeme 1 Eki · Kasım aidatı"; geçmişte "Kasım aidatı" ve altında "1 Eki ödendi · Banka"; seçili ayda "Ödendi · 1 Eki banka". Geçmişteki ödemeye dokununca "Hangi ayın aidatı" seçilip Kaydet ile başka aya taşınır (`moveGroup`, src/lib/dues.js; tutar, tarih ve banka hareketi aynı kalır).
- Eski yanlış yazılmış kayıtlar kendiliğinden düzelmez; Seyhun o ödemeye dokunup ayı Ekim yapmalı.
- Testler çalıştırılmadı (Seyhun söyleyince); elle.mjs'ye 2 test eklendi. Telefonda denenmedi.

## Sıradaki işler

- Yok.
