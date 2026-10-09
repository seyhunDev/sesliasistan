## Nerede kaldım

- Asistanda tek bilgi yeri (Seyhun: "bilgilendirme iki yerde yapılıyor, alttakini kaldıralım, yeni eklediklerin kalsın"; telefonda denenmedi): yazı kutusunun üstündeki durum çipi (TabBar `live.status`) kaldırıldı; beklerken yalnız sohbetin içindeki sıralı soluk yazılar (WaitLines) ve adımlar görünür.
- Sıralı görev zinciri (Seyhun: "şu yarışı oluştur, sonra Instagram'da bunun için gönderi hazırla, sonra aidatlara nakit yaz, sonra yoklamaya şu sporcular katıldı de; sırayla yapsın"; telefonda ve canlıda denenmedi): cümle "sonra / daha sonra / ardından / en son" sözleriyle işlere bölünür (`splitChain`, src/lib/chain.js; "10'dan sonra", "antrenmandan sonra" bölmez). En az bir iş uygulamanın kendi akışıysa (yarış, gönderi, aidat/nakit, yoklama, envanter, fatura…; `ownFlow`) işler sırayla yapılır: her iş kendi akışında, soru sorarsa cevap beklenir, iş bitip cevap okununca sıradakine geçilir; aradaki işlerde "Başka bir isteğin var mı?" sorulmaz, en sonda sorulur (`chain`, `nextInChain`, AssistantSheet). Hepsi plan/görev/mesaj gibi yapay zeka işiyse eskisi gibi tek istekte görev listesi. "Bunun için gönderi hazırla" zincirde az önce açılan yarışa bağlanır (`refersBack`, `chainRace`). Açık gönderi sayfasında sıradaki iş (ör. aidat) gönderiye yazılmaz.
- Yarış tarihsiz de açılır: "Foça Kupası adında yarış oluştur" yarışı hemen kaydeder, "Tarihleri ne, hangi sporcular katılacak?" diye sorar; cevap ("26-31 Ekim, Ali ve Ayşe") o yarışa yazılır, tarih gelince planlara da eklenir; eksik kalırsa bir kez daha sorar; "bilmiyorum / sonra / geç" bırakır (`followAsk`, raceNav.js; `raceFollow`, AssistantSheet; /api/race istemi).
- Gönderide söylenen tasarım uygulamadaki seçeneklerle eşleşir: renk (mavi/lacivert, yeşil, kırmızı, bordo, mor, turkuaz, turuncu/pembe, bej/kum, gri/siyah), boyut (kare, dikey, hikâye, reels), tasarım (modern, klasik/afiş, bant, kart şablon), tür (sonuç, kayıt/yelken okulu, kutlama). Gönderi açılırken ve gönderi ekranında ("rengi yeşil yap", "hikâye boyutunda olsun") uygulanır; yalnız tasarım istenince yazılar değişmez (`designFrom`, `askBeyondLook`, postModel.js).
- Testleri `test:asistan` › "Sıralı görev zinciri", "Gönderi tasarımı sesle ve yarışın eksikleri". Kural değişikliği yok.

## Sıradaki işler

- Dene: "Bir yarış oluştur, adı Foça Kupası. Sonra Instagram'da bunun için bir gönderi hazırla, mavi olsun. Sonra aidatlara Ali Kaya'nın ekim aidatı nakit 1500 alındı yaz. Sonra yoklamaya bugün Ali ve Ayşe katıldı." Yarış tarihini sorunca cevap ver; her iş sırayla yapılmalı. Atlanan ya da yanlış yere giden iş olursa cümleyi yeni threade ver.

## Asistan

- "Sonra" ile sıralanan işler sırayla yapılır; bir iş soru sorarsa cevap beklenir, sonra sıradakine geçilir (Seyhun'un isteği, 2026-10-09). Beklerken bilgi tek yerde: sohbetin içindeki sıralı yazılar; yazı kutusunun üstünde ikinci durum yazısı yok.
