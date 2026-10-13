## Nerede kaldım
- Sporcu ve öğrencide asistan yok (Seyhun: "sporcu sesli asistanı kullanmayacak, alt barda görmesin; fitness'ta ana hesaba mesaj alanı olmasın; ders programında söyle ya da yaz kalksın"; telefonda denenmedi): sporcu/öğrenci hesabında alt çubukta ortadaki asistan düğmesi yok, dört sekme (Ana sayfa, Takvim, Mesajlar, Görevler); kayıt ekranında da asistan kubbesi çıkmaz, "Asistana söyle" düğmesi yok (`noAi`, TabBar.jsx, AddSheet.jsx). Sporcunun kendi fitness antrenmanında "Ana hesaba mesaj yaz…" alanı ve mesaj listesi yok (`fitMine`, AddSheet; `onReply` null ise Replies çizilmez, Assigned.jsx). Ders programında (ders yokken) yalnız "Fotoğrafını çek" ve "Tek tek ekle" (schedule/page.jsx). Veli ve ana hesap eskisi gibi. Kural değişikliği yok.

## Sıradaki işler
0. Sporcu hesabıyla gir: alt çubukta asistan düğmesi olmamalı; bir fitness antrenmanını aç, altta mesaj alanı olmamalı; Ders programı'nda "Söyle ya da yaz" görünmemeli.
