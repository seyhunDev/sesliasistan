## Nerede kaldım

- Görev listesinde yapılamayan iş söylenir (Seyhun: "yapamadığı iş olursa onu manuel yapmalısın diye geri cevap vermeli"; telefonda denenmedi): listenin son işinden sonra cevabın sonuna "Yapamadığım: Yoklama: Mustafa. Bunu elle yapman gerekiyor." eklenir (`planNow`, `planFails`, AssistantSheet `reply`; başarısızlık `failed`, taskPlan.js).
- Gönderide değişiklik bütün olarak (Seyhun: "yarışın adını ve açıklamasını değiştir dedim, değiştirmiyor; yarış duyurusu yap dedim değişmiyor; güncelledim diyor ama neyi?"; telefonda denenmedi):
  - "Yarış duyurusu yap", "kulüp yarış duyurusu olacak", "kulüp duyurusu", "kulüp haberi olsun", "duyuru olsun" türü ve görseldeki etiketi değiştirir (`designFrom` `TAG_ASK`, postModel.js). Önceden kayıtlı gönderi açılırken "YARIŞ DUYURUSU" etiketi "YARIŞ"a çevriliyordu (eski kayıt düzeltmesi), istenen etiket hiç kalmıyordu; kaldırıldı, etiket en çok 24 harf.
  - Başlık artık "adını değiştir", "ismini … yap" ile de değişir; yer · tarih satırı ("tarihi 7-8 Kasım yap", "yeri Dikili olsun") yapay zekayla değişir (`info`, /api/post-caption `HEAD`, `INFO`). Değişiklik istenince yapay zeka açıklamayı gerçekten farklı yazar (istem).
  - Asistan "Gönderiyi güncelledim" yerine neyin değiştiğini söyler: "Değiştirdim: başlık, açıklama." Hiçbir şey değişmediyse "Görseldeki yazılar ya da Açıklama bölümünden elle değiştirmen gerekiyor." (`changedText`).
  - Testleri `test:asistan` › "Gönderi tasarımı sesle ve yarışın eksikleri".

## Sıradaki işler

- Bir gönderide asistana "yarış duyurusu yap", sonra "başlığı ve açıklamayı değiştir", sonra "tarihi 7-8 Kasım yap" de; görselde etiket, başlık, yer · tarih ve açıklama değişmeli, asistan neyin değiştiğini söylemeli.

## Asistan

- Görev listesinde yapılamayan iş listenin sonunda "elle yapman gerekiyor" diye söylenir; gönderide değişiklikten sonra asistan neyin değiştiğini söyler (2026-10-09).
