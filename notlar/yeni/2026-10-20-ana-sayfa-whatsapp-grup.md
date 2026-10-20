## Nerede kaldım
- Ana sayfa › Sporcular › WhatsApp "WhatsApp'ı aç" iPhone'da çalışmıyordu. Sebep: Ayarlar › WhatsApp gruplarında Sporcular grubu kayıtlıysa düğme grubun davet bağlantısını (chat.whatsapp.com) açıyordu; bu PWA içinde web sayfasında kalıyor, uygulamayı açmıyor. Asistandaki WhatsApp düğmesi grup bağlantısı kullanmadığı için çalışıyordu.
- Düzeltme: telefonda her zaman WhatsApp uygulaması metin hazır açılır (`whatsapp://send?text=`), grup orada seçilir; metin ayrıca panoya kopyalanır. Grup bağlantısı yalnız bilgisayarda açılır (`waHref` lib/cancelPlan.js). Ana sayfadaki düğme artık gerçek bağlantı (<a>).
- Telefonda denenmedi.

## Sıradaki işler
- iPhone'da ana sayfa WhatsApp düğmesini dene; WhatsApp açılıp metin hazır gelmeli.
