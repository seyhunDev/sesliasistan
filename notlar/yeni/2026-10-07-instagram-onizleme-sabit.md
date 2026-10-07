## Nerede kaldım

- Instagram gönderi ekranında önizleme üstte sabit (Seyhun: "ayarları yaparken post yukarıda kalıyor, göremiyorum; ekranın 3'te 2'si post, 3'te 1'i ayarlar olsun, ayarlarda artı eksi düğmeleri olsun", iPhone 16 Pro Max; telefonda denenmedi): önizleme sayfa başlığının hemen altında yapışık durur (ekranın yaklaşık yarısı, `52svh`; genişliğe göre küçülür), altındaki ayarlar, yarış kartı, yazılar ve açıklama onun altında kayar; ne değiştirilirse anında görünür. Bir yazı alanına (başlık, açıklama…) yazarken önizleme küçülür (`24svh`), klavyeye yer kalır; yazma bitince büyür (`typing`, PostEditor.jsx). Ayar kartı (Fotoğraf, Büyüt, Gölge, Boyut, Tasarım, Renk, Yazı) artık önizlemenin hemen altında, yarış kartı onun altında. Bütün kaydırıcıların (Büyüt, Sağa-sola, Yukarı-aşağı, Gölge, Başlık boyu, Alt satır boyu) iki yanında − / + düğmeleri: her basış 5 adım (`slider`, `stepBtn`). Kural değişikliği yok.

## Sıradaki işler

- Telefonda yeni bir gönderi aç, aşağı kaydır: önizleme üstte kalmalı. Büyüt'te + / − ile oynat, açıklamaya yazarken önizlemenin küçüldüğünü gör. Önizleme çok büyük ya da küçük gelirse yeni threade yaz (oran `52svh`).
