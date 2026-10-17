## Nerede kaldım

- Ana sayfa canlandı (Seyhun onayladı, örnek /mnt/project-files/ana-sayfa/canli-oneri.png). Üst kısım, hava ve rüzgâr alanı aynı kaldı.
- Kişi şeridi: zemin kişi türüne göre (çalışan yeşil, sporcu mavi, veli lila, aile kahve; homeTiles `personTone`).
- Hafta şeridi: bu hafta + sonraki iki hafta, sağa kaydırılır (haftabaşında durur), ayın 1'inde gün adı yerine ay adı, en sonda "Tümü ›" Takvim'i açar. "Takvim ›" yazısı yalnız şerit yokken görünür. Nokta rengi plan türünün rengi.
- Bugün / Yarın / Sırada: solda plan türünün renginde çizgi (`planTone`), Bugün/Yarın'da sağda tür etiketi (`planTag`), süren plan yeşil zeminli, gün başlığının yanında plan sayısı. Sırada tarihleri bu aydaysa "Sal 20".
- Kulüp › Instagram: tam genişlik satır; görsele dokununca son gönderi, "N gönderi ›" yazısına dokununca gönderiler sayfası. Görsel, Gönderiler sayfası en son açıldığında kaydedilen küçük görsel.
- Renkler globals.css `.tone-*` (koyu görünüm dahil). Telefonda denenmedi.

## Sıradaki işler

- Telefonda bak: şerit kaydırma ve hafta başında durma, renklerin ayırt edilmesi, Instagram görseli.

## Tasarım

- Plan türü renkleri: Antrenman yeşil, Yarış mavi, Toplantı lila, Kamp kahve, Fitness turuncu, diğer gri. Kişi renkleri aynı tonlardan. Başka sayfalarda da bu tonlar kullanılır (`.tone-X .tone-chip/.tone-bar`).
