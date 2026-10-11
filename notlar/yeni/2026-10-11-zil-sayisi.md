## Nerede kaldım

- Zil sayısı düzeltildi (Seyhun: "bildirimler görünürse sayısı düşülmeli, görülmeyenler için sayı durmalı, anlık değişmeli"; telefonda denenmedi): zildeki sayı artık yalnız görülmemiş bildirimler (uygulama simgesindeki sayıyla aynı). Önceden yapılacaklar da sayılıyordu ve ana sayfa açılır açılmaz 1,5 sn sonra hepsi kendiliğinden "görüldü" yazılıyordu, ama sayı o ziyaret boyunca düşmüyordu. Şimdi bildirimler yalnız zile dokunup pencere açılınca görüldü olur, sayı hemen düşer; pencere açıkken gelen bildirim de görülmüş sayılır. Pencere açılmadan sayı durur. Pencerede o açılışta yeni olanlar noktalı. "N şey seni bekliyor" şeridi yapılacaklar + görülmemiş bildirimler (`useInbox` `count`, `open`/`setOpen`, Inbox.jsx; OwnerHome). Kural değişikliği yok.

## Sıradaki işler

- Başka bir hesaptan sana mesaj gönder: zilde 1 görünmeli (uygulama açıkken de anında). Zile dokun, sayı hemen kaybolmalı; pencereyi kapatınca 0 kalmalı.
