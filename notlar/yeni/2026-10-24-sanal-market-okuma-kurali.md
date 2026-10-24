## Nerede kaldım
- Velora Sanal market (Seyhun 2026-10-24: "markete tıklayınca Velora Sanal'a gider, kullanıcı olarak girer, alışverişi onun alışverişi"; telefonda denenmedi): market velora-sanal deposunda Liste | Sanal tek ekranda; Velora hesabı olanlar (ana hesap, çalışan, aile) kendi adıyla sipariş verir. Bu depoda yalnız `firestore.rules` değişti: çalışan/aile (`myKind()` staff | family) `market/katalog`'u ve yalnız kendi `uid`'li `marketSiparisler`'i okur. Sipariş ve iptal velora-sanal `/api/siparis`'ten (sunucu) yazılır. Kural Firebase konsolundan yayınlanmalı.

## Sıradaki işler
0. firestore.rules'u konsoldan yayınla; sonra bir aile/çalışan hesabıyla velora-sanal.netlify.app'e girip sipariş ver, Velora › Market yönetiminde gör.
- Velora › Market düğmesi velora-sanal'ı açsın (Market sohbeti), ana sayfada Yemek/Market ayrı ve açık market siparişi kartı (Ana sayfa sohbeti). Velora'dan tek dokunuşla giriş ve market siparişini Velora Food kuryelerinin getirmesi sırada (Sanal market sohbeti).
