## Nerede kaldım

- Görev listesi dokunuş beklemeden sürüyor (Seyhun: "yarışı oluştursun, diğer göreve geçsin; gönderiyi kaydetsin, düzeltmeleri sonra yaparım; sıralama bizim için en kolayı olsun"; telefonda denenmedi): (1) Görev listesinde sıradaki iş varken yeni yarış "Tarihleri ne, hangi sporcular katılacak?" diye sormaz, kaydedip sonraki işe geçer (`noAsk`, assistRace.js); tek başına söylenen yarışta soru eskisi gibi. (2) Asistanla hazırlanan Instagram gönderisi yazılar gelince kendiliğinden kaydedilir ("Gönderi kaydedildi"; `autoSave`, PostEditor.jsx), sonra elle ya da sesle değiştirilir. (3) Görev listesi söylenen sırayla değil en kolay sırayla yapılır: yarış, sporcu, yoklama, günlük, ödeme, aidat, fatura, envanter, alışveriş, etkinlik, diğer (mesaj, plan…), arama, sayfa, en son gönderi (gönderi ekranı açılınca orada kalınır; yarışın görseli yarış kaydedildikten sonra) (`orderPlan`, taskPlan.js). Testleri `test:asistan` › "Görev listesi sırası".

## Sıradaki işler

- "29 Ekim Cumhuriyet yarışı oluştur, yarış için görsel oluştur, bugün antrenmana Mustafa katıldı" de: yarış kaydedilip soru sormadan yoklamaya, en son gönderiye geçmeli; Instagram'da gönderi kayıtlı görünmeli.

## Asistan

- Görev listesi kullanıcının sırasıyla değil en kolay sırayla yapılır; listede sıradaki iş varken işler soru sorup durmaz, gönderi kendiliğinden kaydedilir (Seyhun'un isteği, 2026-10-09).
