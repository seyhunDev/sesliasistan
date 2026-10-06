## Nerede kaldım
- Asistan kubbesi artık sınırsız uzamıyor (Seyhun: "mesaj geldikçe uzuyor, ekranın yarısının biraz altında dursun, eski mesajlar yukarı kaydırarak görünsün"; telefonda denenmedi): konuşma alanı en çok görünen ekranın %45'i (klavye açıkken görünen alana göre), fazlası alanın içinde kayar; yeni mesaj gelince kendiliğinden en alta iner, parmakla yukarı kaydırınca eskiler görünür ve takip durur (mevcut kaydırma takibi). Küre, iş yazısı ve düğmeler sabit. TabBar `max-h-[min(…, 45%)]`. Oran değişecekse `.45` iki yerde.

## Tasarım
- Kubbedeki konuşma alanı en çok ekranın %45'i; fazlası içinde kayar (2026-10-06).
