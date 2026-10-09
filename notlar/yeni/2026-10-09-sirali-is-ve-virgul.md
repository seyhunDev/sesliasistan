## Nerede kaldım

- Noktalaması az sıralı cümle düzeltildi (Seyhun'un ekran görüntüsü: "29 Ekim Cumhuriyet yarışı oluştur. Yarış için görsel oluştur ve bugün antrenmana … katıldı, yoklamaya onu ekle" cümlesinin tamamı yoklamaya gidiyor, yoklama "kapsam dışı" diyordu; telefonda denenmedi): görev listesi cümleciklere yalnız nokta ve "ve sonra" ile ayırıyordu; sesle söylenen cümlede ikinci ve üçüncü iş tek cümlecik kalıyor, ikisi de "yarış" sayılıp görev listesi hiç kurulmuyordu. Artık fiille biten cümleciğin ardındaki "ve" ya da virgül de ayırır, ardından gelen de bir iş ise ("görsel oluştur ve bugün Mustafa katıldı"); "Ali ve Ayşe geldi", "yarış oluştur, Ali ve Ayşe katılacak" bölünmez (`splitAtVerbs`, taskPlan.js). "Yarış için görsel oluştur", "yarışın afişini hazırla" Instagram denmese de gönderi sayılır (`wantsPost`, postModel.js) ve görev listesinde yarıştan önce gönderiye bakılır (`flowOf`). Testleri `test:asistan` › "Sıralı iş: fiilden sonra ve/virgül".

## Sıradaki işler

- Aynı cümleyi yeniden söyle (yoklamadaki adı net söyle): yarış oluşmalı, o yarış için gönderi açılmalı, yoklama yazılmalı; sonunda yapılamayan varsa söylenmeli.
