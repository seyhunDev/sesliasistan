## Nerede kaldım

- Tek cümlede birden çok iş görev listesiyle (Seyhun: "Atatürk Kupası adında yarış oluştur. Bugün antrenmana Mustafa geldi. Enes aidatını nakit verdi. Atatürk Kupası için Instagram yarış görseli hazırla dediğimde de yapabilmeli; yapay zeka görev listesi çıkarsın, sırayla yapalım, yaptıkça söylensin; ara şeyler (sporcular alındı…) yazılmasın"; telefonda ve canlıda denenmedi):
  - Cümle cümleciklere bölünür; en az biri uygulamanın kendi akışıysa (yarış, yoklama, Instagram, nakit aidat, envanter, fatura…) ve cümlecikler farklı işlere aitse yapay zekaya görev listesi sorulur (`/api/tasks`, Gemini). Fiilsiz cümlecik ("Adı Foça Kupası", "Yarış görseli olacak") ayrı iş sayılmaz (`looksMulti`, `clausesOf`, src/lib/taskPlan.js; `flowOf`, AssistantSheet). "Sonra" ile söylenenler de aynı yoldan.
  - Yapay zeka her iş için tek başına anlaşılır kısa komut ve kısa ad verir. Aynı işe ait cümleler birleşir ("Enes ödemesini yaptı. Aidat ödemesini yaptı. Nakit verdi." → Enes'in aidatı nakit). "Bunun için" yerine yarışın adını yazar. Plan, görev, not ve mesaj gibi ardışık işler tek iş olarak ana yapay zekaya gider (`cleanPlan`).
  - İşler sırayla kendi akışlarında yapılır. Sohbette görev listesi görünür: biten ✓ soluk, süren parlıyor, sıradakiler silik, başarısız ✗. Her işin sonucu kısaca söylenir. Bir iş soru sorarsa (yarışın tarihi, sporcular) cevap beklenir, sonra sıradakine geçilir. "Başka bir isteğin var mı?" yalnız en sonda sorulur. Yapay zekaya ulaşılamazsa "sonra" ile bölünmüş parçalar sırayla yapılır.
  - Ara adımlar ("Sporcular yükleniyor", "Söylediklerin anlaşılıyor") artık görünmüyor. Beklerken yalnız sıralı soluk yazılar var, ilk satır sürmekte olan işin adı.
- Nakit aidatta tutar söylenmezse sporcunun aidat tutarı yazılır ("Enes'in aidatı nakit alındı"; `feeOf`). Tutar ayarlı değilse "ne kadar ödedi?" diye sorar.
- Ayarlar › Kullanım'da "Görev listesi (çoklu iş)" sayacı. Testleri `test:asistan` › "Görev listesi: birden çok iş mi", "Görev listesi: yapay zeka yanıtı". Kural değişikliği yok, yeni ortam değişkeni yok.

## Sıradaki işler

- Dene: "Atatürk Kupası adında bir yarış oluştur. Bugün antrenmana Mustafa geldi. Enes aidatını nakit verdi. Atatürk Kupası için Instagram yarış görseli hazırla." Listede dört iş görünmeli; yarış tarihini sorunca cevap ver (ya da "geç" de); sonra yoklama, aidat ve gönderi sırayla yapılmalı. Yanlış birleşen ya da atlanan iş olursa cümleyi yeni threade ver (`/api/tasks` istemi düzeltilir).

## Asistan

- Tek cümlede birden çok iş: yapay zeka görev listesi çıkarır, işler sırayla kendi akışlarında yapılır. Listede yalnız işlerin adı ve sonucu görünür, ara adımlar gösterilmez (Seyhun'un kuralı, 2026-10-09).
